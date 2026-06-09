import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Loader2, Zap } from "lucide-react";
import { OutputViewer } from "./OutputViewer";
import { useTokenCosts } from "@/hooks/useTokenCosts";
import { Portal } from "@/components/shared/Portal";
import { cn } from "@/lib/utils";
import type { AIOutput, AIOutputType } from "@/types";

const TYPE_META: Record<string, { label: string; icon: string }> = {
  summary:     { label: "Summary",     icon: "📝" },
  quiz:        { label: "Quiz",        icon: "❓" },
  flashcards:  { label: "Flashcards",  icon: "🃏" },
  mindmap:     { label: "Mind Map",    icon: "🗺️" },
  studyguide:  { label: "Study Guide", icon: "📖" },
  keyconcepts: { label: "Key Concepts",icon: "💡" },
  podcast:     { label: "Podcast",     icon: "🎙️" },
};

interface Props {
  output:      AIOutput | null;
  type:        AIOutputType | null;
  open:        boolean;
  onClose:     () => void;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  isGeneratingThis?: boolean;
  onCancel?:   () => void;
  balance:     number;
  onTopUp?:    () => void;
}

export function OutputModal({
  output, type, open, onClose,
  onRegenerate, isGenerating, isGeneratingThis, onCancel,
  balance, onTopUp,
}: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  const costs = useTokenCosts();
  const meta = type ? TYPE_META[type] : null;
  const cost = type ? costs[type as keyof typeof costs] : null;
  const isMindMap = type === "mindmap";

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — pointer-events disabled immediately on exit so it doesn't swallow clicks */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className={cn(
              "fixed z-50 bg-[var(--surface-0)] border border-[var(--border)] shadow-2xl flex flex-col",
              // Full-screen on mobile, large card on desktop
              "inset-2 sm:inset-6 md:inset-10 rounded-2xl overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--surface-1)]">
              {meta && (
                <span className="text-xl leading-none">{meta.icon}</span>
              )}
              <h2 className="text-base font-semibold text-[var(--text-primary)] flex-1">
                {meta?.label ?? "Output"}
              </h2>

              <div className="flex items-center gap-2 shrink-0">
                {/* Regen / Cancel */}
                {isGeneratingThis ? (
                  <button
                    onClick={onCancel}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-all"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                ) : output && onRegenerate ? (
                  <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-2)] disabled:opacity-50 transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate {cost && <span className="opacity-60 ml-0.5">· {cost}</span>}
                  </button>
                ) : !output && balance === 0 ? (
                  <button
                    onClick={onTopUp}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Zap className="w-3 h-3" /> Top Up
                  </button>
                ) : !output && onRegenerate ? (
                  <button
                    onClick={onRegenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl gradient-brand text-white text-xs font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                  >
                    <Zap className="w-3 h-3" />
                    Generate {cost && <span className="opacity-80">· {cost}</span>}
                  </button>
                ) : null}

                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className={cn("flex-1 overflow-hidden", !isMindMap && "overflow-y-auto scrollbar-thin")}>
              {isGeneratingThis ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                  <p className="text-sm">Generating {meta?.label}…</p>
                </div>
              ) : output ? (
                <OutputViewer output={output} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
                  {meta && <span className="text-5xl">{meta.icon}</span>}
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">
                      No {meta?.label} yet
                    </p>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      {balance === 0
                        ? "You need tokens to generate this."
                        : `Click Generate to create your ${meta?.label?.toLowerCase()}.`}
                    </p>
                  </div>
                  {cost && balance > 0 && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      disabled={isGenerating}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      <Zap className="w-4 h-4" />
                      Generate · {cost} tokens
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </Portal>
  );
}
