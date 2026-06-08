import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw, Download } from "lucide-react";
import type { Flashcard } from "@/types";
import { exportFlashcardsCSV } from "@/lib/exportUtils";

interface FlashCardViewProps {
  cards:          Flashcard[];
  notebookTitle?: string;
}

const DIFFICULTY_COLORS: Record<Flashcard["difficulty"], string> = {
  easy:   "text-green-600 bg-green-500/10 border-green-200 dark:border-green-800",
  medium: "text-yellow-600 bg-yellow-500/10 border-yellow-200 dark:border-yellow-800",
  hard:   "text-red-600 bg-red-500/10 border-red-200 dark:border-red-800",
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashCardView({ cards: initialCards, notebookTitle }: FlashCardViewProps) {
  const [cards, setCards]   = useState(initialCards);
  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter] = useState<"all" | Flashcard["difficulty"]>("all");

  const filtered = filter === "all" ? cards : cards.filter((c) => c.difficulty === filter);
  const card     = filtered[index] ?? filtered[0];

  const next = useCallback(() => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.min(i + 1, filtered.length - 1)), 150);
  }, [filtered.length]);

  const prev = useCallback(() => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => Math.max(i - 1, 0)), 150);
  }, []);

  const reset = () => { setIndex(0); setFlipped(false); };

  useEffect(() => {
    reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === " ") e.preventDefault();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === " ")          setFlipped((f) => !f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (!card) return <div className="p-6 text-center text-[var(--text-muted)]">No cards match this filter.</div>;

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex gap-1">
          {(["all", "easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className={[
                "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize",
                filter === d
                  ? "bg-[var(--brand-primary)] text-white border-transparent"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]",
              ].join(" ")}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setCards(shuffleArray(cards)); reset(); }}
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exportFlashcardsCSV(cards, notebookTitle)}
            className="flex items-center gap-1 px-2 py-1 rounded text-[10px] border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-3)] transition-colors"
            title="Export CSV (Anki compatible)"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* progress */}
      <div className="text-xs text-[var(--text-muted)] text-center shrink-0">
        {index + 1} / {filtered.length}
        <span className="ml-3 text-[10px] text-[var(--text-muted)]">Space to flip · ← → to navigate</span>
      </div>

      {/* card */}
      <div className="flex-1 flex items-center justify-center">
        <div
          className="w-full max-w-md cursor-pointer"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${card.id}-${flipped}`}
              initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ transformStyle: "preserve-3d" }}
              className={[
                "rounded-2xl p-6 shadow-md border min-h-[200px] flex flex-col gap-3",
                flipped
                  ? "bg-[var(--brand-primary)]/8 border-[var(--brand-primary)]/30"
                  : "bg-[var(--surface-2)] border-[var(--border)]",
              ].join(" ")}
            >
              <span className={[
                "self-start text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border",
                flipped ? "text-[var(--brand-primary)] border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/10" : DIFFICULTY_COLORS[card.difficulty],
              ].join(" ")}>
                {flipped ? "Answer" : `Front · ${card.difficulty}`}
              </span>
              <p className="text-base font-medium text-[var(--text-primary)] leading-relaxed flex-1 flex items-center">
                {flipped ? card.back : card.front}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] text-center">
                {flipped ? "Click to see question" : "Click to reveal answer"}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* navigation */}
      <div className="flex gap-3 justify-center shrink-0">
        <button
          onClick={prev}
          disabled={index === 0}
          className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-3)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
        <button
          onClick={next}
          disabled={index >= filtered.length - 1}
          className="p-2 rounded-lg border border-[var(--border)] disabled:opacity-30 hover:bg-[var(--surface-3)] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[var(--text-primary)]" />
        </button>
      </div>
    </div>
  );
}
