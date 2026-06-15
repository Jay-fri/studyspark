// Send a push notification to all subscribed users.
// POST body: { title: string, body: string, url?: string }
// Authorization: Bearer <admin JWT>
// Supabase secrets required: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY
import { corsOk, json } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const VAPID_PUBLIC_KEY  = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    return json({ error: "Missing environment variables" }, 500);
  }

  webpush.setVapidDetails("mailto:hello@studylm.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Verify caller is authenticated and has admin role
  const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Unauthorized" }, 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller }, error: authErr } = await callerClient.auth.getUser(jwt);
  if (authErr || !caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();
  if (callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);

  const { title, body, url = "/" } = await req.json();
  if (!title || !body) return json({ error: "title and body are required" }, 400);

  // Fetch all subscriptions using service role (bypasses RLS)
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: subs, error } = await adminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");
  if (error) return json({ error: error.message }, 500);
  if (!subs || subs.length === 0) return json({ ok: true, sent: 0, total: 0 });

  const payload = JSON.stringify({ title, body, url });
  let sent = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) stale.push(sub.endpoint);
      }
    })
  );

  if (stale.length > 0) {
    await adminClient.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return json({ ok: true, sent, failed: subs.length - sent, total: subs.length, cleaned: stale.length });
});
