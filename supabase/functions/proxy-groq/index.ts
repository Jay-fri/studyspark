import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CORS_HEADERS, corsOk, json } from "../_shared/cors.ts";

const GROQ_API_URL      = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_KEY          = Deno.env.get("GROQ_API_KEY")!;
const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface GroqMessage {
  role:    "system" | "user" | "assistant";
  content: string;
}

// Strip common prompt-injection patterns from message content
function sanitize(text: string): string {
  return text
    .replace(/\bignore\s+(all\s+)?previous\s+instructions?\b/gi, "[removed]")
    .replace(/\bforget\s+(everything|all)\b/gi, "[removed]")
    .replace(/\byou\s+are\s+now\s+(a|an)\s+/gi, "[removed] ")
    .replace(/<\|.*?\|>/g, "")          // llama special tokens
    .replace(/\[INST\]|\[\/INST\]/g, "") // llama 2 instruction tags
    .trim();
}

function sanitizeMessages(messages: GroqMessage[]): GroqMessage[] {
  return messages.map((m) => ({
    ...m,
    // Only sanitize user messages; leave system prompts (we write those) intact
    content: m.role === "user" ? sanitize(m.content) : m.content,
  }));
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

  // ── Rate limit ──────────────────────────────────────────────────────────────
  const { data: allowed, error: rlErr } = await supabase.rpc(
    "check_groq_rate_limit",
    { p_user_id: user.id, p_max: 10 }
  );
  if (rlErr) {
    console.error("rate_limit rpc error:", rlErr.message);
    // Fail open to avoid blocking legitimate users on DB hiccups
  } else if (allowed === false) {
    return json({ error: "Rate limit exceeded. Try again in a minute." }, 429);
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let messages: GroqMessage[], model: string, stream: boolean,
      jsonMode: boolean, temperature: number, maxTokens: number;
  try {
    const body = await req.json() as {
      messages:    GroqMessage[];
      model:       string;
      stream?:     boolean;
      jsonMode?:   boolean;
      temperature?: number;
      maxTokens?:  number;
    };
    messages    = sanitizeMessages(body.messages ?? []);
    model       = body.model ?? "llama-3.1-8b-instant";
    stream      = body.stream ?? false;
    jsonMode    = body.jsonMode ?? false;
    temperature = body.temperature ?? 0.4;
    maxTokens   = body.maxTokens ?? 4096;
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  if (!messages.length) return json({ error: "messages is required" }, 400);

  // ── Call Groq ───────────────────────────────────────────────────────────────
  const groqBody: Record<string, unknown> = {
    model, messages, temperature, max_tokens: maxTokens, stream,
  };
  if (jsonMode && !stream) groqBody.response_format = { type: "json_object" };

  const groqRes = await fetch(GROQ_API_URL, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:  `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify(groqBody),
  });

  if (!groqRes.ok) {
    const errData = await groqRes.json().catch(() => ({}));
    const status  = groqRes.status === 429 ? 429 : 502;
    return json({ error: (errData as { error?: { message?: string } }).error?.message ?? "Groq API error" }, status);
  }

  // ── Stream: pipe Groq SSE directly to client ─────────────────────────────
  if (stream) {
    return new Response(groqRes.body, {
      headers: {
        ...CORS_HEADERS,
        "Content-Type":  "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // ── Non-stream: unwrap and return content string ─────────────────────────
  const data = await groqRes.json() as {
    choices: Array<{ message: { content: string } }>;
  };
  return json({ content: data.choices[0].message.content });
});
