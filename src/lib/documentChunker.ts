import type { Source, SourceChunk } from "@/types";

export interface Chunk {
  index:   number;
  text:    string;
  tokens:  number;
}

const CHUNK_SIZE    = 2000;
const CHUNK_OVERLAP = 200;

export function chunkText(text: string, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): Chunk[] {
  const words  = text.trim().split(/\s+/);
  const chunks: Chunk[] = [];
  let i = 0;

  while (i < words.length) {
    const slice = words.slice(i, i + chunkSize).join(" ");
    chunks.push({
      index:  chunks.length,
      text:   slice,
      tokens: Math.ceil(slice.length / 4),
    });
    i += chunkSize - overlap;
  }

  return chunks;
}

export function getFocusedContext(text: string, maxWords = 3000): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ") + "\n\n[…content truncated for token efficiency…]";
}

/**
 * Builds an optimised context string from the selected sources.
 * Includes [SOURCE: title] attribution markers.
 * Truncates to maxTokens (≈ maxTokens * 4 chars) if combined text is too long.
 *
 * @param sources        All source rows for the notebook
 * @param selectedIds    "all" | string[] of source IDs to include
 * @param maxTokens      Target maximum context tokens (default 6000)
 */
export function buildContext(
  sources: Source[],
  selectedIds: string[] | "all",
  maxTokens = 6000
): string {
  const active = selectedIds === "all"
    ? sources
    : sources.filter((s) => (selectedIds as string[]).includes(s.id));

  if (active.length === 0) return "";

  const maxChars = maxTokens * 4;

  // Build attributed segments
  const segments = active.map((s) => {
    const attribution = `[SOURCE: ${s.title}]`;
    const body        = (s.content ?? "").trim();
    return `${attribution}\n${body}`;
  });

  // If total fits in the budget, return as-is
  const combined = segments.join("\n\n---\n\n");
  if (combined.length <= maxChars) return combined;

  // Otherwise distribute budget proportionally across sources
  const perSource = Math.floor(maxChars / active.length);
  const trimmed   = segments.map((seg) =>
    seg.length > perSource ? seg.slice(0, perSource) + "\n[…truncated…]" : seg
  );

  return trimmed.join("\n\n---\n\n");
}

/**
 * Samples from beginning (50%), middle (30%), and end (20%) of a document
 * so large files get broad coverage instead of a front-biased hard truncation.
 */
export function sampleDocument(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const start  = Math.floor(maxChars * 0.5);
  const mid    = Math.floor(maxChars * 0.3);
  const end    = maxChars - start - mid;
  const midPos = Math.floor(text.length / 2) - Math.floor(mid / 2);
  return (
    text.slice(0, start) +
    "\n\n[…middle section…]\n\n" +
    text.slice(midPos, midPos + mid) +
    "\n\n[…end section…]\n\n" +
    text.slice(text.length - end)
  );
}

/**
 * Builds AI context from source_chunks rows fetched on-demand from Supabase.
 *
 * Strategy:
 * - For sources that have chunks: walk chunks in order until budget is exhausted.
 * - For old sources without chunks: fall back to source.content (legacy behaviour).
 *
 * This means the pipeline is fully backward-compatible — existing sources
 * with content stored directly in Postgres still work until they are re-processed.
 */
export function buildContextFromChunks(
  chunks: Pick<SourceChunk, "source_id" | "chunk_index" | "content">[],
  sources: Source[],
  selectedIds: string[] | "all",
  maxTokens = 8000,
): string {
  const activeIds =
    selectedIds === "all"
      ? sources.map((s) => s.id)
      : (selectedIds as string[]);

  const maxChars = maxTokens * 4;
  const parts: string[] = [];
  let totalChars = 0;

  for (const sourceId of activeIds) {
    if (totalChars >= maxChars) break;
    const source = sources.find((s) => s.id === sourceId);
    if (!source) continue;

    const header = `[SOURCE: ${source.title}]`;
    const sourceChunks = chunks
      .filter((c) => c.source_id === sourceId)
      .sort((a, b) => a.chunk_index - b.chunk_index);

    if (sourceChunks.length > 0) {
      // R2 pipeline path: use chunks
      let first = true;
      for (const chunk of sourceChunks) {
        if (totalChars >= maxChars) break;
        const text = first ? `${header}\n${chunk.content}` : chunk.content;
        first = false;
        const toAdd = text.slice(0, maxChars - totalChars);
        parts.push(toAdd);
        totalChars += toAdd.length;
      }
    } else if (source.content) {
      // Legacy fallback: content stored directly in the sources row
      const budget  = maxChars - totalChars;
      const sampled = sampleDocument(source.content, budget);
      parts.push(`${header}\n${sampled}`);
      totalChars += header.length + sampled.length;
    }
  }

  return parts.join("\n\n---\n\n");
}

/** Token estimate: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
