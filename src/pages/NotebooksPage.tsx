import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  BookMarked,
  Loader2,
  X,
  Search,
  MoreVertical,
  Pencil,
  Copy,
  Trash2,
  Check,
  SortAsc,
} from "lucide-react";
import { useNotebooks } from "@/hooks/useNotebook";
import { useNotebookStore } from "@/stores/notebookStore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/types";
import toast from "react-hot-toast";

const EMOJI_OPTIONS = ["📚", "📖", "🧠", "🔬", "💡", "📝", "🎯", "🏆", "⚗️", "🌐", "🧮", "📊", "🔭", "💻", "🎨"];
const COLOR_OPTIONS = [
  "#E07B1A", "#C4630E", "#10B981", "#F59E0B",
  "#EF4444", "#3B82F6", "#EC4899", "#14B8A6",
];

// ── Create / Edit modal ──────────────────────────────────────────────────────
function NotebookModal({
  initial,
  title: heading,
  onClose,
  onSave,
}: {
  initial?: Partial<Notebook>;
  title:    string;
  onClose:  () => void;
  onSave:   (data: Pick<Notebook, "title" | "description" | "emoji" | "color">) => Promise<void>;
}) {
  const [title,       setTitle]     = useState(initial?.title       ?? "");
  const [description, setDesc]      = useState(initial?.description ?? "");
  const [emoji,       setEmoji]     = useState(initial?.emoji       ?? "📚");
  const [color,       setColor]     = useState(initial?.color       ?? "#E07B1A");
  const [submitting,  setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSave({ title: title.trim(), description: description.trim() || null, emoji, color });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md bg-surface-0 border border-border rounded-2xl shadow-2xl overflow-hidden"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <h2 className="text-base font-semibold text-text-primary">{heading}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Emoji */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Emoji</label>
            <div className="flex flex-wrap gap-1.5">
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={cn(
                    "w-9 h-9 rounded-lg text-lg transition-all",
                    emoji === e ? "ring-2 ring-brand-primary bg-brand-primary/10 scale-110" : "hover:bg-surface-1"
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-2">Color</label>
            <div className="flex gap-2">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={cn(
                    "w-7 h-7 rounded-full transition-all",
                    color === c ? "ring-2 ring-offset-2 ring-offset-surface-0 scale-110" : "hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              placeholder="e.g. Biochemistry 301"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">
              Description <span className="text-text-muted">(optional)</span>
            </label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="What is this notebook for?"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors resize-none"
            />
          </div>

          {/* Preview */}
          <div
            className="flex items-center gap-3 p-3 rounded-xl border border-border"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}
          >
            <span className="text-2xl">{emoji}</span>
            <div>
              <p className="text-sm font-medium text-text-primary">{title || "Notebook title"}</p>
              <p className="text-xs text-text-muted">{description || "Your description"}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-text-secondary hover:bg-surface-1 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Quick-action dropdown per card ───────────────────────────────────────────
function CardMenu({
  nb: _nb,
  onClose,
  onRename,
  onDuplicate,
  onDelete,
}: {
  nb:          Notebook;
  onClose:     () => void;
  onRename:    () => void;
  onDuplicate: () => void;
  onDelete:    () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const items = [
    { icon: Pencil, label: "Rename",    action: onRename,    danger: false },
    { icon: Copy,   label: "Duplicate", action: onDuplicate, danger: false },
    { icon: Trash2, label: "Delete",    action: onDelete,    danger: true  },
  ];

  return (
    <div
      ref={ref}
      className="absolute top-10 right-2 z-30 w-40 bg-surface-0 border border-border rounded-xl shadow-lg py-1 overflow-hidden"
    >
      {items.map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); action(); onClose(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors text-left",
            danger
              ? "text-brand-danger hover:bg-brand-danger/10"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
          )}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.04 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
};

type SortKey = "recent" | "name";

export default function NotebooksPage() {
  const [showCreate,    setShowCreate]    = useState(false);
  const [renamingNb,    setRenamingNb]    = useState<Notebook | null>(null);
  const [activeMenuId,  setActiveMenuId]  = useState<string | null>(null);
  const [search,        setSearch]        = useState("");
  const [sortBy,        setSortBy]        = useState<SortKey>("recent");

  const { isLoading, patchNotebook, deleteNotebook, duplicateNotebook, createNotebook } = useNotebooks();
  const notebooks = useNotebookStore((s) => s.notebooks);

  const filtered = useMemo(() => {
    let list = [...notebooks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((nb) => nb.title.toLowerCase().includes(q));
    }
    if (sortBy === "name") {
      list = list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [notebooks, search, sortBy]);

  const handleDelete = (nb: Notebook) => {
    toast((t) => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete &ldquo;{nb.title}&rdquo;?</span>
        <button
          onClick={() => { deleteNotebook.mutate(nb.id); toast.dismiss(t.id); }}
          className="px-2 py-1 rounded-lg bg-brand-danger text-white text-xs font-medium"
        >
          Delete
        </button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs text-text-muted">Cancel</button>
      </div>
    ), { duration: 5000 });
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-display text-text-primary">Notebooks</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {notebooks.length} notebook{notebooks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Notebook</span>
          <span className="sm:hidden">New</span>
        </motion.button>
      </div>

      {/* Search + Sort bar */}
      {notebooks.length > 0 && (
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notebooks…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface-1 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-brand-primary transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 border border-border rounded-xl p-1 bg-surface-1 shrink-0">
            {(["recent", "name"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize",
                  sortBy === key
                    ? "bg-brand-primary/10 text-brand-primary"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                <SortAsc className="w-3 h-3" />
                {key === "recent" ? "Recent" : "A–Z"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notebooks.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border bg-surface-1 text-center"
        >
          <BookMarked className="w-10 h-10 text-text-muted mb-3" />
          <h3 className="text-base font-medium text-text-primary mb-1">No notebooks yet</h3>
          <p className="text-sm text-text-muted mb-5 max-w-xs">
            Create your first notebook to organise your study materials
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Create Notebook
          </button>
        </motion.div>
      )}

      {/* No results for search */}
      {!isLoading && notebooks.length > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-8 h-8 text-text-muted mb-2" />
          <p className="text-sm text-text-secondary">No notebooks match &ldquo;{search}&rdquo;</p>
          <button onClick={() => setSearch("")} className="mt-2 text-xs text-brand-primary hover:underline">
            Clear search
          </button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {filtered.map((nb) => (
            <motion.div key={nb.id} variants={cardItem} className="relative group">
              {/* Card */}
              <div className="flex flex-col h-full rounded-2xl border border-border bg-surface-1 overflow-hidden hover:border-brand-primary/40 hover:shadow-lg transition-all duration-200">
                {/* Color accent bar */}
                <div
                  className="h-1.5 w-full shrink-0"
                  style={{ backgroundColor: nb.color || "#E07B1A" }}
                />

                {/* Card body — navigates to notebook */}
                <Link to={`/notebooks/${nb.id}`} className="p-5 flex-1 flex flex-col min-h-[120px]">
                  <div className="text-3xl mb-3">{nb.emoji || "📚"}</div>
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-primary transition-colors mb-1 pr-6">
                    {nb.title}
                  </p>
                  {nb.description && (
                    <p className="text-xs text-text-muted line-clamp-2 flex-1">{nb.description}</p>
                  )}
                  <p className="text-[10px] text-text-muted mt-3">
                    Updated {format(new Date(nb.updated_at), "MMM d, yyyy")}
                  </p>
                </Link>
              </div>

              {/* Quick-action button — floats over card */}
              <div className="absolute top-5 right-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setActiveMenuId((id) => (id === nb.id ? null : nb.id));
                  }}
                  className={cn(
                    "p-1 rounded-lg transition-all",
                    activeMenuId === nb.id
                      ? "bg-surface-2 text-text-primary"
                      : "opacity-0 group-hover:opacity-100 text-text-muted hover:text-text-primary hover:bg-surface-2"
                  )}
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {activeMenuId === nb.id && (
                  <CardMenu
                    nb={nb}
                    onClose={() => setActiveMenuId(null)}
                    onRename={() => setRenamingNb(nb)}
                    onDuplicate={() => {
                      duplicateNotebook.mutate(nb);
                      toast.success("Notebook duplicated!");
                    }}
                    onDelete={() => handleDelete(nb)}
                  />
                )}
              </div>
            </motion.div>
          ))}

          {/* Add new card */}
          <motion.div variants={cardItem}>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-all text-text-muted hover:text-brand-primary"
            >
              <Plus className="w-6 h-6" />
              <span className="text-sm font-medium">New Notebook</span>
            </button>
          </motion.div>
        </motion.div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <NotebookModal
            title="New Notebook"
            onClose={() => setShowCreate(false)}
            onSave={(data) => createNotebook.mutateAsync({ ...data }).then(() => {})}
          />
        )}
      </AnimatePresence>

      {/* Rename modal */}
      <AnimatePresence>
        {renamingNb && (
          <NotebookModal
            title="Rename Notebook"
            initial={renamingNb}
            onClose={() => setRenamingNb(null)}
            onSave={(data) =>
              patchNotebook.mutateAsync({ id: renamingNb.id, ...data }).then(() => {})
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
