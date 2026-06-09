import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw, Download } from "@/lib/icons";
import type { Flashcard } from "@/types";
import { exportFlashcardsCSV } from "@/lib/exportUtils";

interface FlashCardViewProps {
  cards:          Flashcard[];
  notebookTitle?: string;
}

const DIFFICULTY_COLORS: Record<Flashcard["difficulty"], string> = {
  easy:   "text-green-400 bg-green-500/10 border-green-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  hard:   "text-red-400 bg-red-500/10 border-red-500/30",
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
  const [cards, setCards]     = useState(initialCards);
  const [index, setIndex]     = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [filter, setFilter]   = useState<"all" | Flashcard["difficulty"]>("all");

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

  useEffect(() => { reset(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["ArrowRight", "ArrowLeft", " "].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === " ")          setFlipped((f) => !f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (!card) return (
    <div className="p-6 text-center text-[var(--text-muted)]">No cards match this filter.</div>
  );

  return (
    <div className="flex flex-col h-full p-4 gap-3">

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="flex gap-1">
          {(["all", "easy", "medium", "hard"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setFilter(d)}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors capitalize"
              style={filter === d
                ? { background: "#38E0C3", color: "#0a1628", borderColor: "#38E0C3" }
                : { borderColor: "var(--border)", color: "var(--text-muted)" }
              }
            >
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setCards(shuffleArray(cards)); reset(); }}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            title="Shuffle"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={reset}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => exportFlashcardsCSV(cards, notebookTitle)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] border transition-colors"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            onMouseEnter={e => e.currentTarget.style.color = "var(--text-primary)"}
            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
            title="Export CSV (Anki compatible)"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* ── Progress ─────────────────────────────────────────────────────── */}
      <div className="text-xs text-center shrink-0" style={{ color: "var(--text-muted)" }}>
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{index + 1}</span>
        <span> / {filtered.length}</span>
        <span className="ml-3 text-[10px] hidden sm:inline">Space to flip · ← → navigate</span>
      </div>

      {/* ── Card + nav — vertically stacked, card centered with nav 100px below ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-0 min-h-0">

        {/* Card */}
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
              className="rounded-2xl p-7 border min-h-[220px] flex flex-col gap-4"
              style={flipped
                ? { transformStyle: "preserve-3d", background: "rgba(56,224,195,0.06)", borderColor: "rgba(56,224,195,0.25)" }
                : { transformStyle: "preserve-3d", background: "var(--surface-2)", borderColor: "var(--border)" }
              }
            >
              <span
                className={[
                  "self-start text-[10px] font-medium uppercase tracking-wide px-2.5 py-1 rounded-full border",
                  flipped ? "" : DIFFICULTY_COLORS[card.difficulty],
                ].join(" ")}
                style={flipped
                  ? { color: "#38E0C3", borderColor: "rgba(56,224,195,0.4)", background: "rgba(56,224,195,0.1)" }
                  : undefined
                }
              >
                {flipped ? "Answer" : `Front · ${card.difficulty}`}
              </span>
              <p className="text-base font-medium leading-relaxed flex-1 flex items-center" style={{ color: "var(--text-primary)" }}>
                {flipped ? card.back : card.front}
              </p>
              <p className="text-[10px] text-center" style={{ color: "var(--text-muted)" }}>
                {flipped ? "Click to see question" : "Click to reveal answer"}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav buttons — 100px below card */}
        <div className="flex gap-4 justify-center mt-[100px] shrink-0">
          <button
            onClick={prev}
            disabled={index === 0}
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border)",
              color: "var(--text-primary)",
              minWidth: "120px",
            }}
            onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.borderColor = "rgba(56,224,195,0.35)"; }}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <ChevronLeft className="w-5 h-5 shrink-0" />
            Prev
          </button>
          <button
            onClick={next}
            disabled={index >= filtered.length - 1}
            className="flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl text-sm font-semibold transition-all disabled:opacity-30"
            style={{
              background: index >= filtered.length - 1 ? "var(--surface-2)" : "#38E0C3",
              border: "0.5px solid transparent",
              color: index >= filtered.length - 1 ? "var(--text-primary)" : "#0a1628",
              minWidth: "120px",
            }}
          >
            Next
            <ChevronRight className="w-5 h-5 shrink-0" />
          </button>
        </div>
      </div>

    </div>
  );
}
