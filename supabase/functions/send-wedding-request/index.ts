// Fired by the client (via supabase.functions.invoke) after a row has
// been inserted into either `wedding_requests` (in-app couple signup,
// or the landing form's rich path) or `waitlist_signups` (landing
// form's simple email + role path). Always sends an admin
// notification; sends a couple confirmation only when the payload
// includes the wedding fields (couple name + wedding date).

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL = 'tetherly.app@gmail.com';
const SUPPORT_EMAIL = 'tetherly.app@gmail.com';
// FROM address for outbound Resend mail. Set RESEND_FROM_EMAIL to an
// address on a domain verified at resend.com/domains to deliver to
// arbitrary recipients; without it the function falls back to Resend's
// shared onboarding sender, which only reaches the account owner.
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
// Display name shown as the sender in the recipient's inbox. Resend
// accepts an RFC 5322 `Name <address>` in the `from` field.
const FROM_NAME = 'Tetherly App';
const APP_NAME = 'Tetherly';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Payload {
  email: string;
  // Landing form's role picker. Defaults to 'couple' for backward
  // compatibility with older app builds that don't send it.
  role?: string;
  coupleName?: string | null;
  weddingDateStart?: string | null;  // YYYY-MM-DD
  weddingDateEnd?: string | null;
  guestCount?: number | null;
  city?: string | null;
  notes?: string | null;
  // Where the request came from — the in-app couple-signup screen or the
  // marketing site's waitlist form. Old app builds don't send this, so
  // undefined is treated as 'app'.
  source?: 'app' | 'web';
}

const ROLE_LABELS: Record<string, string> = {
  couple: 'Couple',
  planner: 'Planner',
  vendor: 'Vendor',
  curious: 'Just curious',
};

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
  cc?: string,
) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(cc ? { cc: [cc] } : {}),
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
    const { email, role, coupleName, weddingDateStart, weddingDateEnd, guestCount, city, notes, source } = payload;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: email' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Old app builds don't send `source`. Treat missing as 'app' so those
    // requests keep displaying as before instead of showing a mystery
    // channel in the admin email.
    const requestSource: 'app' | 'web' = source === 'web' ? 'web' : 'app';
    const sourceLabel = requestSource === 'web' ? `${APP_NAME} website` : `${APP_NAME} app`;
    const roleKey = (role ?? 'couple').toLowerCase();
    const roleLabel = ROLE_LABELS[roleKey] ?? role ?? 'Couple';

    // Two shapes: a "wedding request" carries couple_name + wedding date,
    // gets the rich admin email plus a couple confirmation reply. A
    // simple "waitlist signup" (email + role only, or a Planner / Vendor
    // / Just curious submission) gets an admin notification only.
    const isWeddingRequest = !!(coupleName && weddingDateStart);
    const dateStr = isWeddingRequest && weddingDateStart
      ? formatRange(weddingDateStart, weddingDateEnd)
      : null;

    // ── Admin notification ────────────────────────────────────────
    const heading = isWeddingRequest ? 'New wedding request' : 'New waitlist signup';
    const subjectPrefix = isWeddingRequest ? '💍 New wedding request' : '📝 New waitlist signup';
    const identity = coupleName || roleLabel;
    const adminSubject = `${subjectPrefix} — ${identity} (${requestSource})`;

    const rows: Array<[string, string]> = [];
    rows.push(['Source', sourceLabel]);
    rows.push(['Role', roleLabel]);
    if (coupleName) rows.push(['Couple', coupleName]);
    if (dateStr) rows.push(['Date', dateStr]);
    rows.push(['Email', email]);
    if (guestCount != null) rows.push(['Guests', String(guestCount)]);
    if (city) rows.push(['City', city]);
    if (notes) rows.push(['Notes', notes]);

    const adminText =
      `A new ${isWeddingRequest ? 'couple requested access to' : 'visitor joined the waitlist for'} ${APP_NAME}:\n\n` +
      rows.map(([k, v]) => `${k.padEnd(9, ' ')} ${v}`).join('\n') + '\n';

    const adminHtml = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 4px;">${heading}</h2>
        <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <table style="width: 100%; font-size: 15px; line-height: 1.8; color: #1C1810;">
          ${rows.map(([k, v]) => {
            const rendered = k === 'Email'
              ? `<a href="mailto:${v}" style="color:#7A6A55;">${v}</a>`
              : k === 'Couple'
                ? `<strong>${v}</strong>`
                : k === 'Notes'
                  ? v.replace(/\n/g, '<br/>')
                  : v;
            const vAlign = k === 'Notes' ? ' vertical-align:top;' : '';
            return `<tr><td style="color:#9A8A78; padding-right:12px;${vAlign}">${k}</td><td>${rendered}</td></tr>`;
          }).join('')}
        </table>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9A8A78;">Sent from ${sourceLabel}</p>
      </div>
    `;

    await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml, adminText, email);

    // ── Couple confirmation ──────────────────────────────────────
    // Only for rich wedding-request payloads. Simple waitlist signups
    // (email + role) don't get a confirmation email — the site's own
    // "Thank you" state is the acknowledgement.
    //
    // Reply-To points at SUPPORT_EMAIL so a couple hitting Reply lands
    // in a real inbox instead of the send-only FROM_EMAIL address. This
    // send is best-effort: a failure here shouldn't fail the request,
    // since the admin notification (which is what actually triggers
    // follow-up) has already gone out.
    if (isWeddingRequest && coupleName && dateStr) {
      const coupleSubject = `We got your ${APP_NAME} request 💍`;
      const coupleText =
        `Hi ${coupleName},\n\n` +
        `Thanks for reaching out — we got your ${APP_NAME} request and we're excited to take a look.\n\n` +
        `Here's what we have on file:\n\n` +
        `Couple:   ${coupleName}\n` +
        `Date:     ${dateStr}\n` +
        (guestCount != null ? `Guests:   ${guestCount}\n` : '') +
        (city ? `City:     ${city}\n` : '') +
        `\n` +
        `We review each request personally and will follow up from ${SUPPORT_EMAIL} within a few days. If anything above looks off, just reply to this email and it'll reach us directly.\n\n` +
        `— The ${APP_NAME} team`;
      const coupleHtml = `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
          <h2 style="color: #7A6A55; margin-bottom: 4px;">We got your request 💍</h2>
          <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
          <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
          <p style="font-size: 15px; line-height: 1.6;">Hi ${coupleName},</p>
          <p style="font-size: 15px; line-height: 1.6;">Thanks for reaching out — we got your ${APP_NAME} request and we're excited to take a look.</p>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 6px;">Here's what we have on file:</p>
          <table style="width: 100%; font-size: 15px; line-height: 1.8; color: #1C1810;">
            <tr><td style="color:#9A8A78; padding-right:12px;">Couple</td><td><strong>${coupleName}</strong></td></tr>
            <tr><td style="color:#9A8A78; padding-right:12px;">Date</td><td>${dateStr}</td></tr>
            ${guestCount != null ? `<tr><td style="color:#9A8A78; padding-right:12px;">Guests</td><td>${guestCount}</td></tr>` : ''}
            ${city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${city}</td></tr>` : ''}
          </table>
          <p style="font-size: 15px; line-height: 1.6;">We review each request personally and will follow up from <a href="mailto:${SUPPORT_EMAIL}" style="color:#7A6A55;">${SUPPORT_EMAIL}</a> within a few days. If anything above looks off, just reply to this email and it'll reach us directly.</p>
          <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
          <p style="font-size: 13px; color: #7A6A55;">— The ${APP_NAME} team</p>
        </div>
      `;
      try {
        await sendEmail(email, coupleSubject, coupleHtml, coupleText, SUPPORT_EMAIL, SUPPORT_EMAIL);
      } catch (e) {
        console.error('Couple confirmation email failed (admin notification still sent):', e);
      }
    }

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
