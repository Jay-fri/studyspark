import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Tier message templates ───────────────────────────────────────────────────

interface InactiveUser {
  user_id: string;
  full_name: string | null;
  study_tokens: number;
  current_streak: number;
  last_active_date: string | null;
}

const TIER_MESSAGES: Record<1 | 2 | 3, (u: InactiveUser) => { title: string; body: string }> = {
  1: (u) => ({
    title: 'We miss you 👋',
    body: u.current_streak > 0
      ? `Your ${u.current_streak}-day streak is waiting — come back and keep it alive`
      : `It's been a few days — your notebooks are ready whenever you are`,
  }),
  2: (u) => ({
    title: 'Your study materials are waiting',
    body: u.current_streak > 0
      ? `Don't lose your ${u.current_streak}-day streak — one quick session keeps it going`
      : `A week away from StudyLM — let's pick up where you left off`,
  }),
  3: (u) => ({
    title: `You still have ${u.study_tokens.toLocaleString()} tokens`,
    body: `They don't expire, but your exams might be getting closer. Come generate something useful.`,
  }),
};

// Tier number → days of inactivity required
const TIER_DAYS: Record<number, number> = { 1: 3, 2: 7, 3: 14 };

// ─── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${Deno.env.get('CRON_SECRET')}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const supabase = createClient(supabaseUrl, serviceKey);

  const results: Record<string, number> = { tier1: 0, tier2: 0, tier3: 0 };
  const errors:  string[] = [];

  for (const [tierStr, days] of Object.entries(TIER_DAYS)) {
    const tier = Number(tierStr) as 1 | 2 | 3;

    const { data: inactiveUsers, error: rpcErr } = await supabase
      .rpc('get_inactive_users', { p_days: days });

    if (rpcErr) {
      errors.push(`tier${tier} RPC error: ${rpcErr.message}`);
      continue;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) continue;

    for (const user of inactiveUsers as InactiveUser[]) {
      const { title, body } = TIER_MESSAGES[tier](user);

      // send-notification handles both:
      //   1. Writing the row to the notifications table (powers in-app bell)
      //   2. Sending FCM push if the user has registered device tokens
      // Users with no device tokens still get the in-app notification.
      const notifRes = await fetch(
        `${supabaseUrl}/functions/v1/send-notification`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify({
            user_id:  user.user_id,
            title,
            body,
            type:     'streak_reminder',
            metadata: { tier },
            route:    '/dashboard',
          }),
        }
      );

      if (!notifRes.ok) {
        const text = await notifRes.text();
        errors.push(`tier${tier} send-notification failed for ${user.user_id}: ${text}`);
        continue;
      }

      // Record that this tier was sent — prevents re-sending within 21 days.
      const { error: logErr } = await supabase
        .from('reengagement_log')
        .insert({ user_id: user.user_id, tier });

      if (logErr) {
        errors.push(`tier${tier} log insert failed for ${user.user_id}: ${logErr.message}`);
      }

      results[`tier${tier}`]++;
    }
  }

  console.log('[send-reengagement] done', results, errors.length ? errors : 'no errors');

  return new Response(
    JSON.stringify({ success: true, sent: results, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-reengagement] crash:', msg);
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
