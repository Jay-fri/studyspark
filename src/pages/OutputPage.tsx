import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Zap, Loader2 } from "@/lib/icons";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAIOutputs, useAIGenerate, useNotebookSources } from "@/hooks/useNotebook";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { OutputViewer } from "@/components/notebook/OutputViewer";
import { GenerationOptionsModal } from "@/components/notebook/GenerationOptionsModal";
import { FloatingChat } from "@/components/notebook/FloatingChat";
import { useTokenCosts } from "@/hooks/useTokenCosts";
import type { AIOutputType, GenerationOptions } from "@/types";
import toast from "react-hot-toast";

const TYPE_META: Record<string, { label: string; icon: string }> = {
  summary:     { label: "Summary",      icon: "📝" },
  quiz:        { label: "Quiz",         icon: "❓" },
  flashcards:  { label: "Flashcards",   icon: "🃏" },
  mindmap:     { label: "Mind Map",     icon: "🗺️" },
  studyguide:  { label: "Study Guide",  icon: "📖" },
  keyconcepts: { label: "Key Concepts", icon: "💡" },
  podcast:     { label: "Podcast",      icon: "🎙️" },
};

export default function OutputPage() {
  const { id: notebookId, type } = useParams<{ id: string; type: string }>();
  const navigate = useNavigate();
  const outputType = type as AIOutputType;

  const [showOptions, setShowOptions] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [highlightPos, setHighlightPos] = useState<{ top: number; left: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { aiOutputs, isGenerating, generatingType } = useNotebookStore();
  const balance = useAuthStore((s) => s.profile?.study_tokens ?? Infinity);
  const { setPaymentModalOpen } = useUIStore();
  const costs = useTokenCosts();

  useAIOutputs(notebookId ?? "");
  useNotebookSources(notebookId ?? "");
  const { generate, cancel } = useAIGenerate(notebookId ?? "");

  const currentOutput    = aiOutputs.find((o) => o.type === outputType) ?? null;
  const isGeneratingThis = isGenerating && generatingType === outputType;
  const meta             = TYPE_META[outputType] ?? null;
  const cost             = costs[outputType as keyof typeof costs] ?? null;
  const safeBalance      = balance === Infinity ? 999 : (balance as number);
  const noTokens         = safeBalance === 0;
  const isMindMap        = outputType === "mindmap";

  const handleTextUp = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (text.length < 10) { setHighlightPos(null); return; }
    const range = sel?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    if (!rect) return;
    setHighlightPos({ top: rect.top + window.scrollY, left: rect.left + rect.width / 2 });
  }, []);

  const handleAskHighlight = useCallback(() => {
    const text = window.getSelection()?.toString().trim() ?? '';
    if (!text) return;
    setHighlightPos(null);
    window.getSelection()?.removeAllRanges();
    setChatQuery(`Explain this: "${text}"`);
  }, []);

  const triggerGenerate = async (options?: GenerationOptions) => {
    if (noTokens) { setPaymentModalOpen(true); return; }
    if ((outputType === "quiz" || outputType === "flashcards") && !options) {
      setShowOptions(true);
      return;
    }
    try {
      await generate(outputType, options);
      toast.success(`${meta?.label ?? outputType} ready!`);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Generation failed";
      if (msg !== "AbortError" && msg !== "The user aborted a request.") {
        toast.error(msg);
      }
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--surface-0)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-3 border-b border-[var(--border)] shrink-0"
        style={{ minHeight: 52, background: "var(--surface-1)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors shrink-0"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {meta && <span className="text-lg leading-none shrink-0">{meta.icon}</span>}

        <h1 className="flex-1 text-sm font-semibold text-[var(--text-primary)] truncate">
          {meta?.label ?? outputType}
        </h1>

        {/* Action button: Cancel / Regenerate / Top Up / Generate */}
        {isGeneratingThis ? (
          <button
            onClick={cancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors"
            style={{ color: "rgba(239,68,68,0.8)", background: "rgba(239,68,68,0.08)" }}
          >
            Cancel
          </button>
        ) : currentOutput ? (
          <button
            onClick={() => triggerGenerate()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-all shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            Regen
            {cost && <span className="opacity-60">· {cost}</span>}
          </button>
        ) : noTokens ? (
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white shrink-0 gradient-brand"
          >
            <Zap className="w-3 h-3" /> Top Up
          </button>
        ) : (
          <button
            onClick={() => triggerGenerate()}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-60 shrink-0 gradient-brand"
          >
            <Zap className="w-3 h-3" /> Generate
          </button>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className={`flex-1 overflow-hidden${isMindMap ? "" : " overflow-y-auto scrollbar-thin"}`}
        style={{ paddingBottom: 80 }}
        onMouseUp={handleTextUp}
        onTouchEnd={handleTextUp}
      >
        {isGeneratingThis ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#38E0C3" }} />
            <p className="text-sm">Generating {meta?.label}…</p>
          </div>
        ) : currentOutput ? (
          <OutputViewer output={currentOutput} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center px-8">
            {meta && <span className="text-5xl">{meta.icon}</span>}
            <div>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                No {meta?.label} yet
              </p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.38)" }}>
                {noTokens
                  ? "You need tokens to generate this."
                  : `Tap Generate to create your ${meta?.label?.toLowerCase()}.`}
              </p>
            </div>
            {cost && safeBalance > 0 && (
              <button
                onClick={() => triggerGenerate()}
                disabled={isGenerating}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 gradient-brand"
              >
                <Zap className="w-4 h-4" />
                Generate · {cost} tokens
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text-highlight Ask AI bubble */}
      {highlightPos && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none"
          style={{
            top: highlightPos.top - 44,
            left: highlightPos.left,
            transform: "translateX(-50%)",
            background: "rgba(56,224,195,0.18)",
            border: "0.5px solid rgba(56,224,195,0.4)",
            color: "#38E0C3",
            backdropFilter: "blur(12px)",
          }}
          onMouseDown={(e) => { e.preventDefault(); handleAskHighlight(); }}
        >
          Ask AI ✨
        </div>
      )}

      {/* Floating AI chat */}
      <FloatingChat
        contextLabel={meta?.label}
        initialQuery={chatQuery || undefined}
        onInitialQueryConsumed={() => setChatQuery("")}
      />

      {/* Options modal for quiz / flashcards */}
      <GenerationOptionsModal
        type={showOptions ? (outputType as "quiz" | "flashcards") : null}
        onClose={() => setShowOptions(false)}
        onConfirm={(options) => {
          setShowOptions(false);
          triggerGenerate(options);
        }}
      />
    </div>
  );
}
