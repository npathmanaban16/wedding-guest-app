// Backs the in-app "Ask" floating assistant.
//
// Request body:
//   {
//     weddingId: string,
//     guestName: string,
//     question: string,
//     tabContext?: string,         // 'schedule', 'packing', etc — for logging
//     contextBlock: string,        // pre-built markdown of wedding details
//                                  // (events, dress codes, packing, location
//                                  // guide). Built on-device since this data
//                                  // lives in app constants, not the DB.
//     history?: { role: 'user' | 'assistant', content: string }[]
//                                  // optional in-session conversation tail
//                                  // for follow-up questions
//   }
//
// Calls Claude Sonnet 4.6 with prompt caching on the system block + the
// wedding context (both reused across every guest's question for the same
// wedding, so cache hits are the common case). Persists question + answer
// to public.ai_questions for the in-app history view and for the couple
// to review what guests are asking.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-sonnet-4-6';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 1024;
// Bound the in-session history we forward to Anthropic so a long-running
// chat doesn't balloon prompt size. Older turns stay in the DB and are
// still visible in the history view.
const MAX_HISTORY_TURNS = 8;

// Identities whose Q&A is NEVER persisted. Preview Guest is the
// public demo login on the invite screen — anyone can sign in under
// that name, so persisting their questions would expose prior demo
// users' chats to every subsequent visitor.
const EPHEMERAL_GUEST_NAMES = new Set(['Preview Guest']);

const SYSTEM_PROMPT = `You are a warm, helpful AI assistant for a wedding guest app. You answer guests' questions about the wedding using the WEDDING CONTEXT provided in this system prompt as your source of truth, augmented with general knowledge (etiquette, travel, fashion, weather norms) when the context doesn't cover something.

Style:
- Friendly and conversational, like a knowledgeable friend. Concise — usually 2–5 sentences. Use short bullet lists when listing options.
- Speak in second person ("you'll want to…").
- Match the wedding's tone — celebratory, not stiff.

Grounding rules:
- The WEDDING CONTEXT below has been pre-filtered to ONLY the events and packing items that apply to the asking guest. Items meant for other groups (e.g. bridal-party-specific outfits, wedding-party-only events) have been removed before you see them. Do NOT speculate about, mention, or hint at items or events you don't see in the context — even if you think they might exist for other guests. If the asking guest's role gives them no rehearsal-dinner invite, the rehearsal dinner is simply not on their schedule. Do not say "the wedding party also has X" or "bridesmaids will also need Y" — that information is intentionally withheld.
- For questions about THIS wedding (schedule, dress code, venue, logistics, packing, what's provided), rely on the WEDDING CONTEXT. Quote specifics (times, venues, color palettes) when relevant. If the context doesn't cover it, say what's known and suggest contacting the couple for the rest.
- For general questions (travel tips, what a saree is, will X color work for a black-tie event), answer from general knowledge but cross-reference the WEDDING CONTEXT when it's relevant (e.g. dress codes, color palettes, weather).
- For outfit / color questions: check the relevant event's color palette and dress code in the context, then give a clear yes/no/maybe with reasoning.
- For "how do I do X in the app" questions, point users at the in-app feature first (see the "In-App Features" section of the WEDDING CONTEXT) before suggesting external workarounds. Example: photo sharing → the Photos tab and the shared album linked from there, NOT the wedding website.
- NEVER invent specifics not present in the WEDDING CONTEXT. This includes:
  • People — do not name a wedding planner, vendor, family member, or anyone the context does not explicitly identify by name. Refer to "the couple" or "the planner" generically when needed.
  • Hotel and accommodation assignments — the WEDDING CONTEXT does NOT say where guests, the wedding party, or the bridal party are staying. Each guest arranges their own accommodation. Do not state or imply that anyone is staying at a particular hotel (including the venue hotel) unless that hotel is named in the WEDDING CONTEXT as a guest accommodation. If asked, say guests choose their own hotel and refer them to the couple or wedding website for any recommended room blocks.
  • Addresses, phone numbers, prices, times, dates, capacities, restaurant names — quote only what's in the context.
  • Policies (e.g. "kids welcome", "no plus-ones", "open bar") — only state what the context explicitly says.
  If unsure, say "I don't have that detail — best to check with the couple."
- If a question is outside the scope of a wedding guest assistant (homework help, unrelated coding, medical advice, etc.), politely redirect.

Output plain text only. The chat UI renders plain text, NOT markdown — so do NOT use **bold**, *italics*, _underscores_, # headings, or [link](url) syntax. Those characters will appear as literal asterisks/brackets and look broken to the guest. Light use of bullet points (with a leading "- ") is fine. To emphasize a word, lean on sentence structure instead of typographic styling.`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  weddingId?: string;
  guestName?: string;
  question?: string;
  tabContext?: string | null;
  contextBlock?: string;
  history?: ChatTurn[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY secret not set');
      return jsonResponse({ error: 'AI assistant not configured' }, 500);
    }

    const body = (await req.json()) as RequestBody;
    const {
      weddingId,
      guestName,
      question,
      tabContext,
      contextBlock,
      history,
    } = body;

    if (!weddingId || !guestName || !question || !contextBlock) {
      return jsonResponse(
        { error: 'weddingId, guestName, question, and contextBlock are required' },
        400,
      );
    }

    // Build the messages array. Anthropic's prompt caching uses the system
    // block as a stable prefix — same wedding context across every guest's
    // question gives a cache hit on the second request onward.
    const trimmedHistory = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TURNS).filter(
          (m): m is ChatTurn =>
            !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
        )
      : [];

    const messages = [
      ...trimmedHistory,
      { role: 'user' as const, content: question },
    ];

    const anthropicReq = {
      model: ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
        },
        {
          type: 'text',
          text: `WEDDING CONTEXT:\n\n${contextBlock}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    };

    const aiRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(anthropicReq),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('Anthropic error:', aiRes.status, errText);
      return jsonResponse({ error: 'AI request failed' }, 502);
    }

    const aiPayload = await aiRes.json();
    const answer: string = (aiPayload?.content ?? [])
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n')
      .trim();

    if (!answer) {
      console.error('Anthropic returned no text content:', JSON.stringify(aiPayload));
      return jsonResponse({ error: 'Empty response from AI' }, 502);
    }

    // Best-effort persistence — don't fail the request if logging fails.
    // Preview Guest (the public demo login) is intentionally skipped so
    // demo sessions don't bleed across visitors.
    if (!EPHEMERAL_GUEST_NAMES.has(guestName)) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { error: insertError } = await supabase.from('ai_questions').insert({
          wedding_id: weddingId,
          guest_name: guestName,
          question,
          answer,
          tab_context: tabContext ?? null,
        });
        if (insertError) {
          console.error('ai_questions insert failed:', insertError);
        }
      } catch (e) {
        console.error('ai_questions logging error:', e);
      }
    }

    return jsonResponse({
      answer,
      usage: aiPayload?.usage ?? null,
    });
  } catch (err) {
    const detail =
      err instanceof Error ? err.message
      : typeof err === 'object' && err !== null ? JSON.stringify(err)
      : String(err);
    console.error('ai-assistant error:', detail);
    return jsonResponse({ error: detail }, 500);
  }
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
