import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, corsOk, json } from "../_shared/cors.ts";

// ── AWS Signature V4 helpers ─────────────────────────────────────────────────

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac256(key: BufferSource, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function deriveSigningKey(
  secret: string, date: string, region: string, service: string
): Promise<ArrayBuffer> {
  let key: BufferSource = new TextEncoder().encode("AWS4" + secret);
  for (const piece of [date, region, service, "aws4_request"]) {
    key = await hmac256(key, piece);
  }
  return key as ArrayBuffer;
}

function uriEncode(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) =>
    `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

async function presignR2Put(
  accountId: string,
  bucket: string,
  accessKeyId: string,
  secretKey: string,
  key: string,
  expiresIn = 900
): Promise<string> {
  const now      = new Date();
  const date     = now.toISOString().slice(0, 10).replace(/-/g, "");
  const datetime = date + "T" + now.toISOString().slice(11, 19).replace(/:/g, "") + "Z";
  const region   = "auto";
  const service  = "s3";
  const host     = `${accountId}.r2.cloudflarestorage.com`;
  const scope    = `${date}/${region}/${service}/aws4_request`;
  const path     = `/${bucket}/${key}`;

  const params: Record<string, string> = {
    "X-Amz-Algorithm":     "AWS4-HMAC-SHA256",
    "X-Amz-Credential":    `${accessKeyId}/${scope}`,
    "X-Amz-Date":          datetime,
    "X-Amz-Expires":       String(expiresIn),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`)
    .join("&");

  const canonicalRequest = [
    "PUT",
    path,
    canonicalQuery,
    `host:${host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    scope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const sigKey    = await deriveSigningKey(secretKey, date, region, service);
  const sigBuf    = await hmac256(sigKey, stringToSign);
  const signature = [...new Uint8Array(sigBuf)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return `https://${host}${path}?${canonicalQuery}&X-Amz-Signature=${uriEncode(signature)}`;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // OPTIONS must always succeed — CORS preflight happens before auth
  if (req.method === "OPTIONS") return corsOk();

  // Read env vars inside handler so a missing var doesn't crash the module
  // and break the OPTIONS preflight above
  const SUPABASE_URL      = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const R2_ACCOUNT_ID     = Deno.env.get("R2_ACCOUNT_ID") ?? "";
  const R2_BUCKET         = Deno.env.get("R2_BUCKET_NAME") ?? "";
  const R2_ACCESS_KEY_ID  = Deno.env.get("R2_ACCESS_KEY_ID") ?? "";
  const R2_SECRET_KEY     = Deno.env.get("R2_SECRET_ACCESS_KEY") ?? "";
  const R2_PUBLIC_URL     = Deno.env.get("R2_PUBLIC_URL") ?? "";

  if (!R2_ACCOUNT_ID || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_KEY) {
    return json({ error: "R2 not configured — set R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in Edge Function secrets" }, 500);
  }

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt        = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Missing authorization" }, 401);

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { filename } = await req.json() as { filename?: string };
  if (!filename) return json({ error: "filename required" }, 400);

  const ext     = filename.split(".").pop()?.toLowerCase() ?? "bin";
  const fileKey = `${user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const uploadUrl = await presignR2Put(R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_KEY, fileKey);
    const fileUrl   = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL.replace(/\/$/, "")}/${fileKey}`
      : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${fileKey}`;

    return json({ uploadUrl, fileKey, fileUrl });
  } catch (err) {
    console.error("presign error:", err);
    return json({ error: "Failed to generate upload URL" }, 500);
  }
});
