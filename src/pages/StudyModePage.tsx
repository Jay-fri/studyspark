import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  X, ChevronLeft, ChevronRight, Timer, Play, Pause,
  RotateCcw, CheckCircle2, Coffee,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { useNotebookStore } from "@/stores/notebookStore";
import { useSRS } from "@/hooks/useSRS";
import type { AIOutput, Flashcard, QuizQuestion } from "@/types";
import { cn } from "@/lib/utils";

type StudyContent = { type: "flashcards"; cards: Flashcard[] } | { type: "quiz"; questions: QuizQuestion[] };

// ─── Pomodoro ─────────────────────────────────────────────────────────────────

function usePomodoro() {
  const WORK  = 25 * 60;
  const BREAK = 5  * 60;
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [secs, setSecs]   = useState(WORK);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          const next = phase === "work" ? "break" : "work";
          setPhase(next);
          setSecs(next === "work" ? WORK : BREAK);
          return next === "work" ? WORK : BREAK;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase]);

  const toggle = () => setRunning((r) => !r);
  const reset  = () => { setRunning(false); setPhase("work"); setSecs(WORK); };

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return { phase, display: `${mm}:${ss}`, running, toggle, reset, secs };
}

// ─── Session timer ────────────────────────────────────────────────────────────

function useSessionTimer() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// ─── Flashcard study ──────────────────────────────────────────────────────────

function FlashcardStudy({ cards }: { cards: Flashcard[] }) {
  const { review } = useSRS();
  const [index, setIndex]   = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[index];

  const next = useCallback(() => { setFlipped(false); setTimeout(() => setIndex((i) => Math.min(i + 1, cards.length - 1)), 100); }, [cards.length]);
  const prev = useCallback(() => { setFlipped(false); setTimeout(() => setIndex((i) => Math.max(i - 1, 0)), 100); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft")  prev();
      if (e.key === " ")          { e.preventDefault(); setFlipped((f) => !f); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (!card) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-xl">
      <p className="text-white/40 text-xs">{index + 1} / {cards.length}</p>

      <div style={{ perspective: "1000px" }} className="w-full cursor-pointer" onClick={() => setFlipped((f) => !f)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${card.id}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "rounded-2xl p-10 min-h-[220px] flex flex-col items-center justify-center text-center gap-4",
              flipped ? "bg-orange-950/40 border border-orange-500/30" : "bg-white/5 border border-white/10"
            )}
          >
            <span className="text-[10px] uppercase tracking-widest font-semibold text-white/40">
              {flipped ? "Answer" : "Question"}
            </span>
            <p className={cn("text-lg font-medium leading-relaxed", flipped ? "text-orange-200" : "text-white")}>
              {flipped ? card.back : card.front}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {flipped && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3 w-full">
          <button onClick={() => { review(card.id, false); next(); }} className="py-3 rounded-xl bg-red-900/30 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-900/50 transition-colors">
            Review Again
          </button>
          <button onClick={() => { review(card.id, true); next(); }} className="py-3 rounded-xl bg-green-900/30 border border-green-500/30 text-green-300 text-sm font-medium hover:bg-green-900/50 transition-colors">
            Got It ✓
          </button>
        </motion.div>
      )}

      <div className="flex gap-3">
        <button onClick={prev} disabled={index === 0} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 disabled:opacity-20 hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button onClick={next} disabled={index >= cards.length - 1} className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/50 disabled:opacity-20 hover:bg-white/10 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <p className="text-white/30 text-[10px]">Space to flip · ← → to navigate</p>
    </div>
  );
}

// ─── Quiz study ───────────────────────────────────────────────────────────────

function QuizStudy({ questions }: { questions: QuizQuestion[] }) {
  const [index, setIndex]   = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore]   = useState(0);
  const [done, setDone]     = useState(false);

  const q = questions[index];

  const handleAnswer = (i: number) => {
    if (answer !== null) return;
    setAnswer(i);
    if (i === q.correct_index) setScore((s) => s + 1);
  };

  const handleNext = () => {
    if (index >= questions.length - 1) { setDone(true); return; }
    setAnswer(null);
    setIndex((i) => i + 1);
  };

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <CheckCircle2 className="w-16 h-16 text-orange-400" />
        <p className="text-3xl font-display text-white">{pct}%</p>
        <p className="text-white/60">{score}/{questions.length} correct</p>
        <button onClick={() => { setIndex(0); setAnswer(null); setScore(0); setDone(false); }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
          <RotateCcw className="w-4 h-4" /> Restart
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-xl">
      <p className="text-white/40 text-xs text-center">{index + 1} / {questions.length}</p>
      <p className="text-base font-medium text-white text-center leading-relaxed">{q.question}</p>
      <div className="flex flex-col gap-2">
        {q.options.map((opt, i) => {
          let cls = "border-white/10 bg-white/5 text-white/70 hover:bg-white/10";
          if (answer !== null) {
            if (i === q.correct_index) cls = "border-green-500/50 bg-green-900/30 text-green-300";
            else if (i === answer)     cls = "border-red-500/50 bg-red-900/30 text-red-300";
            else                       cls = "border-white/5 bg-white/2 text-white/30";
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)}
              className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm transition-all", cls)}>
              <span className="font-bold mr-2 text-white/40">{String.fromCharCode(65+i)}.</span>{opt}
            </button>
          );
        })}
      </div>
      {answer !== null && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-white/50 italic">{q.explanation}</p>
          <button onClick={handleNext}
            className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:opacity-90 transition-opacity">
            {index < questions.length - 1 ? "Next Question →" : "See Results"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudyModePage() {
  const { notebookId } = useParams<{ notebookId: string }>();
  const navigate       = useNavigate();
  const notebooks      = useNotebookStore((s) => s.notebooks);
  const notebook       = notebooks.find((n) => n.id === notebookId);
  const sessionTime    = useSessionTimer();
  const pomodoro       = usePomodoro();
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [contentType, setContentType]   = useState<"flashcards" | "quiz" | null>(null);

  const { data: outputs = [] } = useQuery<AIOutput[]>({
    queryKey: ["study-outputs", notebookId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
        .eq("notebook_id", notebookId!);
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!notebookId,
    staleTime: 30_000,
  });

  const flashcardsOutput = outputs.find((o) => o.type === "flashcards");
  const quizOutput       = outputs.find((o) => o.type === "quiz");

  // Auto-pick content: prefer flashcards
  useEffect(() => {
    if (contentType) return;
    if (flashcardsOutput) setContentType("flashcards");
    else if (quizOutput)  setContentType("quiz");
  }, [flashcardsOutput, quizOutput, contentType]);

  // ESC to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") navigate(-1); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const studyContent: StudyContent | null =
    contentType === "flashcards" && flashcardsOutput?.content.type === "flashcards"
      ? { type: "flashcards", cards: flashcardsOutput.content.cards }
      : contentType === "quiz" && quizOutput?.content.type === "quiz"
      ? { type: "quiz", questions: quizOutput.content.questions }
      : null;

  const pomodoroColor = pomodoro.phase === "work" ? "text-orange-400" : "text-blue-400";

  return (
    <div className="min-h-dvh bg-[#0a0a0a] flex flex-col text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4" /> Exit
          </button>
          <span className="text-white/20">|</span>
          <span className="text-sm text-white/60">
            {notebook?.emoji ?? "📚"} {notebook?.title ?? "Study Mode"}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Content type switcher */}
          {flashcardsOutput && quizOutput && (
            <div className="flex rounded-lg border border-white/10 overflow-hidden">
              <button onClick={() => setContentType("flashcards")}
                className={cn("px-3 py-1 text-xs transition-colors", contentType === "flashcards" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/70")}>
                Flashcards
              </button>
              <button onClick={() => setContentType("quiz")}
                className={cn("px-3 py-1 text-xs transition-colors", contentType === "quiz" ? "bg-orange-500/20 text-orange-300" : "text-white/40 hover:text-white/70")}>
                Quiz
              </button>
            </div>
          )}

          {/* Session timer */}
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Timer className="w-3.5 h-3.5" />
            {sessionTime}
          </div>

          {/* Pomodoro */}
          <button
            onClick={() => setShowPomodoro((v) => !v)}
            className={cn("flex items-center gap-1.5 text-xs transition-colors", showPomodoro ? "text-orange-400" : "text-white/40 hover:text-white/70")}
          >
            <Coffee className="w-3.5 h-3.5" />
            Pomodoro
          </button>
        </div>
      </div>

      {/* Pomodoro panel */}
      <AnimatePresence>
        {showPomodoro && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex items-center justify-center gap-6 overflow-hidden bg-black/30 border-b border-white/5"
          >
            <div className="flex items-center gap-4 py-3">
              <span className={cn("text-xs uppercase tracking-widest font-semibold", pomodoroColor)}>
                {pomodoro.phase === "work" ? "Focus Time" : "Break Time"}
              </span>
              <span className={cn("text-2xl font-mono font-bold", pomodoroColor)}>
                {pomodoro.display}
              </span>
              <button onClick={pomodoro.toggle} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                {pomodoro.running ? <Pause className="w-4 h-4 text-white/60" /> : <Play className="w-4 h-4 text-white/60" />}
              </button>
              <button onClick={pomodoro.reset} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <RotateCcw className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        {!studyContent && (
          <div className="text-center space-y-4">
            <p className="text-white/40 text-sm">No flashcards or quiz found for this notebook.</p>
            <button onClick={() => navigate(`/notebooks/${notebookId}`)}
              className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm hover:opacity-90 transition-opacity">
              Generate Content
            </button>
          </div>
        )}
        {studyContent?.type === "flashcards" && <FlashcardStudy cards={studyContent.cards} />}
        {studyContent?.type === "quiz"        && <QuizStudy questions={studyContent.questions} />}
      </div>

      {/* ESC hint */}
      <p className="text-center text-white/20 text-[10px] pb-4">Press ESC to exit</p>
    </div>
  );
}
