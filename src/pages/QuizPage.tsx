import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { cn } from "@/lib/utils";
import type { QuizQuestion as BaseQuizQuestion } from "@/types";
import { generateId } from "@/lib/utils";

// Extended with UI-only state
type QuizQuestion = BaseQuizQuestion & { user_answer_index: number | null };

const DEMO_QUESTIONS: QuizQuestion[] = [
  {
    id: "1",
    question: "Which organelle is known as the powerhouse of the cell?",
    options: ["Nucleus", "Mitochondria", "Ribosomes", "Golgi apparatus"],
    correct_index: 1,
    explanation: "Mitochondria produce ATP through cellular respiration, supplying energy to the cell.",
    user_answer_index: null,
  },
  {
    id: "2",
    question: "What is the primary pigment in plants responsible for photosynthesis?",
    options: ["Carotenoid", "Anthocyanin", "Chlorophyll", "Melanin"],
    correct_index: 2,
    explanation: "Chlorophyll absorbs sunlight (mainly red and blue wavelengths) to drive photosynthesis.",
    user_answer_index: null,
  },
  {
    id: "3",
    question: "DNA replication is described as 'semi-conservative' because:",
    options: [
      "Each new strand is entirely new",
      "Each new DNA molecule retains one original strand",
      "Only part of the DNA is copied",
      "Replication is slow and conservative",
    ],
    correct_index: 1,
    explanation: "In semi-conservative replication, each daughter DNA molecule consists of one original (parental) strand and one newly synthesized strand.",
    user_answer_index: null,
  },
];

type Phase = "start" | "quiz" | "results";

export default function QuizPage() {
  const [questions, setQuestions] = useState<QuizQuestion[]>(DEMO_QUESTIONS);
  const [phase, setPhase] = useState<Phase>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  const current = questions[currentIndex];
  const answered = questions.filter((q) => q.user_answer_index !== null);
  const correct = answered.filter((q) => q.user_answer_index === q.correct_index);
  const score = answered.length > 0 ? Math.round((correct.length / questions.length) * 100) : 0;

  const handleAnswer = (idx: number) => {
    if (current.user_answer_index !== null) return;
    setQuestions((prev) =>
      prev.map((q, i) => (i === currentIndex ? { ...q, user_answer_index: idx } : q))
    );
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setPhase("results");
    }
  };

  const reset = () => {
    setQuestions((prev) => prev.map((q) => ({ ...q, user_answer_index: null })));
    setCurrentIndex(0);
    setPhase("start");
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 1500));
    const newQ: QuizQuestion = {
      id: generateId(),
      question: "What is the term for organisms that can make their own food?",
      options: ["Heterotrophs", "Autotrophs", "Decomposers", "Parasites"],
      correct_index: 1,
      explanation: "Autotrophs (e.g., plants) produce their own food via photosynthesis or chemosynthesis.",
      user_answer_index: null,
    };
    setQuestions((prev) => [...prev, newQ]);
    setGenerating(false);
  };

  const scoreColor =
    score >= 80 ? "text-brand-accent" : score >= 60 ? "text-brand-warning" : "text-brand-danger";

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <PageHeader
        title="Quiz"
        subtitle="Test your knowledge with AI-generated questions"
        action={
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium gradient-brand text-white shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Add questions
          </button>
        }
      />

      <AnimatePresence mode="wait">
        {/* Start screen */}
        {phase === "start" && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="text-center py-16 bg-surface-1 border border-border rounded-2xl"
          >
            <ClipboardList className="w-12 h-12 text-brand-primary mx-auto mb-4" />
            <h2 className="text-xl font-display text-text-primary mb-2">Ready to test yourself?</h2>
            <p className="text-sm text-text-secondary mb-6">
              {questions.length} questions · Multiple choice
            </p>
            <button
              onClick={() => setPhase("quiz")}
              className="px-6 py-2.5 rounded-xl gradient-brand text-white font-medium shadow-md hover:opacity-90 transition-opacity"
            >
              Start Quiz
            </button>
          </motion.div>
        )}

        {/* Quiz screen */}
        {phase === "quiz" && current && (
          <motion.div
            key={`quiz-${currentIndex}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Progress */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                <motion.div
                  className="h-full gradient-brand rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-text-muted shrink-0">
                {currentIndex + 1} / {questions.length}
              </span>
            </div>

            {/* Question */}
            <div className="bg-surface-1 border border-border rounded-2xl p-6 mb-4">
              <p className="text-base font-medium text-text-primary leading-relaxed">
                {current.question}
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-6">
              {current.options.map((opt, i) => {
                const answered = current.user_answer_index !== null;
                const isSelected = current.user_answer_index === i;
                const isCorrect = current.correct_index === i;

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={cn(
                      "w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all",
                      !answered && "border-border hover:border-brand-primary/50 hover:bg-surface-2 text-text-primary",
                      answered && isCorrect && "border-brand-accent bg-brand-accent/10 text-brand-accent",
                      answered && isSelected && !isCorrect && "border-brand-danger bg-brand-danger/10 text-brand-danger",
                      answered && !isSelected && !isCorrect && "border-border text-text-muted opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 border-current">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span>{opt}</span>
                      {answered && isCorrect && <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" />}
                      {answered && isSelected && !isCorrect && <XCircle className="w-4 h-4 ml-auto shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {current.user_answer_index !== null && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4 mb-6"
              >
                <p className="text-sm text-text-secondary">
                  <span className="font-medium text-brand-primary">Explanation: </span>
                  {current.explanation}
                </p>
              </motion.div>
            )}

            {current.user_answer_index !== null && (
              <button
                onClick={handleNext}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-brand text-white font-medium shadow-md hover:opacity-90 transition-opacity"
              >
                {currentIndex < questions.length - 1 ? "Next question" : "See results"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}

        {/* Results */}
        {phase === "results" && (
          <motion.div
            key="results"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center bg-surface-1 border border-border rounded-2xl p-8"
          >
            <div className={cn("text-6xl font-display mb-2", scoreColor)}>{score}%</div>
            <p className="text-text-secondary mb-1">
              {correct.length} / {questions.length} correct
            </p>
            <p className="text-sm text-text-muted mb-8">
              {score >= 80 ? "Excellent work! 🎉" : score >= 60 ? "Good effort! Keep studying." : "Keep practicing — you'll get there!"}
            </p>

            <div className="space-y-3 mb-8 text-left">
              {questions.map((q) => (
                <div key={q.id} className="flex items-start gap-2 text-sm">
                  {q.user_answer_index === q.correct_index
                    ? <CheckCircle2 className="w-4 h-4 text-brand-accent shrink-0 mt-0.5" />
                    : <XCircle className="w-4 h-4 text-brand-danger shrink-0 mt-0.5" />}
                  <span className="text-text-secondary">{q.question}</span>
                </div>
              ))}
            </div>

            <button
              onClick={reset}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border text-text-secondary hover:bg-surface-2 transition-colors mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              Retake quiz
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
