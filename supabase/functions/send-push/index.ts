import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { weddingId, message, sender, weddingPartyOnly } = await req.json();
    const partyOnly = weddingPartyOnly === true;

    if (!weddingId || !message || !sender) {
      return new Response(
        JSON.stringify({ error: 'weddingId, message and sender are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Push title uses the wedding's couple_names so SaaS tenants get the right
    // branding. Falls back to a neutral label if the wedding row is missing.
    const { data: wedding } = await supabase
      .from('weddings')
      .select('couple_names')
      .eq('id', weddingId)
      .maybeSingle();
    const title = wedding?.couple_names?.trim() || 'Wedding Update';

    // Push audience. Two simple queries — guests and guest_info aren't
    // joined by a declared FK in the schema, so we can't use PostgREST's
    // nested `!inner(...)` shorthand. Fetch the wedding-party guest
    // names first, then filter guest_info by `.in(names)`.
    let tokens: string[];
    if (partyOnly) {
      const { data: partyGuests, error: partyError } = await supabase
        .from('guests')
        .select('canonical_name')
        .eq('wedding_id', weddingId)
        .eq('is_wedding_party', true);
      if (partyError) throw partyError;

      const names = (partyGuests ?? []).map((g: { canonical_name: string }) => g.canonical_name);
      if (names.length === 0) {
        tokens = [];
      } else {
        const { data: infos, error: tokensError } = await supabase
          .from('guest_info')
          .select('push_token')
          .eq('wedding_id', weddingId)
          .in('guest_name', names)
          .not('push_token', 'is', null);
        if (tokensError) throw tokensError;
        tokens = [...new Set(
          (infos ?? [])
            .map((g: { push_token: string | null }) => g.push_token)
            .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken')),
        )];
      }
    } else {
      const { data: infos, error: dbError } = await supabase
        .from('guest_info')
        .select('push_token')
        .eq('wedding_id', weddingId)
        .not('push_token', 'is', null);
      if (dbError) throw dbError;
      tokens = [...new Set(
        (infos ?? [])
          .map((g: { push_token: string | null }) => g.push_token)
          .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken')),
      )];
    }

    // Persist notification history for the in-app feed regardless of whether
    // any devices are registered for push yet.
    try {
      await supabase.from('notifications').insert({
        wedding_id: weddingId,
        message,
        sender,
        wedding_party_only: partyOnly,
      });
    } catch (e) {
      console.error('notifications insert failed:', e);
    }

    if (tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No registered devices yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const CHUNK_SIZE = 100;
    let totalSent = 0;
    let totalFailed = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const notifications = chunk.map((token) => ({
        to: token,
        title,
        body: `${message}\n\n— ${sender}`,
        sound: 'default',
        priority: 'high',
        badge: 1,
      }));

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(notifications),
      });

      const result = await res.json();
      const tickets = result.data ?? [];
      tickets.forEach((ticket: { status: string; id?: string; message?: string; details?: unknown }) => {
        if (ticket.status === 'ok') {
          totalSent++;
        } else {
          totalFailed++;
          console.error('Push ticket error:', JSON.stringify(ticket));
        }
      });
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // `String(err)` on a PostgrestError returns "[object Object]", which
    // isn't useful. Pull out .message if it's an Error, otherwise
    // JSON-stringify the object so client alerts have the real reason.
    const detail =
      err instanceof Error ? err.message
      : typeof err === 'object' && err !== null ? JSON.stringify(err)
      : String(err);
    console.error('send-push error:', detail);
    return new Response(JSON.stringify({ error: detail }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
