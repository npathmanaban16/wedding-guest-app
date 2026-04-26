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

const SYSTEM_PROMPT = `You are a warm, helpful AI assistant for a wedding guest app. You answer guests' questions about the wedding using the WEDDING CONTEXT provided in this system prompt as your source of truth, augmented with general knowledge (etiquette, travel, fashion, weather norms) when the context doesn't cover something.

Style:
- Friendly and conversational, like a knowledgeable friend. Concise — usually 2–5 sentences. Use short bullet lists when listing options.
- Speak in second person ("you'll want to…").
- Match the wedding's tone — celebratory, not stiff.

Grounding rules:
- For questions about THIS wedding (schedule, dress code, venue, logistics, packing, what's provided), rely on the WEDDING CONTEXT. Quote specifics (times, venues, color palettes) when relevant. If the context doesn't cover it, say what's known and suggest contacting the couple or planner for the rest.
- For general questions (travel tips, what a saree is, will X color work for a black-tie event), answer from general knowledge but cross-reference the WEDDING CONTEXT when it's relevant (e.g. dress codes, color palettes, weather).
- For outfit / color questions: check the relevant event's color palette and dress code in the context, then give a clear yes/no/maybe with reasoning.
- Never invent specifics not in the context (don't make up addresses, prices, or times). If unsure, say so.
- If a question is outside the scope of a wedding guest assistant (homework help, unrelated coding, medical advice, etc.), politely redirect.

Output plain text. No markdown headings. Light use of bullet points (with - ) is fine.`;

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
