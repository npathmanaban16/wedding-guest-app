// Triggered by the client (via supabase.functions.invoke) right after a
// new row is inserted into `wedding_requests`. Sends two emails:
//   1. Admin notification — to ADMIN_EMAIL so the couple's request is seen.
//   2. Confirmation — to the email the couple entered on the form.
//
// Modeled after send-notification. Resend is already configured via the
// RESEND_API_KEY secret on the Supabase project.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL = 'neha.pathmanaban.2016@gmail.com';
const FROM_EMAIL = 'onboarding@resend.dev';
const APP_NAME = 'Wedding Companion';

interface Payload {
  coupleName: string;
  weddingDateStart: string;   // YYYY-MM-DD
  weddingDateEnd?: string | null;
  email: string;
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

const sendEmail = async (to: string, subject: string, html: string, text: string) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Resend error sending to ${to}:`, err);
    throw new Error(err);
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const payload = (await req.json()) as Payload;
    const { coupleName, weddingDateStart, weddingDateEnd, email, city, notes } = payload;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY secret not set');
      return new Response(JSON.stringify({ error: 'Email not configured' }), { status: 500 });
    }

    const dateStr = formatRange(weddingDateStart, weddingDateEnd);

    // ── Admin notification ────────────────────────────────────────
    const adminSubject = `💍 New wedding request — ${coupleName}`;
    const adminText =
      `A new couple requested access to ${APP_NAME}:\n\n` +
      `Couple:   ${coupleName}\n` +
      `Date:     ${dateStr}\n` +
      `Email:    ${email}\n` +
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
          ${city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${city}</td></tr>` : ''}
          ${notes ? `<tr><td style="color:#9A8A78; padding-right:12px; vertical-align:top;">Notes</td><td>${notes.replace(/\n/g, '<br/>')}</td></tr>` : ''}
        </table>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9A8A78;">Sent from ${APP_NAME}</p>
      </div>
    `;

    // ── Couple confirmation ───────────────────────────────────────
    const coupleSubject = `Your ${APP_NAME} request`;
    const coupleText =
      `Hi ${coupleName},\n\n` +
      `Thanks for signing up for ${APP_NAME}! We received your request for ${dateStr} and will be in touch within a few days to get your wedding app set up.\n\n` +
      `If you have any questions in the meantime, just reply to this email.\n\n` +
      `— The ${APP_NAME} team`;
    const coupleHtml = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 16px;">Thanks for reaching out!</h2>
        <p style="font-size: 15px; line-height: 1.7;">Hi ${coupleName},</p>
        <p style="font-size: 15px; line-height: 1.7;">
          We received your request to set up a ${APP_NAME} for your wedding on <strong>${dateStr}</strong>.
          We'll be in touch within a few days to get everything set up for you.
        </p>
        <p style="font-size: 15px; line-height: 1.7;">
          Any questions in the meantime? Just reply to this email.
        </p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 24px 0;" />
        <p style="font-size: 13px; color: #9A8A78;">— The ${APP_NAME} team</p>
      </div>
    `;

    // Send both. Admin first (more important); couple confirmation is
    // best-effort — if it fails we still return OK, since the row is
    // already saved and the admin has been notified.
    await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml, adminText);
    try {
      await sendEmail(email, coupleSubject, coupleHtml, coupleText);
    } catch (e) {
      console.error('Confirmation email failed (non-fatal):', e);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Function error:', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
