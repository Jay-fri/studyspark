import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsOk, json } from "../_shared/cors.ts";;

// ── Text chunker (800 words, 100-word overlap) ────────────────────────────────

interface Chunk {
  index:   number;
  content: string;
  tokens:  number;
}

function chunkText(text: string, maxWords = 800, overlap = 100): Chunk[] {
  const words  = text.trim().split(/\s+/).filter(Boolean);
  const chunks: Chunk[] = [];
  let i = 0;

  while (i < words.length) {
    const slice   = words.slice(i, i + maxWords).join(" ");
    chunks.push({
      index:   chunks.length,
      content: slice,
      tokens:  Math.ceil(slice.length / 4),
    });
    i += maxWords - overlap;
    // Prevent infinite loop on very short text
    if (maxWords - overlap <= 0) break;
  }

  return chunks;
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // OPTIONS must always succeed before env/auth checks
  if (req.method === "OPTIONS") return corsOk();

  // Read env inside handler so missing vars don't crash the module startup
  const SUPABASE_URL        = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_ANON_KEY   = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt        = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Missing authorization" }, 401);

  // User client: validate JWT + check ownership via RLS
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: authErr } = await userClient.auth.getUser(jwt);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // Service client: bypasses RLS for chunk inserts and status updates
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Parse body ─────────────────────────────────────────────────────────────
  const { sourceId, text } = await req.json() as { sourceId: string; text: string };
  if (!sourceId || typeof text !== "string") {
    return json({ error: "sourceId and text required" }, 400);
  }

  // ── Verify ownership ───────────────────────────────────────────────────────
  const { data: source, error: srcErr } = await userClient
    .from("sources")
    .select("id, notebook_id, user_id")
    .eq("id", sourceId)
    .single();

  if (srcErr || !source) return json({ error: "Source not found" }, 404);
  if (source.user_id !== user.id) return json({ error: "Forbidden" }, 403);

  // ── Mark as processing ─────────────────────────────────────────────────────
  await adminClient
    .from("sources")
    .update({ processing_status: "processing", error_message: null, updated_at: new Date().toISOString() })
    .eq("id", sourceId);

  try {
    const trimmed = text.trim();

    if (!trimmed) {
      // Empty text — mark ready with zero chunks
      await adminClient
        .from("sources")
        .update({ processing_status: "ready", chunk_count: 0, updated_at: new Date().toISOString() })
        .eq("id", sourceId);
      return json({ ok: true, chunks: 0 });
    }

    // ── Chunk the text ──────────────────────────────────────────────────────
    const chunks = chunkText(trimmed);

    // ── Remove stale chunks (safe for re-processing) ────────────────────────
    await adminClient.from("source_chunks").delete().eq("source_id", sourceId);

    // ── Insert new chunks ────────────────────────────────────────────────────
    const rows = chunks.map((c) => ({
      source_id:   sourceId,
      notebook_id: source.notebook_id,
      user_id:     user.id,
      chunk_index: c.index,
      content:     c.content,
      token_count: c.tokens,
    }));

    // Insert in batches of 50 to avoid hitting request size limits
    for (let i = 0; i < rows.length; i += 50) {
      const { error: insertErr } = await adminClient
        .from("source_chunks")
        .insert(rows.slice(i, i + 50));
      if (insertErr) throw insertErr;
    }

    // ── Update source: ready ─────────────────────────────────────────────────
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
    await adminClient
      .from("sources")
      .update({
        processing_status: "ready",
        chunk_count:       chunks.length,
        word_count:        wordCount,
        // Clear content for file-type sources — text now lives in source_chunks
        content:           null,
        updated_at:        new Date().toISOString(),
      })
      .eq("id", sourceId);

    return json({ ok: true, chunks: chunks.length });
  } catch (err) {
    console.error("process-source error:", err);

    await adminClient
      .from("sources")
      .update({
        processing_status: "error",
        error_message:     String(err),
        updated_at:        new Date().toISOString(),
      })
      .eq("id", sourceId);

    return json({ error: "Processing failed" }, 500);
  }
});
