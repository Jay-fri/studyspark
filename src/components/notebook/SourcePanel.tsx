import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  FileText,
  FileType2,
  File,
  Link2,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { useNotebookStore } from "@/stores/notebookStore";
import { useNotebookSources } from "@/hooks/useNotebook";
import { UploadModal } from "./UploadModal";
import { cn } from "@/lib/utils";
import type { Source } from "@/types";
import toast from "react-hot-toast";

const TYPE_ICON: Record<Source["type"], React.ElementType> = {
  pdf:  FileText,
  docx: FileType2,
  txt:  File,
  md:   File,
  url:  Link2,
  text: FileText,
};

const TYPE_COLOR: Record<Source["type"], string> = {
  pdf:  "text-red-500",
  docx: "text-blue-500",
  txt:  "text-text-muted",
  md:   "text-text-muted",
  url:  "text-brand-accent",
  text: "text-brand-primary",
};

function SourceItem({
  source,
  isSelected,
  onToggle,
  onRename,
  onDelete,
}: {
  source:     Source;
  isSelected: boolean;
  onToggle:   () => void;
  onRename:   (title: string) => void;
  onDelete:   () => void;
}) {
  const [editing,   setEditing]   = useState(false);
  const [editTitle, setEditTitle] = useState(source.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setEditTitle(source.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 20);
  };

  const confirmEdit = () => {
    if (editTitle.trim() && editTitle.trim() !== source.title) {
      onRename(editTitle.trim());
    }
    setEditing(false);
  };

  const Icon  = TYPE_ICON[source.type] ?? FileText;
  const color = TYPE_COLOR[source.type] ?? "text-text-muted";

  return (
    <div
      className={cn(
        "group flex items-start gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
        isSelected
          ? "bg-brand-primary/10 border border-brand-primary/30"
          : "hover:bg-surface-2 border border-transparent"
      )}
      onClick={!editing ? onToggle : undefined}
    >
      {/* Type icon */}
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", color)} />

      {/* Title */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") confirmEdit(); if (e.key === "Escape") setEditing(false); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-xs bg-transparent border-b border-brand-primary outline-none text-text-primary"
          />
        ) : (
          <p className="text-xs font-medium text-text-primary truncate">{source.title}</p>
        )}
        {source.word_count && (
          <p className="text-[10px] text-text-muted mt-0.5">
            {source.word_count.toLocaleString()} words
          </p>
        )}
      </div>

      {/* Actions */}
      {editing ? (
        <div className="flex items-center gap-1">
          <button onClick={(e) => { e.stopPropagation(); confirmEdit(); }} className="p-1 text-brand-accent hover:text-brand-primary">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setEditing(false); }} className="p-1 text-text-muted">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); startEdit(); }}
            className="p-1 rounded text-text-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 rounded text-text-muted hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  notebookId:  string;
  collapsed:   boolean;
  onCollapse:  () => void;
}

export function SourcePanel({ notebookId, collapsed, onCollapse }: Props) {
  const [showUpload, setShowUpload] = useState(false);
  const { activeNotebook, sources, selectedSourceIds, setSelectedSourceIds, toggleSourceSelect } = useNotebookStore();
  const { renameSource, deleteSource } = useNotebookSources(notebookId);

  const isAllSelected = selectedSourceIds === "all";

  const handleDelete = (id: string, title: string) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete &ldquo;{title}&rdquo;?</span>
        <button
          onClick={() => { deleteSource.mutate(id); toast.dismiss(t.id); }}
          className="px-2 py-1 rounded-lg bg-brand-danger text-white text-xs font-medium"
        >
          Delete
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-text-muted">Cancel</button>
      </div>
    ), { duration: 5000 });
  };

  // ── Icon-only collapsed view ──────────────────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col items-center h-full w-full bg-[var(--surface-1)] border-r border-[var(--border)] overflow-hidden py-2 gap-1">
        {/* Expand button */}
        <button
          onClick={onCollapse}
          title="Expand sources"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
        <div className="w-6 h-px bg-[var(--border)] my-1" />
        {/* Add source */}
        <button
          onClick={() => setShowUpload(true)}
          title="Add source"
          className="flex items-center justify-center w-9 h-9 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--surface-2)] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
        {/* Source icons */}
        {sources.slice(0, 12).map((src) => {
          const Icon = TYPE_ICON[src.type];
          return (
            <button
              key={src.id}
              title={src.title}
              onClick={onCollapse}
              className={cn("flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[var(--surface-2)] transition-colors", TYPE_COLOR[src.type])}
            >
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
        {showUpload && (
          <UploadModal notebookId={notebookId} onClose={() => setShowUpload(false)} onDone={() => setShowUpload(false)} />
        )}
      </div>
    );
  }

  return (
    <>
      <motion.aside
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="relative flex flex-col h-full w-full bg-[var(--surface-1)] border-r border-[var(--border)] overflow-hidden"
      >
        <div className="flex flex-col h-full w-full min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">{activeNotebook?.emoji ?? "📚"}</span>
              <p className="text-sm font-semibold text-text-primary truncate">
                {activeNotebook?.title ?? "Notebook"}
              </p>
            </div>
            <button
              onClick={onCollapse}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Add Source */}
          <div className="px-3 py-3 border-b border-border">
            <button
              onClick={() => setShowUpload(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-text-secondary hover:border-brand-primary/40 hover:text-brand-primary hover:bg-brand-primary/5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Source
            </button>
          </div>

          {/* Source selection toggle */}
          {sources.length > 0 && (
            <div className="px-3 py-2 border-b border-border">
              <button
                onClick={() => setSelectedSourceIds("all")}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  isAllSelected
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
                )}
              >
                <Layers className="w-3.5 h-3.5" />
                All Sources ({sources.length})
              </button>
            </div>
          )}

          {/* Source list */}
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2 py-2 space-y-0.5">
            {sources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FileText className="w-8 h-8 text-text-muted mb-2" />
                <p className="text-xs font-medium text-text-secondary">No sources yet</p>
                <p className="text-[11px] text-text-muted mt-1">
                  Upload PDFs, DOCX, or paste text to get started
                </p>
              </div>
            ) : (
              sources.map((src) => {
                const isSelected =
                  isAllSelected ||
                  (Array.isArray(selectedSourceIds) && selectedSourceIds.includes(src.id));
                return (
                  <SourceItem
                    key={src.id}
                    source={src}
                    isSelected={isSelected}
                    onToggle={() => toggleSourceSelect(src.id)}
                    onRename={(title) => renameSource.mutate({ id: src.id, title })}
                    onDelete={() => handleDelete(src.id, src.title)}
                  />
                );
              })
            )}
          </div>

          {/* Source count badge */}
          {sources.length > 0 && (
            <div className="px-4 py-2.5 border-t border-border">
              <p className="text-[11px] text-text-muted">
                {sources.length} source{sources.length !== 1 ? "s" : ""} ·{" "}
                {isAllSelected
                  ? "All selected"
                  : `${(selectedSourceIds as string[]).length} selected`}
              </p>
            </div>
          )}
        </div>
      </motion.aside>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            notebookId={notebookId}
            onClose={() => setShowUpload(false)}
            onDone={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
