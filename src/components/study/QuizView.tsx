import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, RotateCcw, Trophy, Download, FileText } from "lucide-react";
import type { QuizQuestion } from "@/types";
import { exportQuizPDF, exportQuizText } from "@/lib/exportUtils";

interface QuizViewProps {
  questions:      QuizQuestion[];
  notebookTitle?: string;
}

type AnswerState = { selected: number; correct: boolean } | null;

export function QuizView({ questions, notebookTitle }: QuizViewProps) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers]   = useState<Record<number, AnswerState>>({});
  const [showScore, setShowScore] = useState(false);

  const q = questions[current];
  const answered = answers[current];
  const totalAnswered = Object.keys(answers).length;
  const score = Object.values(answers).filter((a) => a?.correct).length;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setAnswers((prev) => ({
      ...prev,
      [current]: { selected: idx, correct: idx === q.correct_index },
    }));
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
    } else {
      setShowScore(true);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers({});
    setShowScore(false);
  };

  if (showScore) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center">
          <Trophy className="w-10 h-10 text-[var(--brand-primary)]" />
        </div>
        <div>
          <p className="text-3xl font-bold text-[var(--text-primary)]">{pct}%</p>
          <p className="text-[var(--text-secondary)] mt-1">
            {score} / {questions.length} correct
          </p>
        </div>
        <p className="text-sm text-[var(--text-muted)] max-w-xs">
          {pct >= 80 ? "Excellent work! You've mastered this material." :
           pct >= 60 ? "Good effort! Review the questions you missed." :
           "Keep studying and try again to improve your score."}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={handleRestart} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <RotateCcw className="w-4 h-4" /> Restart
          </button>
          <button onClick={() => exportQuizPDF(questions, notebookTitle)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <Download className="w-3.5 h-3.5" /> PDF
          </button>
          <button onClick={() => exportQuizText(questions, notebookTitle)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <FileText className="w-3.5 h-3.5" /> Text
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* progress */}
      <div>
        <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>Question {current + 1} of {questions.length}</span>
          <span>{totalAnswered} answered</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-3)]">
          <div
            className="h-full rounded-full bg-[var(--brand-primary)] transition-all duration-300"
            style={{ width: `${((current + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4 flex-1"
        >
          <p className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
            {q.question}
          </p>

          <div className="flex flex-col gap-2">
            {q.options.map((opt, i) => {
              let variant = "default";
              if (answered) {
                if (i === q.correct_index) variant = "correct";
                else if (i === answered.selected) variant = "wrong";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  className={[
                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150",
                    variant === "default" && !answered
                      ? "border-[var(--border)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5"
                      : "",
                    variant === "correct"
                      ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "",
                    variant === "wrong"
                      ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400"
                      : "",
                    variant === "default" && answered
                      ? "border-[var(--border)] opacity-50"
                      : "",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                    {variant === "correct" && <CheckCircle2 className="w-4 h-4 ml-auto text-green-500 shrink-0" />}
                    {variant === "wrong" && <XCircle className="w-4 h-4 ml-auto text-red-500 shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--surface-2)] border border-[var(--border)] rounded-lg p-3"
            >
              <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-1">Explanation</p>
              <p className="text-sm text-[var(--text-secondary)]">{q.explanation}</p>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {answered && (
        <button
          onClick={handleNext}
          className="mt-auto w-full py-2.5 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
        >
          {current < questions.length - 1 ? "Next Question" : "See Results"}
        </button>
      )}
    </div>
  );
}
