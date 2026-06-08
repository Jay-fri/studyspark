import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, RotateCcw, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types";
import { generateId } from "@/lib/utils";

const DEMO_CARDS: Flashcard[] = [
  { id: "1", front: "What is photosynthesis?", back: "The process by which plants use sunlight, water, and CO₂ to produce glucose and oxygen.", difficulty: "easy" },
  { id: "2", front: "Define mitosis", back: "A type of cell division resulting in two daughter cells with the same number of chromosomes as the parent cell.", difficulty: "medium" },
  { id: "3", front: "What is the powerhouse of the cell?", back: "The mitochondria — it produces ATP through cellular respiration.", difficulty: "easy" },
];

export default function FlashcardsPage() {
  const [cards, setCards] = useState<Flashcard[]>(DEMO_CARDS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [mode, setMode] = useState<"study" | "list">("study");

  const current = cards[currentIndex];

  const next = () => { setCurrentIndex((i) => (i + 1) % cards.length); setFlipped(false); };
  const prev = () => { setCurrentIndex((i) => (i - 1 + cards.length) % cards.length); setFlipped(false); };

  const handleGenerate = async () => {
    setGenerating(true);
    // TODO: call AI to generate flashcards from document
    await new Promise((r) => setTimeout(r, 1500));
    const newCard: Flashcard = {
      id: generateId(),
      front: "What is the Central Dogma of molecular biology?",
      back: "DNA is transcribed to RNA, which is translated into protein.",
      difficulty: "medium" as const,
    };
    setCards((prev) => [...prev, newCard]);
    setGenerating(false);
  };

  const difficultyColor = {
    easy:   "bg-brand-accent/10 text-brand-accent",
    medium: "bg-brand-warning/10 text-brand-warning",
    hard:   "bg-brand-danger/10 text-brand-danger",
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Flashcards"
        subtitle={`${cards.length} card${cards.length !== 1 ? "s" : ""} ready to review`}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === "study" ? "list" : "study")}
              className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-text-secondary hover:bg-surface-2 transition-colors"
            >
              {mode === "study" ? "List view" : "Study mode"}
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium gradient-brand text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate
            </button>
          </div>
        }
      />

      {mode === "study" && current && (
        <div className="space-y-6">
          {/* Card */}
          <div className="relative" style={{ perspective: 1200 }}>
            <motion.div
              className="relative cursor-pointer"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              onClick={() => setFlipped(!flipped)}
            >
              {/* Front */}
              <div
                className="w-full bg-surface-1 border border-border rounded-3xl p-10 min-h-[280px] flex flex-col items-center justify-center shadow-lg"
                style={{ backfaceVisibility: "hidden" }}
              >
                <span className="text-xs text-text-muted mb-6 uppercase tracking-wider">Front</span>
                <p className="text-xl font-display text-text-primary text-center leading-relaxed">
                  {current.front}
                </p>
                <span className="mt-6 text-xs text-text-muted">Click to reveal answer</span>
              </div>

              {/* Back */}
              <div
                className="absolute inset-0 w-full bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-10 min-h-[280px] flex flex-col items-center justify-center shadow-lg"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              >
                <span className="text-xs text-brand-primary mb-6 uppercase tracking-wider">Answer</span>
                <p className="text-lg text-text-primary text-center leading-relaxed">{current.back}</p>
              </div>
            </motion.div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button onClick={prev} className="p-2 rounded-xl border border-border hover:bg-surface-2 text-text-secondary transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted">{currentIndex + 1} / {cards.length}</span>
              <button onClick={() => setFlipped(false)} className="p-2 rounded-xl border border-border hover:bg-surface-2 text-text-secondary transition-colors">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <button onClick={next} className="p-2 rounded-xl border border-border hover:bg-surface-2 text-text-secondary transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Difficulty rating */}
          {flipped && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-3"
              >
                <span className="text-sm text-text-secondary">How was that?</span>
                {(["easy", "medium", "hard"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={next}
                    className={cn("px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors", difficultyColor[d])}
                  >
                    {d}
                  </button>
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {mode === "list" && (
        <div className="space-y-3">
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="p-4 rounded-xl bg-surface-1 border border-border"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-text-primary">{card.front}</p>
                <span className={cn("shrink-0 text-xs px-2 py-0.5 rounded-full font-medium capitalize", difficultyColor[card.difficulty])}>
                  {card.difficulty}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{card.back}</p>
            </motion.div>
          ))}
          {cards.length === 0 && (
            <div className="text-center py-16 text-text-muted">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No flashcards yet. Generate some from your documents!</p>
              <button
                onClick={handleGenerate}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium mx-auto"
              >
                <Plus className="w-4 h-4" />
                Generate flashcards
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
