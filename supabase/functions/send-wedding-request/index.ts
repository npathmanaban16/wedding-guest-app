// Triggered by the client (via supabase.functions.invoke) right after a
// new row is inserted into `wedding_requests`. Sends the couple a
// "please confirm your email" verification link. The admin notification
// and the final couple confirmation are NOT sent here — those fire from
// verify-wedding-request once the link is clicked, so a spam submission
// with a fake or typo'd email never reaches the admin inbox.
//
// Row identification: the client just inserted the row, so we look up
// the most recent row for this email (rate-limit guarantees the window
// is single-row for the last 60s) and read its DB-generated
// verification_token.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
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
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
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
    const { coupleName, weddingDateStart, weddingDateEnd, email, guestCount, city } = payload;

    if (!coupleName || !weddingDateStart || !email) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: coupleName, weddingDateStart, email' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    // Look up the just-inserted row to read its DB-generated
    // verification token. Ordered by created_at desc so we grab the
    // freshest one for this email (per-email rate-limit trigger ensures
    // no other row was inserted in the last 60s).
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: row, error: lookupError } = await supabase
      .from('wedding_requests')
      .select('verification_token')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      console.error('wedding_requests lookup failed:', lookupError);
      return new Response(JSON.stringify({ error: 'Lookup failed' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const token = row?.verification_token;
    if (!token) {
      console.error(`No verification_token found for ${email}. Migration 045 not applied?`);
      return new Response(
        JSON.stringify({ error: 'Request not found or verification not configured' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      );
    }

    const dateStr = formatRange(weddingDateStart, weddingDateEnd);
    const verifyUrl = `${supabaseUrl}/functions/v1/verify-wedding-request?token=${token}`;

    // ── Verification email to couple ──────────────────────────────
    const subject = `Confirm your ${APP_NAME} request 💍`;
    const text =
      `Hi ${coupleName},\n\n` +
      `Thanks for reaching out about ${APP_NAME}! Please confirm your email so we know it's really you:\n\n` +
      `${verifyUrl}\n\n` +
      `Once you click the link we'll get your request in front of our team. If you didn't submit this request, you can ignore this email.\n\n` +
      `For reference, here's what we received:\n\n` +
      `Couple:   ${coupleName}\n` +
      `Date:     ${dateStr}\n` +
      (guestCount != null ? `Guests:   ${guestCount}\n` : '') +
      (city ? `City:     ${city}\n` : '') +
      `\n— The ${APP_NAME} team`;
    const html = `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; color: #1C1810;">
        <h2 style="color: #7A6A55; margin-bottom: 4px;">Confirm your email 💍</h2>
        <p style="color: #9A8A78; font-size: 13px; margin-top: 0;">${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 15px; line-height: 1.6;">Hi ${coupleName},</p>
        <p style="font-size: 15px; line-height: 1.6;">Thanks for reaching out about ${APP_NAME}! Please confirm your email so we know it's really you:</p>
        <p style="text-align: center; margin: 28px 0;">
          <a href="${verifyUrl}" style="display: inline-block; background: #7A6A55; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-family: Georgia, serif; font-size: 15px;">Confirm my email</a>
        </p>
        <p style="font-size: 13px; line-height: 1.6; color: #9A8A78;">Or paste this link into your browser:<br/><a href="${verifyUrl}" style="color:#7A6A55; word-break: break-all;">${verifyUrl}</a></p>
        <p style="font-size: 15px; line-height: 1.6;">Once you confirm, we'll get your request in front of our team. If you didn't submit this request, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #9A8A78; margin-bottom: 4px;">For reference, here's what we received:</p>
        <table style="width: 100%; font-size: 14px; line-height: 1.8; color: #1C1810;">
          <tr><td style="color:#9A8A78; padding-right:12px;">Couple</td><td><strong>${coupleName}</strong></td></tr>
          <tr><td style="color:#9A8A78; padding-right:12px;">Date</td><td>${dateStr}</td></tr>
          ${guestCount != null ? `<tr><td style="color:#9A8A78; padding-right:12px;">Guests</td><td>${guestCount}</td></tr>` : ''}
          ${city ? `<tr><td style="color:#9A8A78; padding-right:12px;">City</td><td>${city}</td></tr>` : ''}
        </table>
        <hr style="border: none; border-top: 1px solid #E4D9CC; margin: 20px 0;" />
        <p style="font-size: 13px; color: #7A6A55;">— The ${APP_NAME} team</p>
      </div>
    `;

    await sendEmail(email, subject, html, text, SUPPORT_EMAIL);

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
