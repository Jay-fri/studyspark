import type { Source } from "@/types";

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

/** Token estimate: ~4 chars per token */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
