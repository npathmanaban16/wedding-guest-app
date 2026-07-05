// Public GET endpoint linked from the "confirm your email" message sent
// by send-wedding-request. Validates the token, marks the row verified,
// sends the admin notification + a "you're confirmed" email to the
// couple, and returns a small HTML page.
//
// Deploy note: this function must have JWT verification disabled — it's
// clicked from an email so there's no auth header. Either deploy with
// `supabase functions deploy verify-wedding-request --no-verify-jwt` or
// toggle "Enforce JWT verification" off on the function in the
// Supabase dashboard.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const ADMIN_EMAIL = 'tetherly.app@gmail.com';
const SUPPORT_EMAIL = 'tetherly.app@gmail.com';
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'onboarding@resend.dev';
const FROM_NAME = 'Tetherly App';
const APP_NAME = 'Tetherly';
// A confirmation link is only good for this long after the request was
// created. Long enough that a busy couple can come back to it, short
// enough that a stale link isn't accepted forever.
const TOKEN_LIFETIME_HOURS = 24;

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

// Minimal landing page for the browser after a verification attempt.
// Kept inline (no external CSS/JS) so it renders even when the couple
// clicks the link on a device with no network for third-party assets.
const htmlPage = (heading: string, message: string, tone: 'success' | 'info' | 'error' = 'success') => {
  const color = tone === 'success' ? '#7A6A55' : tone === 'error' ? '#9C4A4A' : '#5A5A5A';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${APP_NAME}</title>
  <style>
    body { font-family: Georgia, serif; background: #FBF8F3; color: #1C1810; margin: 0; padding: 48px 24px; }
    .card { max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #E4D9CC; border-radius: 8px; padding: 40px 32px; text-align: center; }
    h1 { color: ${color}; font-size: 24px; margin: 0 0 12px; }
    p { font-size: 16px; line-height: 1.6; color: #1C1810; margin: 12px 0; }
    .brand { font-size: 12px; color: #9A8A78; letter-spacing: 2px; text-transform: uppercase; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${heading}</h1>
    <p>${message}</p>
    <div class="brand">${APP_NAME}</div>
  </div>
</body>
</html>`;
};

const htmlResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    if (!token) {
      return htmlResponse(
        htmlPage('Missing token', 'This link is missing its verification token. Please use the link from your confirmation email.', 'error'),
        400,
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: row, error: lookupError } = await supabase
      .from('wedding_requests')
      .select('id, couple_name, email, wedding_date_start, wedding_date_end, guest_count, city, notes, created_at, verified_at')
      .eq('verification_token', token)
      .maybeSingle();
    if (lookupError) {
      console.error('verify lookup failed:', lookupError);
      return htmlResponse(
        htmlPage("We couldn't check that link", 'Something went wrong on our end. Please try again in a few minutes.', 'error'),
        500,
      );
    }
    if (!row) {
      return htmlResponse(
        htmlPage('Link not recognized', "We couldn't find a matching request. The link may be from an older submission, or it may have been entered incorrectly.", 'error'),
        404,
      );
    }

    // Already verified: idempotent — just show a friendly page. Do NOT
    // re-fire the admin notification so a stale click can't spam the
    // inbox.
    if (row.verified_at) {
      return htmlResponse(
        htmlPage(
          "You're already confirmed",
          `Thanks, ${row.couple_name} — we've already got your request. We'll follow up from ${SUPPORT_EMAIL} within a few days.`,
          'info',
        ),
      );
    }

    // Expired token: created_at older than TOKEN_LIFETIME_HOURS.
    const ageMs = Date.now() - new Date(row.created_at).getTime();
    if (ageMs > TOKEN_LIFETIME_HOURS * 60 * 60 * 1000) {
      return htmlResponse(
        htmlPage(
          'This link has expired',
          `Confirmation links expire after ${TOKEN_LIFETIME_HOURS} hours. Please submit a new request and we'll send you a fresh link.`,
          'error',
        ),
        410,
      );
    }

    // Mark verified BEFORE sending any email so a duplicate click (e.g.
    // Gmail preview + user click) doesn't fire the admin notification
    // twice. If the update fails we bail before sending.
    const { error: updateError } = await supabase
      .from('wedding_requests')
      .update({ verified_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('verified_at', null);
    if (updateError) {
      console.error('verify update failed:', updateError);
      return htmlResponse(
        htmlPage("We couldn't confirm your email", 'Something went wrong on our end. Please try the link again in a few minutes.', 'error'),
        500,
      );
    }

    // ── Admin notification ────────────────────────────────────────
    const dateStr = formatRange(row.wedding_date_start, row.wedding_date_end);
    const adminSubject = `💍 New wedding request — ${row.couple_name}`;
    const adminText =
      `A new couple confirmed their ${APP_NAME} request:\n\n` +
      `Couple:   ${row.couple_name}\n` +
      `Date:     ${dateStr}\n` +
      `Email:    ${row.email}\n` +
      (row.guest_count != null ? `Guests:   ${row.guest_count}\n` : '') +
      (row.city ? `City:     ${row.city}\n` : '') +
      (row.notes ? `Notes:    ${row.notes}\n` : '');
    const adminHtml = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 4px;">New wedding request</h2>
        <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">Email verified · ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <table style="width: 100%; font-size: 15px; line-height: 1.8; color: #1C1810;">
          <tr><td style="color:#9A8A78; padding-right:12px;">Couple</td><td><strong>${row.couple_name}</strong></td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Date</td><td>${dateStr}</td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Email</td><td><a href="mailto:${row.email}" style="color:#7A6A55;">${row.email}</a></td></tr>
          ${row.guest_count != null ? `<tr><td style="color:#9A8A78; padding-right:12px;">Guests</td><td>${row.guest_count}</td></tr>` : ''}
          ${row.city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${row.city}</td></tr>` : ''}
          ${row.notes ? `<tr><td style="color:#9A8A78; padding-right:12px; vertical-align:top;">Notes</td><td>${row.notes.replace(/\n/g, '<br/>')}</td></tr>` : ''}
        </table>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 11px; color: #9A8A78;">Sent from ${APP_NAME}</p>
      </div>
    `;
    try {
      await sendEmail(ADMIN_EMAIL, adminSubject, adminHtml, adminText, row.email);
    } catch (e) {
      console.error('Admin notification failed after verification:', e);
    }

    // ── Couple confirmation ──────────────────────────────────────
    const coupleSubject = `We got your ${APP_NAME} request 💍`;
    const coupleText =
      `Hi ${row.couple_name},\n\n` +
      `Thanks for confirming — we've got your ${APP_NAME} request and we're excited to take a look.\n\n` +
      `Here's what we have on file:\n\n` +
      `Couple:   ${row.couple_name}\n` +
      `Date:     ${dateStr}\n` +
      (row.guest_count != null ? `Guests:   ${row.guest_count}\n` : '') +
      (row.city ? `City:     ${row.city}\n` : '') +
      `\n` +
      `We review each request personally and will follow up from ${SUPPORT_EMAIL} within a few days. If anything above looks off, just reply to this email and it'll reach us directly.\n\n` +
      `— The ${APP_NAME} team`;
    const coupleHtml = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 4px;">We got your request 💍</h2>
        <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 15px; line-height: 1.6;">Hi ${row.couple_name},</p>
        <p style="font-size: 15px; line-height: 1.6;">Thanks for confirming — we've got your ${APP_NAME} request and we're excited to take a look.</p>
        <p style="font-size: 15px; line-height: 1.6; margin-bottom: 6px;">Here's what we have on file:</p>
        <table style="width: 100%; font-size: 15px; line-height: 1.8; color: #1C1810;">
          <tr><td style="color:#9A8A78; padding-right:12px;">Couple</td><td><strong>${row.couple_name}</strong></td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Date</td><td>${dateStr}</td></tr>
          ${row.guest_count != null ? `<tr><td style="color:#9A8A78; padding-right:12px;">Guests</td><td>${row.guest_count}</td></tr>` : ''}
          ${row.city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${row.city}</td></tr>` : ''}
        </table>
        <p style="font-size: 15px; line-height: 1.6;">We review each request personally and will follow up from <a href="mailto:${SUPPORT_EMAIL}" style="color:#7A6A55;">${SUPPORT_EMAIL}</a> within a few days. If anything above looks off, just reply to this email and it'll reach us directly.</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #7A6A55;">— The ${APP_NAME} team</p>
      </div>
    `;
    try {
      await sendEmail(row.email, coupleSubject, coupleHtml, coupleText, SUPPORT_EMAIL, SUPPORT_EMAIL);
    } catch (e) {
      console.error('Couple confirmation email failed after verification:', e);
    }

    return htmlResponse(
      htmlPage(
        'Email confirmed 💍',
        `Thanks, ${row.couple_name}! We've got your ${APP_NAME} request and will follow up from ${SUPPORT_EMAIL} within a few days.`,
        'success',
      ),
    );
  } catch (e) {
    console.error('verify-wedding-request error:', e);
    return htmlResponse(
      htmlPage('Something went wrong', "We couldn't process this link. Please try again in a few minutes.", 'error'),
      500,
    );
  }
});
