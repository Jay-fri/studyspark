import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsOk, json } from "../_shared/cors.ts";

const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const MAX_BYTES = 500_000; // 500 KB cap — enough for any article

// Best-effort title extraction from HTML
function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim().replace(/\s+/g, " ") : "";
}

// Strip HTML tags and collapse whitespace to plain text
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt        = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Missing authorization" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse URL ───────────────────────────────────────────────────────────────
  let targetUrl: string;
  try {
    const body = await req.json() as { url?: string };
    targetUrl  = body.url?.trim() ?? "";
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!targetUrl) return json({ error: "url is required" }, 400);

  // Allow only http/https
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    return json({ error: "Invalid URL" }, 400);
  }

  // Block private/internal addresses
  const hostname = parsed.hostname;
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") ||
    hostname === "0.0.0.0"
  ) {
    return json({ error: "Private URLs are not allowed" }, 400);
  }

  // ── Fetch ───────────────────────────────────────────────────────────────────
  let fetchRes: Response;
  try {
    fetchRes = await fetch(targetUrl, {
      headers: {
        "User-Agent":      "StudyLM-Bot/1.0 (educational content fetcher)",
        Accept:            "text/html,text/plain;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });
  } catch (e) {
    return json({ error: `Fetch failed: ${e instanceof Error ? e.message : "network error"}` }, 502);
  }

  if (!fetchRes.ok) {
    return json({ error: `Remote server returned ${fetchRes.status}` }, 502);
  }

  const contentType = fetchRes.headers.get("Content-Type") ?? "";

  // Read with byte cap
  const reader  = fetchRes.body!.getReader();
  const chunks: Uint8Array[] = [];
  let   total   = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
    if (total >= MAX_BYTES) { reader.cancel(); break; }
  }

  const raw = new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const combined = new Uint8Array(acc.length + c.length);
      combined.set(acc); combined.set(c, acc.length);
      return combined;
    }, new Uint8Array(0))
  );

  const isHtml = contentType.includes("html");
  const title  = isHtml ? extractTitle(raw) : "";
  const text   = isHtml ? htmlToText(raw) : raw;

  // Limit text sent back to ~80k chars (~20k tokens) — enough for AI processing
  return json({ text: text.slice(0, 80_000), title, url: targetUrl, truncated: total >= MAX_BYTES });
});
