import { corsOk, json } from "../_shared/cors.ts";

const RESEND_URL = "https://api.resend.com/emails";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  const { email, name } = await req.json();
  if (!email || !name) return json({ error: "email and name are required" }, 400);

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) return json({ error: "RESEND_API_KEY not set" }, 500);

  const firstName = name.split(" ")[0];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Welcome to StudyAI</title>
</head>
<body style="margin:0;padding:0;background:#0a1628;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <!-- Logo -->
    <div style="text-align:center;padding-bottom:28px;">
      <span style="font-size:32px;">🎓</span>
      <p style="margin:8px 0 0;font-size:20px;font-weight:600;color:#38E0C3;letter-spacing:-0.02em;">StudyAI</p>
    </div>

    <!-- Card -->
    <div style="background:#111d30;border:0.5px solid rgba(56,224,195,0.22);border-radius:16px;padding:32px 28px;margin-bottom:20px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;letter-spacing:-0.02em;">
        Welcome, ${firstName}! 👋
      </h1>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.65;color:rgba(255,255,255,0.65);">
        Your 1,000 free AI tokens are ready. Here's what you can do right now:
      </p>

      <!-- Feature list -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
        <tr>
          <td style="padding:10px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);">
            <span style="font-size:18px;">📁</span>
            <span style="display:inline-block;margin-left:10px;font-size:13.5px;font-weight:600;color:#ffffff;">Create a Notebook</span>
            <p style="margin:4px 0 0 30px;font-size:12.5px;color:rgba(255,255,255,0.5);line-height:1.5;">Organise your courses, topics, or projects into separate notebooks.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:0.5px solid rgba(255,255,255,0.06);">
            <span style="font-size:18px;">📄</span>
            <span style="display:inline-block;margin-left:10px;font-size:13.5px;font-weight:600;color:#ffffff;">Upload Your Materials</span>
            <p style="margin:4px 0 0 30px;font-size:12.5px;color:rgba(255,255,255,0.5);line-height:1.5;">PDFs, lecture notes, YouTube links — the AI reads everything.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <span style="font-size:18px;">🤖</span>
            <span style="display:inline-block;margin-left:10px;font-size:13.5px;font-weight:600;color:#ffffff;">Generate Study Tools</span>
            <p style="margin:4px 0 0 30px;font-size:12.5px;color:rgba(255,255,255,0.5);line-height:1.5;">Quizzes, flashcards, summaries, mind maps — one tap.</p>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <a href="https://studylm.app/dashboard"
         style="display:block;text-align:center;background:rgba(56,224,195,0.12);border:0.5px solid rgba(56,224,195,0.35);color:#38E0C3;text-decoration:none;padding:13px 24px;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:-0.01em;">
        Start studying →
      </a>
    </div>

    <!-- Token note -->
    <div style="background:rgba(56,224,195,0.05);border:0.5px solid rgba(56,224,195,0.14);border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);line-height:1.6;">
        ⚡ <strong style="color:#38E0C3;">1,000 tokens</strong> are already in your account.
        Each AI action (quiz, summary, chat reply) costs a small amount. Top up anytime for ₦2,000.
      </p>
    </div>

    <!-- Footer -->
    <p style="text-align:center;font-size:11px;color:rgba(255,255,255,0.25);margin:0;">
      StudyAI · studylm.app<br>
      You received this because you signed up for a StudyAI account.
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
      subject: `Welcome to StudyAI, ${firstName}! 🎓 — your 1,000 tokens are ready`,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return json({ error: err }, 500);
  }

  return json({ ok: true });
});
