import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Download } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import type { AIOutput, AIOutputContent, Notebook } from "@/types";
import { TYPE_META } from "./LibraryCard";
import { SummaryView }       from "@/components/study/SummaryView";
import { QuizView }           from "@/components/study/QuizView";
import { FlashCardView }      from "@/components/study/FlashCardView";
import { MindMapView }        from "@/components/study/MindMapView";
import { StudyGuideView }     from "@/components/study/StudyGuideView";
import { KeyConceptsView }    from "@/components/study/KeyConceptsView";
import { PodcastScriptView }  from "@/components/study/PodcastScriptView";
import {
  exportQuizPDF, exportFlashcardsCSV,
  exportSummaryMarkdown, exportStudyGuidePDF,
} from "@/lib/exportUtils";

interface Props {
  output:   AIOutput | null;
  notebook: Notebook | undefined;
  onClose:  () => void;
}

function ContentRenderer({ content }: { content: AIOutputContent }) {
  switch (content.type) {
    case "summary":     return <SummaryView text={content.text} />;
    case "quiz":        return <QuizView questions={content.questions} />;
    case "flashcards":  return <FlashCardView cards={content.cards} />;
    case "mindmap":     return <MindMapView root={content.root} />;
    case "studyguide":  return <StudyGuideView sections={content.sections} />;
    case "keyconcepts": return <KeyConceptsView concepts={content.concepts} />;
    case "podcast":     return <PodcastScriptView script={content.script} />;
    default: return (
      <pre className="p-4 text-xs text-[var(--text-muted)] whitespace-pre-wrap">
        {JSON.stringify(content, null, 2)}
      </pre>
    );
  }
}

function handleExport(output: AIOutput, notebook: Notebook | undefined) {
  const title = notebook?.title ?? "Notebook";
  const c = output.content;
  if (c.type === "quiz")        exportQuizPDF(c.questions, title);
  else if (c.type === "flashcards") exportFlashcardsCSV(c.cards, title);
  else if (c.type === "summary")    exportSummaryMarkdown(c.text, title);
  else if (c.type === "studyguide") exportStudyGuidePDF(c.sections, title);
}

export function LibraryDetailModal({ output, notebook, onClose }: Props) {
  useEffect(() => {
    if (!output) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [output, onClose]);

  const meta = output ? TYPE_META[output.type] ?? TYPE_META.summary : null;
  const Icon = meta?.icon;

  const canExport = output && ["quiz","flashcards","summary","studyguide"].includes(output.type);

  return (
    <AnimatePresence>
      {output && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex flex-col rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0">
              {Icon && meta && (
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                  {notebook?.emoji ?? "📚"} {notebook?.title ?? "Notebook"} — {meta?.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  Generated {output ? format(new Date(output.updated_at), "MMM d, yyyy") : ""}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canExport && (
                  <button
                    onClick={() => handleExport(output, notebook)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </button>
                )}
                <Link
                  to={`/notebooks/${output.notebook_id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-[var(--brand-primary)] text-white hover:opacity-90 transition-opacity"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Notebook
                </Link>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <ContentRenderer content={output.content as AIOutputContent} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
