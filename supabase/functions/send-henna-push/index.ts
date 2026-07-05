import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Sends a push notification to a single named guest — the henna waitlist
// pings ("you're 2 away", "you're up next") should reach one person, not
// broadcast to the whole wedding. Unlike send-push, this deliberately
// does NOT insert into public.notifications (the guest-facing feed) —
// queue pings are ephemeral, not history.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { weddingId, guestName, title, body } = await req.json();

    if (!weddingId || !guestName || !body) {
      return new Response(
        JSON.stringify({ error: 'weddingId, guestName, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // added_by on the waitlist row is a guest_info.guest_name — resolve
    // the push token from that table directly. Returns nothing when the
    // guest hasn't opened the app yet or declined notifications; we
    // report sent=0 rather than erroring so the artist's action still
    // succeeds.
    const { data: info, error: infoError } = await supabase
      .from('guest_info')
      .select('push_token')
      .eq('wedding_id', weddingId)
      .eq('guest_name', guestName)
      .maybeSingle();
    if (infoError) throw infoError;

    const token = info?.push_token;
    if (!token || typeof token !== 'string' || !token.startsWith('ExponentPushToken')) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No registered device' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Push title falls back to couple_names for consistency with
    // send-push. Callers pass a short specific title ("Henna line
    // update") — this is used verbatim when present.
    let pushTitle: string = typeof title === 'string' && title.trim() ? title : '';
    if (!pushTitle) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('couple_names')
        .eq('id', weddingId)
        .maybeSingle();
      pushTitle = wedding?.couple_names?.trim() || 'Wedding Update';
    }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify([{
        to: token,
        title: pushTitle,
        body,
        sound: 'default',
        priority: 'high',
        badge: 1,
      }]),
    });

    const result = await res.json();
    const ticket = result.data?.[0];
    if (ticket?.status !== 'ok') {
      console.error('send-henna-push ticket error:', JSON.stringify(ticket));
      return new Response(
        JSON.stringify({ success: false, sent: 0, ticket }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, sent: 1 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const detail =
      err instanceof Error ? err.message
      : typeof err === 'object' && err !== null ? JSON.stringify(err)
      : String(err);
    console.error('send-henna-push error:', detail);
    return new Response(JSON.stringify({ error: detail }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
