import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GenerationOptions } from "@/types";

interface Props {
  type: "quiz" | "flashcards" | null;
  onConfirm: (options: GenerationOptions) => void;
  onClose: () => void;
}

type Difficulty = GenerationOptions["difficulty"];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; desc: string; color: string }[] = [
  { value: "easy",   label: "Easy",   desc: "Basic recall & definitions",         color: "text-green-600  border-green-500/40  bg-green-500/8"  },
  { value: "medium", label: "Medium", desc: "Application & comprehension",        color: "text-yellow-600 border-yellow-500/40 bg-yellow-500/8" },
  { value: "hard",   label: "Hard",   desc: "Analysis & critical thinking",       color: "text-red-600    border-red-500/40    bg-red-500/8"    },
  { value: "mixed",  label: "Mixed",  desc: "All levels combined",                color: "text-[var(--brand-primary)] border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/8" },
];

const CONFIG = {
  quiz: {
    icon:        "❓",
    title:       "Quiz Options",
    countLabel:  "Number of Questions",
    counts:      [5, 10, 15, 20] as const,
    defaultCount: 10,
  },
  flashcards: {
    icon:        "🃏",
    title:       "Flashcard Options",
    countLabel:  "Number of Cards",
    counts:      [10, 20, 30, 40] as const,
    defaultCount: 20,
  },
} as const;

export function GenerationOptionsModal({ type, onConfirm, onClose }: Props) {
  const cfg = type ? CONFIG[type] : null;
  const [difficulty, setDifficulty] = useState<Difficulty>("mixed");
  const [count, setCount] = useState<number>(cfg?.defaultCount ?? 10);

  const handleConfirm = () => {
    onConfirm({ difficulty, count });
  };

  return (
    <AnimatePresence>
      {type && (
        <>
          {/* Backdrop */}
          <motion.div
            key="gen-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, pointerEvents: "none" }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="gen-modal"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed z-[60] left-4 right-4 top-1/2 -translate-y-1/2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-full sm:max-w-md"
          >
            <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-1)]">
                <span className="text-xl leading-none">{cfg?.icon}</span>
                <h2 className="text-sm font-semibold text-[var(--text-primary)] flex-1">{cfg?.title}</h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">

                {/* Difficulty */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Difficulty</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDifficulty(opt.value)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 px-3.5 py-3 rounded-xl border text-left transition-all",
                          difficulty === opt.value
                            ? opt.color
                            : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30"
                        )}
                      >
                        <span className="text-sm font-semibold leading-none">{opt.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)] leading-tight mt-0.5">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Count */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">{cfg?.countLabel}</p>
                  <div className="flex gap-2">
                    {cfg?.counts.map((n) => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        className={cn(
                          "flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all",
                          count === n
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                            : "border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2.5 pt-1">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
