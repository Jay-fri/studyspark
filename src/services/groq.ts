import { supabase } from "@/services/supabase";
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
      { role: "user",   content: `Summarise the following study material:\n\n${sourceText.slice(0, 12000)}` },
    ],
    GROQ_MODELS.powerful, false, signal
  );
}

export async function generateQuiz(sourceText: string, count = 10, signal?: AbortSignal): Promise<QuizQuestion[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Generate exactly ${count} multiple-choice questions as JSON. Each question must have 4 distinct options. Use this exact format: {"questions":[{"id":"1","question":"...","options":["option A","option B","option C","option D"],"correct_index":0,"explanation":"why this answer is correct"}]}` },
      { role: "user",   content: `Source text:\n\n${sourceText.slice(0, 12000)}` },
    ],
    GROQ_MODELS.fast, true, signal
  );
  return safeParseJSON<{ questions: QuizQuestion[] }>(raw).questions;
}

export async function generateFlashcards(sourceText: string, count = 20, signal?: AbortSignal): Promise<Flashcard[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Generate exactly ${count} flashcards as JSON. Format: {"cards":[{"id":"1","front":"term or question","back":"definition or answer","difficulty":"easy|medium|hard"}]}` },
      { role: "user",   content: `Source text:\n\n${sourceText.slice(0, 12000)}` },
    ],
    GROQ_MODELS.fast, true, signal
  );
  return safeParseJSON<{ cards: Flashcard[] }>(raw).cards;
}

export async function generateMindMap(sourceText: string, signal?: AbortSignal): Promise<MindMapNode> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Create a hierarchical mind map as JSON. Keep it 3 levels deep max (root → topics → subtopics). Format: {"root":{"id":"root","label":"Main Topic","children":[{"id":"t1","label":"Topic 1","children":[{"id":"t1a","label":"Subtopic"}]}]}}` },
      { role: "user",   content: sourceText.slice(0, 8000) },
    ],
    GROQ_MODELS.powerful, true, signal
  );
  return safeParseJSON<{ root: MindMapNode }>(raw).root;
}

export async function generateStudyGuide(sourceText: string, signal?: AbortSignal): Promise<StudyGuideSection[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Create a comprehensive study guide as JSON. Format: {"sections":[{"heading":"Study Objectives","body":"...","bullets":["..."]},{"heading":"Core Concepts","body":"...","bullets":["..."]},{"heading":"Practice Questions","body":"...","bullets":["Q1: ..."]}]}. Include 5-8 sections.` },
      { role: "user",   content: sourceText.slice(0, 12000) },
    ],
    GROQ_MODELS.powerful, true, signal
  );
  return safeParseJSON<{ sections: StudyGuideSection[] }>(raw).sections;
}

export async function generateKeyConcepts(sourceText: string, signal?: AbortSignal): Promise<KeyConcept[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Extract 10-15 key concepts as JSON. Format: {"concepts":[{"term":"...","definition":"clear, concise definition","importance":"high|medium|low","example":"a real-world example"}]}. Mark the most critical concepts as high importance.` },
      { role: "user",   content: sourceText.slice(0, 12000) },
    ],
    GROQ_MODELS.fast, true, signal
  );
  return safeParseJSON<{ concepts: KeyConcept[] }>(raw).concepts;
}

export async function generatePodcast(sourceText: string, signal?: AbortSignal): Promise<string> {
  return groqComplete(
    [
      { role: "system", content: "Write an engaging study podcast script as a dialogue between two hosts: Alex and Jamie. They explain the material conversationally, ask each other questions, and use relatable analogies. Format every line as 'Alex: ...' or 'Jamie: ...'. Aim for 15-20 exchanges. Start with a brief introduction." },
      { role: "user",   content: `Study material:\n\n${sourceText.slice(0, 10000)}` },
    ],
    GROQ_MODELS.powerful, false, signal
  );
}

export async function generateStarterQuestions(sourceText: string, signal?: AbortSignal): Promise<string[]> {
  const raw = await groqComplete(
    [
      { role: "system", content: `Generate 5 insightful study questions a student should ask about this material. Mix conceptual and practical questions. Return JSON: {"questions":["...","...","...","...","..."]}` },
      { role: "user",   content: sourceText.slice(0, 4000) },
    ],
    GROQ_MODELS.fast, true, signal
  );
  try {
    return safeParseJSON<{ questions: string[] }>(raw).questions.slice(0, 5);
  } catch {
    return [];
  }
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

export async function generateAIOutput(
  type:       AIOutputType,
  sourceText: string,
  signal?:    AbortSignal
): Promise<AIOutputContent> {
  switch (type) {
    case "summary":    return { type: "summary",     text:      await generateSummary(sourceText, signal) };
    case "quiz":       return { type: "quiz",        questions: await generateQuiz(sourceText, 10, signal) };
    case "flashcards": return { type: "flashcards",  cards:     await generateFlashcards(sourceText, 20, signal) };
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
