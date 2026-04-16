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
    const { message, sender } = await req.json();

    if (!message || !sender) {
      return new Response(JSON.stringify({ error: 'message and sender are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: guests, error: dbError } = await supabase
      .from('guest_info')
      .select('push_token')
      .not('push_token', 'is', null);

    if (dbError) throw dbError;

    const tokens: string[] = [...new Set(
      (guests ?? [])
        .map((g: { push_token: string | null }) => g.push_token)
        .filter((t): t is string => typeof t === 'string' && t.startsWith('ExponentPushToken')),
    )];

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
        title: 'Neha & Naveen',
        body: `${message}\n\n— ${sender}`,
        sound: 'default',
        priority: 'high',
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
      tickets.forEach((ticket: { status: string }) => {
        if (ticket.status === 'ok') totalSent++;
        else totalFailed++;
      });
    }

    // Persist the notification so guests can view history in the app
    // Errors here are non-fatal — don't let a missing table break push sending
    try {
      await supabase.from('notifications').insert({ message, sender });
    } catch {
      // table may not exist yet — pushes were already sent above
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
