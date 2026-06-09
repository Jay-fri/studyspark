// Scheduled daily via Supabase cron: "0 10 * * *" (10:00 UTC)
// Sends a reminder to users who haven't signed in for 5+ days.
import { corsOk, json } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_URL = "https://api.resend.com/emails";
const INACTIVE_DAYS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const RESEND_API_KEY    = Deno.env.get("RESEND_API_KEY");
  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: "Missing environment variables" }, 500);
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all confirmed users
  const { data: users, error } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (error) return json({ error: error.message }, 500);

  const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);
  const inactive = users.users.filter((u) => {
    if (!u.last_sign_in_at) return false;
    return new Date(u.last_sign_in_at) < cutoff;
  });

  if (inactive.length === 0) return json({ ok: true, sent: 0 });

  // Fetch display names from profiles
  const ids = inactive.map((u) => u.id);
  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids);

  const profileMap = new Map((profiles ?? []).map((p: { id: string; full_name: string; email: string }) => [p.id, p]));

  let sent = 0;
  for (const user of inactive) {
    const profile = profileMap.get(user.id);
    const email = profile?.email ?? user.email;
    const name  = profile?.full_name ?? "there";
    const firstName = name.split(" ")[0];

    if (!email) continue;

    const daysSince = Math.floor(
      (Date.now() - new Date(user.last_sign_in_at!).getTime()) / (1000 * 60 * 60 * 24)
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your notebooks are waiting</title>
</head>
<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <div style="text-align:center;padding-bottom:24px;">
      <span style="font-size:32px;">📚</span>
      <p style="margin:8px 0 0;font-size:18px;font-weight:600;color:#38E0C3;letter-spacing:-0.02em;">StudyAI</p>
    </div>

    <div style="background:#111d30;border:0.5px solid rgba(56,224,195,0.22);border-radius:16px;padding:32px 28px;margin-bottom:20px;">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
        Hey ${firstName}, your notebooks miss you 👋
      </h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.6);">
        It's been <strong style="color:#ffffff;">${daysSince} day${daysSince !== 1 ? "s" : ""}</strong> since you last studied.
        Even 10 minutes with StudyAI keeps your progress on track.
      </p>

      <div style="background:rgba(56,224,195,0.06);border:0.5px solid rgba(56,224,195,0.16);border-radius:10px;padding:14px 16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.65);line-height:1.6;">
          💡 <strong style="color:#38E0C3;">Quick win:</strong> Open a notebook, upload one lecture slide,
          and ask the AI to summarise it. Takes under 2 minutes.
        </p>
      </div>

      <a href="https://studylm.app/notebooks"
         style="display:block;text-align:center;background:rgba(56,224,195,0.12);border:0.5px solid rgba(56,224,195,0.35);color:#38E0C3;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:14px;font-weight:600;">
        Open my notebooks →
      </a>
    </div>

    <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.25);margin:0;">
      StudyAI · studylm.app<br>
      <a href="https://studylm.app/settings" style="color:rgba(255,255,255,0.25);">Unsubscribe from reminders</a>
    </p>
  </div>
</body>
</html>`;

    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StudyAI <hello@studylm.app>",
        to: [email],
        subject: `${firstName}, your study streak is waiting 📚`,
        html,
      }),
    });

    if (res.ok) sent++;
  }

  return json({ ok: true, sent, total: inactive.length });
});
