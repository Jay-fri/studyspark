import { supabase } from "@/services/supabase";
import { sampleDocument } from "@/lib/documentChunker";
import type {
  AIOutputType,
  AIOutputContent,
  QuizQuestion,
  Flashcard,
  KeyConcept,
  StudyGuideSection,
  MindMapNode,
} from "@/types";

export const GROQ_MODELS = {
  fast:     "llama-3.1-8b-instant",
  powerful: "llama-3.3-70b-versatile",
} as const;

// Dev: call Groq directly with the local API key.
// Prod: all calls go through the proxy-groq Edge Function (key stays server-side).
const DEV_KEY  = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-groq`;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function getEdgeHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "apikey":       import.meta.env.VITE_SUPABASE_ANON_KEY,
    Authorization:  `Bearer ${session?.access_token ?? ""}`,
  };
}

/** Retry an async fn up to maxAttempts times, halving context on each failure. */
async function withRetry<T>(
  fn: (contextSlice: (text: string) => string) => Promise<T>,
  maxAttempts = 3
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const fraction = 1 - attempt * 0.25; // 100% → 75% → 50%
    try {
      return await fn((text) => sampleDocument(text, Math.floor(8000 * fraction)));
    } catch (err) {
      lastErr = err;
      const msg = (err as Error).message ?? "";
      // Only retry on context-size or generic AI errors; propagate abort/rate-limit
      if (msg === "__RATE_LIMITED__" || msg.includes("AbortError")) throw err;
      if (attempt < maxAttempts - 1) await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastErr;
}

/** Strip markdown code fences before JSON.parse */
function safeParseJSON<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

async function groqComplete(
  messages:    GroqMessage[],
  model:       string = GROQ_MODELS.powerful,
  jsonMode  = false,
  signal?:     AbortSignal,
  temperature = 0.4,
  maxTokens   = 4096
): Promise<string> {
  // ── Dev mode: direct Groq call ───────────────────────────────────────────
  if (DEV_KEY) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEV_KEY}` },
      body: JSON.stringify({
        model, messages, temperature, max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      }),
    });
    if (res.status === 429) throw new Error("__RATE_LIMITED__");
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: { message?: string } }).error?.message ?? "Groq API error");
    }
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }

  // ── Prod mode: Edge Function proxy ───────────────────────────────────────
  const res = await fetch(EDGE_URL, {
    method: "POST",
    signal,
    headers: await getEdgeHeaders(),
    body: JSON.stringify({ messages, model, stream: false, jsonMode, temperature, maxTokens }),
  });

  if (res.status === 429) throw new Error("__RATE_LIMITED__");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "AI request failed");
  }

  const { content } = await res.json() as { content: string };
  return content;
}

export async function* groqStream(
  messages: GroqMessage[],
  model:    string = GROQ_MODELS.powerful,
  signal?:  AbortSignal
): AsyncGenerator<string> {
  // ── Dev mode: direct Groq stream ─────────────────────────────────────────
  if (DEV_KEY) {
    const res = await fetch(GROQ_API_URL, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEV_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.5, max_tokens: 2048, stream: true }),
    });
    if (res.status === 429) throw new Error("__RATE_LIMITED__");
    if (!res.ok || !res.body) throw new Error("Groq stream error");
    yield* readSSEStream(res.body);
    return;
  }

  // ── Prod mode: Edge Function proxy stream ─────────────────────────────────
  const res = await fetch(EDGE_URL, {
    method: "POST",
    signal,
    headers: await getEdgeHeaders(),
    body: JSON.stringify({ messages, model, stream: true, temperature: 0.5, maxTokens: 2048 }),
  });

  if (res.status === 429) throw new Error("__RATE_LIMITED__");
  if (!res.ok || !res.body) throw new Error("Stream request failed");

  yield* readSSEStream(res.body);
}

async function* readSSEStream(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader  = body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n")) {
      const trimmed = line.replace(/^data: /, "").trim();
      if (!trimmed || trimmed === "[DONE]") continue;
      try {
        const parsed  = JSON.parse(trimmed) as { choices: Array<{ delta: { content?: string } }> };
        const content = parsed.choices[0]?.delta?.content;
        if (content) yield content;
      } catch { /* skip malformed SSE lines */ }
    }
  }
}

// ─── Individual generators ─────────────────────────────────────────────────

export async function generateSummary(sourceText: string, signal?: AbortSignal): Promise<string> {
  return groqComplete(
    [
      { role: "system", content: "You are an expert academic summariser. Create a clear, well-structured summary in markdown. Use: ## Overview (2 paragraphs), ## Key Points (bullet list), ## Important Terms (markdown table: Term | Definition), ## Conclusion. Be thorough but concise." },
      { role: "user",   content: `Summarise the following study material:\n\n${sampleDocument(sourceText, 12000)}` },
    ],
    GROQ_MODELS.powerful, false, signal
  );
}

const QUIZ_DIFFICULTY_PROMPT: Record<string, string> = {
  easy:   "Generate straightforward recall and definition questions. Focus on basic facts, key terms, and direct information from the text.",
  medium: "Generate questions requiring comprehension and application. Students should need to understand concepts, not just recall them.",
  hard:   "Generate challenging analytical and critical thinking questions. Require deep understanding, inference, and synthesis of ideas.",
  mixed:  "Generate a balanced mix: roughly 30% easy recall, 40% medium comprehension, and 30% hard analytical questions. Include a `\"difficulty\":\"easy\"|\"medium\"|\"hard\"` field on each question.",
};

const FLASHCARD_DIFFICULTY_PROMPT: Record<string, string> = {
  easy:   "Focus on basic terms, key definitions, and straightforward facts. Each front should be a clear term; each back a concise definition. Set difficulty: \"easy\" on all cards.",
  medium: "Focus on intermediate concepts that require some understanding. Mix term definitions with short-answer concept questions. Set difficulty: \"medium\" on all cards.",
  hard:   "Focus on complex relationships, applications, and synthesis. Fronts should pose analytical questions; backs should provide thorough explanations. Set difficulty: \"hard\" on all cards.",
  mixed:  "Generate a balanced mix of easy (basic terms), medium (concepts), and hard (analytical) cards. Set the `difficulty` field on each card to \"easy\", \"medium\", or \"hard\" accordingly.",
};

export async function generateQuiz(
  sourceText: string,
  count = 10,
  difficulty: "easy" | "medium" | "hard" | "mixed" = "mixed",
  signal?: AbortSignal
): Promise<QuizQuestion[]> {
  const difficultyInstruction = QUIZ_DIFFICULTY_PROMPT[difficulty];
  return withRetry(async (sample) => {
    const raw = await groqComplete(
      [
        {
          role: "system",
          content: `Generate exactly ${count} multiple-choice questions as JSON. Each question must have 4 distinct options.\n\nDifficulty instruction: ${difficultyInstruction}\n\nFormat: {"questions":[{"id":"1","question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"why correct","difficulty":"easy|medium|hard"}]}`,
        },
        { role: "user", content: `Source text:\n\n${sample(sourceText)}` },
      ],
      GROQ_MODELS.fast, true, signal
    );
    return safeParseJSON<{ questions: QuizQuestion[] }>(raw).questions;
  });
}

export async function generateFlashcards(
  sourceText: string,
  count = 20,
  difficulty: "easy" | "medium" | "hard" | "mixed" = "mixed",
  signal?: AbortSignal
): Promise<Flashcard[]> {
  const difficultyInstruction = FLASHCARD_DIFFICULTY_PROMPT[difficulty];
  return withRetry(async (sample) => {
    const raw = await groqComplete(
      [
        {
          role: "system",
          content: `Generate exactly ${count} flashcards as JSON.\n\nDifficulty instruction: ${difficultyInstruction}\n\nFormat: {"cards":[{"id":"1","front":"term or question","back":"definition or answer","difficulty":"easy|medium|hard"}]}`,
        },
        { role: "user", content: `Source text:\n\n${sample(sourceText)}` },
      ],
      GROQ_MODELS.fast, true, signal
    );
    return safeParseJSON<{ cards: Flashcard[] }>(raw).cards;
  });
}

/** Recursively normalise a raw AI node (handles "name" vs "label", missing ids, etc.) */
function normMindMapNode(
  raw: Record<string, unknown>,
  idPrefix = "n",
  idx = 0,
): MindMapNode {
  const label = (raw.label ?? raw.name ?? raw.title ?? raw.topic ?? "Untitled") as string;
  const id    = (raw.id   ?? `${idPrefix}-${idx}`) as string;
  const kids  = (raw.children ?? raw.subtopics ?? raw.topics ?? raw.nodes ?? []) as Record<string, unknown>[];
  return {
    id,
    label: String(label),
    children: Array.isArray(kids)
      ? kids.map((k, i) => normMindMapNode(k as Record<string, unknown>, id, i))
      : [],
  };
}

export async function generateMindMap(sourceText: string, signal?: AbortSignal): Promise<MindMapNode> {
  const raw = await groqComplete(
    [
      {
        role: "system",
        content: [
          "You are a mind-map generator. Return ONLY valid JSON — no markdown, no explanation.",
          'Required format: {"root":{"id":"root","label":"<main topic>","children":[{"id":"t1","label":"<topic>","children":[{"id":"t1a","label":"<subtopic>"}]}]}}',
          "Rules: 5-8 top-level topics, 2-4 subtopics each. IDs must be unique strings. Labels must be short (1-5 words).",
        ].join(" "),
      },
      { role: "user", content: sampleDocument(sourceText, 8000) },
    ],
    GROQ_MODELS.powerful, true, signal
  );

  let parsed: Record<string, unknown>;
  try {
    parsed = safeParseJSON<Record<string, unknown>>(raw);
  } catch {
    console.error("[generateMindMap] JSON parse failed. Raw:", raw);
    throw new Error("Mind map generation returned invalid JSON — please try again");
  }

  // Try the expected { root: {...} } shape first, then fall back to treating
  // the top-level object itself as the root node.
  const rootRaw =
    (parsed.root as Record<string, unknown> | undefined) ??
    (parsed as Record<string, unknown>);

  try {
    const node = normMindMapNode(rootRaw, "root", 0);
    if (!node.label || node.label === "Untitled") {
      console.error("[generateMindMap] Root label missing. Parsed:", parsed);
      throw new Error("Root label missing");
    }
    return node;
  } catch (e) {
    console.error("[generateMindMap] Normalisation failed:", e, "Parsed:", parsed);
    throw new Error("Mind map generation returned invalid structure — please try again");
  }
}

export async function generateStudyGuide(sourceText: string, signal?: AbortSignal): Promise<StudyGuideSection[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Create a comprehensive study guide as JSON. Format: {"sections":[{"heading":"Study Objectives","body":"...","bullets":["..."]},{"heading":"Core Concepts","body":"...","bullets":["..."]},{"heading":"Practice Questions","body":"...","bullets":["Q1: ..."]}]}. Include 5-8 sections.` },
      { role: "user",   content: sampleDocument(sourceText, 12000) },
    ],
    GROQ_MODELS.powerful, true, signal
  );
  return safeParseJSON<{ sections: StudyGuideSection[] }>(raw).sections;
}

export async function generateKeyConcepts(sourceText: string, signal?: AbortSignal): Promise<KeyConcept[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Extract 10-15 key concepts as JSON. Format: {"concepts":[{"term":"...","definition":"clear, concise definition","importance":"high|medium|low","example":"a real-world example"}]}. Mark the most critical concepts as high importance.` },
      { role: "user",   content: sampleDocument(sourceText, 12000) },
    ],
    GROQ_MODELS.fast, true, signal
  );
  return safeParseJSON<{ concepts: KeyConcept[] }>(raw).concepts;
}

export async function generatePodcast(sourceText: string, signal?: AbortSignal): Promise<string> {
  return groqComplete(
    [
      { role: "system", content: "Write an engaging study podcast script as a dialogue between two hosts: Alex and Jamie. They explain the material conversationally, ask each other questions, and use relatable analogies. Format every line as 'Alex: ...' or 'Jamie: ...'. Aim for 15-20 exchanges. Start with a brief introduction." },
      { role: "user",   content: `Study material:\n\n${sampleDocument(sourceText, 10000)}` },
    ],
    GROQ_MODELS.powerful, false, signal
  );
}

export async function generateStarterQuestions(sourceText: string, signal?: AbortSignal): Promise<string[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Generate 5 insightful study questions a student should ask about this material. Mix conceptual and practical questions. Return JSON: {"questions":["...","...","...","...","..."]}` },
      { role: "user",   content: sampleDocument(sourceText, 4000) },
    ],
    GROQ_MODELS.fast, true, signal
  );
  try {
    return safeParseJSON<{ questions: string[] }>(raw).questions.slice(0, 5);
  } catch {
    return [];
  }
}

export async function formatDocumentText(rawText: string, signal?: AbortSignal): Promise<string> {
  return groqComplete(
    [
      {
        role: "system",
        content: [
          "You are a document formatting assistant.",
          "Text was extracted from a PDF/Word file and lost its structure — headings, paragraphs, and lists are all run together.",
          "Restore clean, readable markdown.",
          "Rules: (1) Preserve ALL original words exactly. (2) Add # ## ### headings where you detect section titles or chapter names. (3) Fix paragraph breaks — separate logical paragraphs with a blank line. (4) Format bullet/numbered lists with - . (5) Do NOT add, summarise, or remove any content. (6) Return only the formatted markdown, nothing else.",
        ].join(" "),
      },
      {
        role: "user",
        content: `Format this extracted document text:\n\n${sampleDocument(rawText, 10000)}`,
      },
    ],
    GROQ_MODELS.fast,
    false,
    signal,
    0.1
  );
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function generateAIOutput(
  type:       AIOutputType,
  sourceText: string,
  signal?:    AbortSignal,
  options?:   { difficulty?: "easy" | "medium" | "hard" | "mixed"; count?: number }
): Promise<AIOutputContent> {
  switch (type) {
    case "summary":    return { type: "summary",     text:      await generateSummary(sourceText, signal) };
    case "quiz":       return { type: "quiz",        questions: await generateQuiz(sourceText, options?.count ?? 10, options?.difficulty ?? "mixed", signal) };
    case "flashcards": return { type: "flashcards",  cards:     await generateFlashcards(sourceText, options?.count ?? 20, options?.difficulty ?? "mixed", signal) };
    case "keyconcepts":return { type: "keyconcepts", concepts:  await generateKeyConcepts(sourceText, signal) };
    case "studyguide": return { type: "studyguide",  sections:  await generateStudyGuide(sourceText, signal) };
    case "mindmap":    return { type: "mindmap",     root:      await generateMindMap(sourceText, signal) };
    case "podcast":    return { type: "podcast",     script:    await generatePodcast(sourceText, signal) };
    default:           throw new Error(`Generation for type "${type}" not implemented`);
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
