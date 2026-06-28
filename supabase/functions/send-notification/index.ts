import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
// Per-wedding recipient is read from weddings.contact_email at request
// time. Note: Resend's free tier only delivers to the address that
// registered the account until a sender domain is verified at
// resend.com/domains — so even after this routes per-wedding, emails to
// any address other than the signup address will be silently dropped
// until that's set up.
const FROM_EMAIL = 'onboarding@resend.dev';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // `kind` defaults to 'details' for backwards compat with the auto-save
    // travel-update path. 'message' is the explicit-Send flow on the
    // Notes field. 'ai-report' is the in-app "Report response" button on
    // assistant messages — the body holds both the question and the AI's
    // answer so the couple can review what was problematic. 'reaction'
    // and 'reply' fire when a guest reacts or replies to an admin
    // notification in the message feed; the body holds the original
    // message snippet plus the reactor/replier and their content so the
    // couple can see engagement at a glance.
    const { weddingId, guestName, details, kind } = await req.json();
    const isMessage = kind === 'message';
    const isAiReport = kind === 'ai-report';
    const isReaction = kind === 'reaction';
    const isReply = kind === 'reply';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY secret not set');
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

    if (!weddingId) {
      return new Response(JSON.stringify({ error: 'weddingId is required' }), { status: 400 });
    }

    // Look up the recipient for this tenant. Uses the service role key so
    // the function can read weddings.contact_email regardless of RLS.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('contact_email, couple_names')
      .eq('id', weddingId)
      .maybeSingle();
    if (weddingError) {
      console.error('weddings lookup failed:', weddingError);
      return new Response(JSON.stringify({ error: 'Wedding lookup failed' }), { status: 500 });
    }
    const TO_EMAIL = wedding?.contact_email?.trim();
    if (!TO_EMAIL) {
      console.error(`weddings.contact_email is missing for ${weddingId}`);
      return new Response(
        JSON.stringify({ error: 'No contact_email configured for this wedding' }),
        { status: 400 },
      );
    }
    const coupleNames = wedding?.couple_names?.trim() || 'Wedding';

    let subject: string;
    let heading: string;
    let textIntro: string;
    if (isAiReport) {
      subject = `🚩 ${guestName} flagged an AI response`;
      heading = 'AI response report';
      textIntro = `${guestName} flagged an AI assistant response in the wedding app:`;
    } else if (isMessage) {
      subject = `✉️ ${guestName} sent you a message`;
      heading = 'New message from a guest';
      textIntro = `${guestName} sent you a message from the wedding app:`;
    } else if (isReaction) {
      subject = `💬 ${guestName} reacted to your message`;
      heading = 'New reaction';
      textIntro = `${guestName} reacted to a message you sent in the wedding app:`;
    } else if (isReply) {
      subject = `💬 ${guestName} replied to your message`;
      heading = 'New reply';
      textIntro = `${guestName} replied to a message you sent in the wedding app:`;
    } else {
      subject = `✈️ ${guestName} updated their travel details`;
      heading = 'Travel details update';
      textIntro = `${guestName} just saved their details in the wedding app:`;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [TO_EMAIL],
        subject,
        text: `${textIntro}\n\n${details}\n\n— ${coupleNames} Wedding App`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
            <h2 style="color: #7A6A55; margin-bottom: 4px;">${heading}</h2>
            <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
            <pre style="font-family: Georgia, serif; font-size: 15px; line-height: 1.8; white-space: pre-wrap; color: #1C1810;">${details}</pre>
            <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9A8A78;">Sent from the ${coupleNames} wedding app</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Function error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
