const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const TO_EMAIL = 'nehanaveen2026@gmail.com';
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
    // answer so the couple can review what was problematic.
    const { guestName, details, kind } = await req.json();
    const isMessage = kind === 'message';
    const isAiReport = kind === 'ai-report';

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY secret not set');
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

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
        text: `${textIntro}\n\n${details}\n\n— Neha & Naveen Wedding App`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
            <h2 style="color: #7A6A55; margin-bottom: 4px;">${heading}</h2>
            <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
            <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
            <pre style="font-family: Georgia, serif; font-size: 15px; line-height: 1.8; white-space: pre-wrap; color: #1C1810;">${details}</pre>
            <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9A8A78;">Sent from the Neha & Naveen wedding app</p>
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
