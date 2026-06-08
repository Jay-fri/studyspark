import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  FileText, ClipboardList, BookOpen, Brain, BookMarked,
  Sparkles, Mic, ExternalLink, Trash2, Download, MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIOutput, AIOutputType, Notebook } from "@/types";

export const TYPE_META: Record<AIOutputType, {
  icon: React.ElementType;
  label: string;
  color: string;
  bg: string;
  badge: string;
}> = {
  summary:      { icon: FileText,      label: "Summary",      color: "text-green-600 dark:text-green-400",   bg: "bg-green-500/10",   badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  quiz:         { icon: ClipboardList, label: "Quiz",         color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" },
  flashcards:   { icon: BookOpen,      label: "Flashcards",   color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/10",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  mindmap:      { icon: Brain,         label: "Mind Map",     color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  studyguide:   { icon: BookMarked,    label: "Study Guide",  color: "text-teal-600 dark:text-teal-400",     bg: "bg-teal-500/10",    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300" },
  keyconcepts:  { icon: Sparkles,      label: "Key Concepts", color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/10",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" },
  podcast:      { icon: Mic,           label: "Podcast",      color: "text-pink-600 dark:text-pink-400",     bg: "bg-pink-500/10",    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300" },
  chat_history: { icon: Sparkles,      label: "Chat",         color: "text-[var(--text-muted)]",             bg: "bg-[var(--surface-2)]", badge: "bg-[var(--surface-3)] text-[var(--text-muted)]" },
};

function getPreview(output: AIOutput): string {
  const c = output.content;
  if (c.type === "summary")     return c.text?.slice(0, 120).replace(/[#*`]/g, "") ?? "";
  if (c.type === "quiz")        return `${c.questions?.length ?? 0} questions`;
  if (c.type === "flashcards")  return `${c.cards?.length ?? 0} flashcards`;
  if (c.type === "keyconcepts") return c.concepts?.slice(0, 3).map((k) => k.term).join(" · ") ?? "";
  if (c.type === "studyguide")  return c.sections?.map((s) => s.heading).slice(0, 3).join(" · ") ?? "";
  if (c.type === "mindmap")     return c.root?.label ?? "";
  if (c.type === "podcast")     return c.script?.slice(0, 120) ?? "";
  return "";
}

interface Props {
  output:   AIOutput;
  notebook: Notebook | undefined;
  onOpen:   (output: AIOutput) => void;
  onDelete: (id: string) => void;
  onExport: (output: AIOutput) => void;
}

export function LibraryCard({ output, notebook, onOpen, onDelete, onExport }: Props) {
  const meta    = TYPE_META[output.type] ?? TYPE_META.summary;
  const Icon    = meta.icon;
  const preview = getPreview(output);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -2 }}
      className="relative group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden hover:border-[var(--brand-primary)]/40 hover:shadow-lg transition-all duration-200"
    >
      {/* top colour bar */}
      <div className={cn("h-1 w-full shrink-0", meta.bg.replace("/10", ""))} style={{ opacity: 0.6 }} />

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
              <Icon className={cn("w-4 h-4", meta.color)} />
            </div>
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", meta.badge)}>
              {meta.label}
            </span>
          </div>
          {/* Action menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-20 w-40 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-xl py-1">
                <button onClick={() => { onOpen(output); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> Open
                </button>
                <button onClick={() => { onExport(output); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-2)] transition-colors">
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <div className="my-1 border-t border-[var(--border)]" />
                <button onClick={() => { onDelete(output.id); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-500 hover:bg-red-500/8 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">
            {notebook?.emoji ?? "📚"} {notebook?.title ?? "Notebook"} — {meta.label}
          </p>
          {preview && (
            <p className="text-xs text-[var(--text-muted)] mt-1.5 line-clamp-2 leading-relaxed">
              {preview}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <Link
            to={`/notebooks/${output.notebook_id}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Go to notebook
          </Link>
          <span className="text-[10px] text-[var(--text-muted)]">
            {format(new Date(output.updated_at), "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Click overlay */}
      <button
        onClick={() => onOpen(output)}
        className="absolute inset-0 z-0"
        aria-label="Open"
      />
    </motion.div>
  );
}
