// Admin-triggered broadcast. Protected by checking caller is an admin.
// POST body: { subject: string, html: string, text?: string }
// Authorization header: Bearer <user JWT with role=admin>
import { corsOk, json } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_URL = "https://api.resend.com/emails";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const RESEND_API_KEY   = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL     = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Missing environment variables" }, 500);
  }

  // Verify caller is admin via their JWT
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerToken = authHeader.replace("Bearer ", "");
  const callerClient = createClient(SUPABASE_URL, callerToken, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", caller.id)
    .single();

  if (callerProfile?.role !== "admin") return json({ error: "Forbidden" }, 403);

  // Parse body
  const { subject, html, text } = await req.json();
  if (!subject || !html) return json({ error: "subject and html are required" }, 400);

  // Fetch all user emails using service role
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return json({ error: error.message }, 500);

  const emails = users.users
    .filter((u) => u.email && u.email_confirmed_at)
    .map((u) => u.email as string);

  if (emails.length === 0) return json({ ok: true, sent: 0 });

  // Resend supports up to 50 recipients per request; batch them
  const BATCH = 50;
  let sent = 0;

  for (let i = 0; i < emails.length; i += BATCH) {
    const batch = emails.slice(i, i + BATCH);
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StudyAI <hello@studylm.app>",
        to: batch,
        subject,
        html,
        ...(text ? { text } : {}),
      }),
    });
    if (res.ok) sent += batch.length;
  }

  return json({ ok: true, sent, total: emails.length });
});
