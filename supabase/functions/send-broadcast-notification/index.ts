import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Broadcasts a notification to every user who has a registered FCM device token.
// Also writes a row to the notifications table for each user so it appears in
// the in-app bell dropdown even for users with no device token.

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase    = createClient(supabaseUrl, serviceKey);

    // Verify caller is an admin (passes their own JWT)
    const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      });
    }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: corsHeaders,
      });
    }

    const { title, body, route = '/dashboard', type = 'admin_message' } = await req.json();
    if (!title || !body) {
      return new Response(JSON.stringify({ error: 'title and body are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get all distinct users who have registered a device token
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('user_id, push_token');

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, reason: 'no device tokens registered' }),
        { status: 200, headers: corsHeaders }
      );
    }

    // Deduplicate by user_id — one notification row per user, multiple tokens per user handled by send-notification
    const userIds = [...new Set(tokens.map((t: { user_id: string }) => t.user_id))];

    let sent = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ user_id: userId, title, body, type, route }),
      });

      if (res.ok) {
        sent++;
      } else {
        const text = await res.text();
        errors.push(`${userId}: ${text}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent, total: userIds.length, errors }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: corsHeaders }
    );
  }
});
