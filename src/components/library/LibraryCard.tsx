import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Trash2, Download, ArrowUpRight } from "@/lib/icons";
import type { AIOutput, AIOutputType, Notebook } from "@/types";

export const TYPE_META: Record<AIOutputType, {
  label:  string;
  emoji:  string;
  color:  string;
  bg:     string;
}> = {
  summary:     { label: "Summary",      emoji: "📄", color: "#F97316", bg: "rgba(249,115,22,0.10)"  },
  quiz:        { label: "Quiz",         emoji: "✏️",  color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  flashcards:  { label: "Flashcards",   emoji: "🃏", color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  mindmap:     { label: "Mind map",     emoji: "🕸️",  color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  studyguide:  { label: "Study guide",  emoji: "📋", color: "#F97316", bg: "rgba(249,115,22,0.10)"  },
  keyconcepts: { label: "Key concepts", emoji: "💡", color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  podcast:     { label: "Podcast",      emoji: "🎙️",  color: "#EC4899", bg: "rgba(236,72,153,0.10)"  },
  chat_history:{ label: "Chat",         emoji: "💬", color: "#6B6B72", bg: "rgba(107,107,114,0.10)" },
};

export function getPreview(output: AIOutput): string {
  const c = output.content;
  if (c.type === "summary")     return c.text?.slice(0, 140).replace(/[#*`]/g, "").trim() ?? "";
  if (c.type === "quiz")        return `${c.questions?.length ?? 0} questions`;
  if (c.type === "flashcards")  return `${c.cards?.length ?? 0} flashcards`;
  if (c.type === "keyconcepts") return c.concepts?.slice(0, 4).map((k) => k.term).join(" · ") ?? "";
  if (c.type === "studyguide")  return c.sections?.map((s) => s.heading).slice(0, 3).join(" · ") ?? "";
  if (c.type === "mindmap")     return c.root?.label ?? "";
  if (c.type === "podcast")     return c.script?.slice(0, 140).trim() ?? "";
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
  const preview = getPreview(output);
  const nbColor = notebook?.color || meta.color;

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
      exit={{ opacity: 0, scale: 0.97 }}
      className="relative group flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-px"
      style={{
        background: "var(--surface-1)",
        border: `0.5px solid ${nbColor}35`,
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = `0 4px 20px ${nbColor}20`;
        e.currentTarget.style.borderColor = `${nbColor}60`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
        e.currentTarget.style.borderColor = `${nbColor}35`;
      }}
    >
      {/* Colored notebook header band */}
      <button
        onClick={() => onOpen(output)}
        className="flex flex-col flex-1 text-left"
      >
        <div
          className="px-4 pt-4 pb-3 relative overflow-hidden"
          style={
            notebook?.cover_image_url
              ? { backgroundImage: `url(${notebook.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: "72px" }
              : { background: `${nbColor}15` }
          }
        >
          {notebook?.cover_image_url && (
            <div className="absolute inset-0" style={{ background: "rgba(5,12,25,0.55)" }} />
          )}
          {!notebook?.cover_image_url && (
            <div
              className="absolute -top-3 -right-3 w-14 h-14 rounded-full opacity-20"
              style={{ background: `radial-gradient(circle, ${nbColor}, transparent 70%)` }}
            />
          )}
          <div className="flex items-center justify-between relative z-10">
            <span
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: meta.bg, color: meta.color }}
            >
              {meta.emoji} {meta.label}
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: notebook?.cover_image_url ? "rgba(255,255,255,0.6)" : nbColor }} />
          </div>
          <div className="flex items-center gap-1.5 mt-2 relative z-10">
            {notebook?.icon_url ? (
              <div className="w-4 h-4 rounded-md overflow-hidden shrink-0">
                <img src={notebook.icon_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-xs">{notebook?.emoji ?? "📚"}</span>
            )}
            <p
              className="text-xs font-medium truncate"
              style={{ color: notebook?.cover_image_url ? "rgba(255,255,255,0.8)" : `${nbColor}cc` }}
            >
              {notebook?.title ?? "Notebook"}
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="px-4 pt-3 pb-3 flex-1">
          {preview ? (
            <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-secondary)" }}>
              {preview}
            </p>
          ) : (
            <p className="text-sm italic" style={{ color: "var(--text-dim)" }}>
              No preview available
            </p>
          )}
        </div>
      </button>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderTop: `0.5px solid ${nbColor}20` }}
      >
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {format(new Date(output.updated_at), "MMM d, yyyy")}
        </span>

        {/* Actions */}
        <div className="flex items-center gap-1" ref={menuRef}>
          <Link
            to={`/notebooks/${output.notebook_id}`}
            onClick={e => e.stopPropagation()}
            title="Open notebook"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--brand-primary)"; e.currentTarget.style.background = "var(--surface-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button
            onClick={e => { e.stopPropagation(); onExport(output); }}
            title="Export"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-2)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete(output.id); }}
            title="Delete"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: "var(--text-dim)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--brand-danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
