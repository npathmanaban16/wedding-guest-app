// Triggered by the client (via supabase.functions.invoke) right after a
// new row is inserted into `wedding_requests`. Sends an admin notification
// email so the request is seen. A couple-facing confirmation email is
// intentionally NOT sent yet — Resend's shared test sender can only
// deliver to the account owner's address, so any third-party recipient is
// silently rejected. Wire that second send back in once a sender domain
// is verified on Resend.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL = 'neha.pathmanaban.2016@gmail.com';
// Resend requires a verified sender. Until a domain is verified, use
// Resend's shared onboarding address for the From header; Reply-To is set
// per-send on the admin email to the couple's address so replies land in
// a real conversation.
const FROM_EMAIL = 'onboarding@resend.dev';
const APP_NAME = 'Tetherly';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  coupleName: string;
  weddingDateStart: string;   // YYYY-MM-DD
  weddingDateEnd?: string | null;
  email: string;
  guestCount?: number | null;
  city?: string | null;
  notes?: string | null;
}

const formatRange = (start: string, end?: string | null): string => {
  const fmt = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
    });
  return end && end !== start ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
};

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text: string,
  replyTo?: string,
) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error sending to ${to}: ${res.status} ${err}`);
    throw new Error(`Resend ${res.status}: ${err}`);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY secret not set on this project');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY secret not set on this Supabase project' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const payload = (await req.json()) as Payload;
    const { coupleName, weddingDateStart, weddingDateEnd, email, guestCount, city, notes } = payload;

    if (!coupleName || !weddingDateStart || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: coupleName, weddingDateStart, email' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const dateStr = formatRange(weddingDateStart, weddingDateEnd);

    // ── Admin notification ────────────────────────────────────────
    const adminSubject = `💍 New wedding request — ${coupleName}`;
    const adminText =
      `A new couple requested access to ${APP_NAME}:\n\n` +
      `Couple:   ${coupleName}\n` +
      `Date:     ${dateStr}\n` +
      `Email:    ${email}\n` +
      (guestCount != null ? `Guests:   ${guestCount}\n` : '') +
      (city ? `City:     ${city}\n` : '') +
      (notes ? `Notes:    ${notes}\n` : '');
    const adminHtml = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 4px;">New wedding request</h2>
        <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <table style="width: 100%; font-size: 15px; line-height: 1.8; color: #1C1810;">
          <tr><td style="color:#9A8A78; padding-right:12px;">Couple</td><td><strong>${coupleName}</strong></td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Date</td><td>${dateStr}</td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Email</td><td><a href="mailto:${email}" style="color:#7A6A55;">${email}</a></td></tr>
          ${guestCount != null ? `<tr><td style="color:#9A8A78; padding-right:12px;">Guests</td><td>${guestCount}</td></tr>` : ''}
          ${city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${city}</td></tr>` : ''}
          ${notes ? `<tr><td style="color:#9A8A78; padding-right:12px; vertical-align:top;">Notes</td><td>${notes.replace(/\n/g, '<br/>')}</td></tr>` : ''}
        </table>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9A8A78;">Sent from ${APP_NAME}</p>
      </div>
    `;

    // Admin notification only. Couple confirmation is disabled until a
    // sender domain is verified on Resend — the test sender can't deliver
    // to arbitrary third-party addresses, so promising a confirmation
    // email in the UI would be a lie. Re-enable the send once FROM_EMAIL
    // is switched from onboarding@resend.dev to a verified-domain address.
    await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml, adminText, email);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('Function error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
