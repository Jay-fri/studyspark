import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, RotateCcw, Trophy, BookOpen } from "@/lib/icons";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useSRS } from "@/hooks/useSRS";
import type { AIOutput, Flashcard } from "@/types";

interface DueCard {
  card:           Flashcard;
  notebookTitle:  string;
  notebookEmoji:  string;
}

export default function StudyReviewPage() {
  const userId  = useAuthStore((s) => s.user?.id);
  const { getDueCards, review } = useSRS();

  const { data: flashcardOutputs = [], isLoading } = useQuery<AIOutput[]>({
    queryKey: ["all-flashcards", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*, notebooks(title, emoji)")
        .eq("user_id", userId!)
        .eq("type", "flashcards");
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const dueCards: DueCard[] = useMemo(() => {
    const result: DueCard[] = [];
    for (const output of flashcardOutputs) {
      const c = output.content;
      if (c.type !== "flashcards") continue;
      const nb = (output as AIOutput & { notebooks?: { title: string; emoji: string } }).notebooks;
      const due = getDueCards(c.cards);
      for (const card of due) {
        result.push({
          card,
          notebookTitle: nb?.title ?? "Notebook",
          notebookEmoji: nb?.emoji ?? "📚",
        });
      }
    }
    return result;
  }, [flashcardOutputs, getDueCards]);

  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [done, setDone]         = useState<string[]>([]);

  const current = dueCards[index];
  const progress = dueCards.length > 0 ? (done.length / dueCards.length) : 0;

  const handleReview = (known: boolean) => {
    if (!current) return;
    review(current.card.id, known);
    setDone((d) => [...d, current.card.id]);
    setFlipped(false);
    setTimeout(() => setIndex((i) => i + 1), 150);
  };

  const handleRestart = () => {
    setIndex(0);
    setDone([]);
    setFlipped(false);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-dvh">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--brand-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--surface-0)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="text-sm font-medium text-[var(--text-primary)]">
          Spaced Review
        </div>
        <div className="text-xs text-[var(--text-muted)]">
          {done.length}/{dueCards.length} done
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-[var(--surface-2)]">
        <motion.div
          className="h-full bg-[var(--brand-primary)]"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8">

        {/* No cards due */}
        {dueCards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-xl font-display text-[var(--text-primary)]">All caught up!</p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs">
              No flashcards are due for review today. Come back tomorrow.
            </p>
            <Link to="/library" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
              <BookOpen className="w-4 h-4" /> Browse Library
            </Link>
          </motion.div>
        )}

        {/* Session complete */}
        {dueCards.length > 0 && index >= dueCards.length && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-[var(--brand-primary)]" />
            </div>
            <p className="text-xl font-display text-[var(--text-primary)]">Session Complete!</p>
            <p className="text-sm text-[var(--text-muted)]">
              You reviewed {done.length} card{done.length !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Review again
              </button>
              <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
                Back to Dashboard
              </Link>
            </div>
          </motion.div>
        )}

        {/* Active card */}
        {current && index < dueCards.length && (
          <div className="w-full max-w-lg flex flex-col gap-6">
            {/* Source */}
            <p className="text-center text-xs text-[var(--text-muted)]">
              {current.notebookEmoji} {current.notebookTitle}
            </p>

            {/* Flip card */}
            <div
              className="cursor-pointer w-full"
              style={{ perspective: "1000px" }}
              onClick={() => setFlipped((f) => !f)}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${current.card.id}-${flipped}`}
                  initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={[
                    "rounded-2xl p-8 min-h-[200px] flex flex-col items-center justify-center text-center gap-3 shadow-md border",
                    flipped
                      ? "bg-[var(--brand-primary)]/8 border-[var(--brand-primary)]/30"
                      : "bg-[var(--surface-1)] border-[var(--border)]",
                  ].join(" ")}
                >
                  <span className={[
                    "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                    flipped ? "bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]" : "bg-[var(--surface-2)] text-[var(--text-muted)]",
                  ].join(" ")}>
                    {flipped ? "Answer" : "Question"}
                  </span>
                  <p className={[
                    "text-base font-medium leading-relaxed",
                    flipped ? "text-[var(--brand-primary)]" : "text-[var(--text-primary)]",
                  ].join(" ")}>
                    {flipped ? current.card.back : current.card.front}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {flipped ? "How well did you know this?" : "Tap to reveal answer"}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Review buttons — only visible after flip */}
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    onClick={() => handleReview(false)}
                    className="py-3.5 rounded-xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                  >
                    Review Again
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">Tomorrow</span>
                  </button>
                  <button
                    onClick={() => handleReview(true)}
                    className="py-3.5 rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-semibold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                  >
                    Got It!
                    <span className="block text-[10px] font-normal opacity-70 mt-0.5">In 3+ days</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
