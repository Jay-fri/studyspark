import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, X, Search,
  Pencil, Copy, Trash2, LayoutGrid, List,
} from "lucide-react";
import { useNotebooks } from "@/hooks/useNotebook";
import { useNotebookStore } from "@/stores/notebookStore";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notebook } from "@/types";
import toast from "react-hot-toast";

const EMOJI_OPTIONS = ["📚","📖","🧠","🔬","💡","📝","🎯","🏆","⚗️","🌐","🧮","📊","🔭","💻","🎨","✏️","🔖","🗒️","🔑","🌿"];
const COLOR_OPTIONS = [
  { hex: "#F97316", name: "Orange"  },
  { hex: "#10B981", name: "Emerald" },
  { hex: "#3B82F6", name: "Blue"    },
  { hex: "#8B5CF6", name: "Violet"  },
  { hex: "#EC4899", name: "Pink"    },
  { hex: "#F59E0B", name: "Amber"   },
  { hex: "#EF4444", name: "Red"     },
  { hex: "#14B8A6", name: "Teal"    },
];

// ── Modal ─────────────────────────────────────────────────────────────────────
function NotebookModal({
  initial, title: heading, onClose, onSave,
}: {
  initial?: Partial<Notebook>;
  title:   string;
  onClose: () => void;
  onSave:  (data: Pick<Notebook, "title"|"description"|"emoji"|"color">) => Promise<void>;
}) {
  const [title,       setTitle]    = useState(initial?.title       ?? "");
  const [desc,        setDesc]     = useState(initial?.description ?? "");
  const [emoji,       setEmoji]    = useState(initial?.emoji       ?? "📚");
  const [color,       setColor]    = useState(initial?.color       ?? "#F97316");
  const [submitting,  setSub]      = useState(false);
  const [showEmojis,  setShowEmojis] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSub(true);
    try {
      await onSave({ title: title.trim(), description: desc.trim() || null, emoji, color });
      onClose();
    } finally { setSub(false); }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden"
        style={{ background: "var(--surface-0)", border: "0.5px solid var(--border)" }}
        initial={{ opacity: 0, y: 56, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 56, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full z-10 transition-colors"
          style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Hero — emoji + color picker */}
        <div
          className="pt-10 pb-6 flex flex-col items-center gap-4"
          style={{ background: `${color}10` }}
        >
          {/* Big emoji — click to toggle picker */}
          <button
            onClick={() => setShowEmojis(v => !v)}
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-5xl shadow-md transition-transform hover:scale-105 active:scale-95"
            style={{ background: color, boxShadow: `0 8px 24px ${color}40` }}
          >
            {emoji}
          </button>

          <p className="text-xs" style={{ color: `${color}cc` }}>
            {showEmojis ? "Pick an icon" : "Tap to change icon"}
          </p>

          {/* Emoji picker — horizontal scrollable row */}
          <AnimatePresence>
            {showEmojis && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="w-full overflow-hidden"
              >
                <div className="flex gap-2 px-5 overflow-x-auto scrollbar-none py-1">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => { setEmoji(e); setShowEmojis(false); }}
                      className="w-10 h-10 rounded-xl text-xl shrink-0 transition-all"
                      style={emoji === e
                        ? { background: color, transform: "scale(1.1)" }
                        : { background: "var(--surface-2)" }
                      }
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Color swatches */}
          <div className="flex gap-2.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c.hex}
                onClick={() => setColor(c.hex)}
                className="w-6 h-6 rounded-full transition-all"
                title={c.name}
                style={{
                  backgroundColor: c.hex,
                  transform: color === c.hex ? "scale(1.3)" : "scale(1)",
                  outline: color === c.hex ? `2px solid ${c.hex}` : "none",
                  outlineOffset: "2px",
                  boxShadow: color === c.hex ? `0 2px 8px ${c.hex}60` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSave()}
            placeholder={heading === "New Notebook" ? "Name your notebook…" : "Notebook title"}
            autoFocus
            className="w-full px-0 py-1.5 text-lg font-semibold outline-none bg-transparent border-b transition-colors"
            style={{
              borderBottomColor: title ? color : "var(--border)",
              color: "var(--text-primary)",
            }}
            onFocus={e => e.currentTarget.style.borderBottomColor = color}
            onBlur={e => e.currentTarget.style.borderBottomColor = title ? color : "var(--border)"}
          />

          {/* Description */}
          <textarea
            value={desc ?? ""}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="Short description (optional)"
            className="w-full px-0 py-1 text-sm outline-none bg-transparent resize-none border-b"
            style={{
              borderBottomColor: "var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!title.trim() || submitting}
            className="w-full py-3 rounded-2xl text-white text-sm font-semibold disabled:opacity-40 transition-all hover:opacity-90 flex items-center justify-center gap-2"
            style={{ background: color, boxShadow: `0 4px 16px ${color}40` }}
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : heading === "New Notebook" ? "Create notebook" : "Save changes"
            }
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Card context menu ─────────────────────────────────────────────────────────
function CardMenu({
  nb: _nb, onClose, onRename, onDuplicate, onDelete,
}: {
  nb: Notebook; onClose: () => void; onRename: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-30 w-44 rounded-xl py-1.5 shadow-xl overflow-hidden"
      style={{ background: "var(--surface-0)", border: "0.5px solid var(--border)" }}
    >
      {[
        { icon: Pencil, label: "Rename",    action: onRename,    danger: false },
        { icon: Copy,   label: "Duplicate", action: onDuplicate, danger: false },
        { icon: Trash2, label: "Delete",    action: onDelete,    danger: true  },
      ].map(({ icon: Icon, label, action, danger }) => (
        <button
          key={label}
          onClick={e => { e.preventDefault(); e.stopPropagation(); action(); onClose(); }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
          style={{ color: danger ? "var(--brand-danger)" : "var(--text-secondary)" }}
          onMouseEnter={e => e.currentTarget.style.background = danger ? "rgba(239,68,68,0.08)" : "var(--surface-1)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Notebook card (grid) ──────────────────────────────────────────────────────
function GridCard({
  nb, onRename, onDuplicate, onDelete, menuOpen, onMenuToggle,
}: {
  nb: Notebook; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
}) {
  const color = nb.color || "#F97316";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative group"
    >
      <Link
        to={`/notebooks/${nb.id}`}
        className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "var(--surface-1)",
          border: "0.5px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = "var(--shadow-md)"}
        onMouseLeave={e => e.currentTarget.style.boxShadow = "var(--shadow-sm)"}
      >
        {/* Card header — colored zone */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ background: `${color}0f` }}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-3xl leading-none">{nb.emoji || "📚"}</span>
            {/* placeholder so title doesn't overlap menu button */}
            <div className="w-6 shrink-0" />
          </div>
          <p
            className="mt-3 text-sm font-semibold leading-snug line-clamp-2"
            style={{ color: "var(--text-primary)" }}
          >
            {nb.title}
          </p>
        </div>

        {/* Card body */}
        <div className="px-5 py-3.5 flex-1 flex flex-col justify-between gap-3">
          {nb.description ? (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
              {nb.description}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: "var(--text-dim)" }}>No description</p>
          )}
          <div className="flex items-center justify-between pt-1" style={{ borderTop: "0.5px solid var(--border-subtle)" }}>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {formatDistanceToNow(new Date(nb.updated_at), { addSuffix: true })}
            </span>
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          </div>
        </div>
      </Link>

      {/* Menu trigger */}
      <div className="absolute top-4 right-4">
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuToggle(); }}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-lg transition-all text-xs",
            "opacity-100"
          )}
          style={{ color: "var(--text-muted)", background: menuOpen ? "var(--surface-2)" : `${color}20` }}
        >
          ···
        </button>
        {menuOpen && (
          <CardMenu
            nb={nb} onClose={onMenuToggle}
            onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete}
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Notebook row (list) ───────────────────────────────────────────────────────
function ListRow({
  nb, onRename, onDuplicate, onDelete, menuOpen, onMenuToggle,
}: {
  nb: Notebook; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
}) {
  const color = nb.color || "#F97316";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative group"
    >
      <Link
        to={`/notebooks/${nb.id}`}
        className="flex items-center gap-4 px-5 py-4 transition-colors"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
        onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {/* Color dot + emoji */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
          style={{ background: `${color}18` }}
        >
          {nb.emoji || "📚"}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {nb.title}
          </p>
          {nb.description && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>
              {nb.description}
            </p>
          )}
        </div>

        <div className="text-right shrink-0 pr-8">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {format(new Date(nb.updated_at), "MMM d")}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>
            {format(new Date(nb.updated_at), "yyyy")}
          </p>
        </div>
      </Link>

      {/* Menu */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuToggle(); }}
          className={cn(
            "w-7 h-7 flex items-center justify-center rounded-lg transition-all",
            "opacity-100"
          )}
          style={{ color: "var(--text-muted)", background: menuOpen ? "var(--surface-3)" : "transparent" }}
        >
          ···
        </button>
        {menuOpen && (
          <CardMenu
            nb={nb} onClose={onMenuToggle}
            onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete}
          />
        )}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type SortKey  = "recent" | "name";
type ViewMode = "grid" | "list";

export default function NotebooksPage() {
  const navigate = useNavigate();
  const [showCreate,   setShowCreate]   = useState(false);
  const [renamingNb,   setRenamingNb]   = useState<Notebook | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [search,       setSearch]       = useState("");
  const [sortBy,       setSortBy]       = useState<SortKey>("recent");
  const [view,         setView]         = useState<ViewMode>("grid");

  const { isLoading, patchNotebook, deleteNotebook, duplicateNotebook, createNotebook } = useNotebooks();
  const notebooks = useNotebookStore(s => s.notebooks);

  const filtered = useMemo(() => {
    let list = [...notebooks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(nb => nb.title.toLowerCase().includes(q) || (nb.description ?? "").toLowerCase().includes(q));
    }
    if (sortBy === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [notebooks, search, sortBy]);

  const handleDelete = (nb: Notebook) => {
    toast(t => (
      <div className="flex items-center gap-3">
        <span className="text-sm">Delete &ldquo;{nb.title}&rdquo;?</span>
        <button
          onClick={() => { deleteNotebook.mutate(nb.id); toast.dismiss(t.id); }}
          className="px-2.5 py-1 rounded-lg text-white text-xs font-semibold"
          style={{ background: "var(--brand-danger)" }}
        >Delete</button>
        <button onClick={() => toast.dismiss(t.id)} className="text-xs" style={{ color: "var(--text-muted)" }}>
          Cancel
        </button>
      </div>
    ), { duration: 5000 });
  };

  const menuToggle = (id: string) =>
    setActiveMenuId(prev => (prev === id ? null : id));

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-5" style={{ borderBottom: "0.5px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-display" style={{ color: "var(--text-primary)" }}>My Notebooks</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {notebooks.length === 0
                ? "No notebooks yet"
                : `${notebooks.length} notebook${notebooks.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold gradient-brand shadow-sm hover:opacity-90 transition-opacity shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Notebook</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {/* Search + controls */}
        {notebooks.length > 0 && (
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-1)",
                  border: "0.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "var(--brand-primary)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
              {(["recent", "name"] as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={sortBy === key
                    ? { background: "var(--brand-primary)", color: "#fff" }
                    : { color: "var(--text-muted)" }
                  }
                >
                  {key === "recent" ? "Recent" : "A–Z"}
                </button>
              ))}
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
              <button
                onClick={() => setView("grid")}
                className="p-1.5 rounded-lg transition-all"
                style={view === "grid"
                  ? { background: "var(--surface-3)", color: "var(--text-primary)" }
                  : { color: "var(--text-muted)" }
                }
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-1.5 rounded-lg transition-all"
                style={view === "list"
                  ? { background: "var(--surface-3)", color: "var(--text-primary)" }
                  : { color: "var(--text-muted)" }
                }
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notebooks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-3xl"
              style={{ background: "rgba(249,115,22,0.1)" }}
            >
              📚
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Start your first notebook
            </h3>
            <p className="text-sm max-w-xs mb-6" style={{ color: "var(--text-muted)" }}>
              Upload your notes, slides or PDFs and let AI help you study smarter.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl gradient-brand text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Notebook
            </button>
          </motion.div>
        )}

        {/* No search results */}
        {!isLoading && notebooks.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 mb-3" style={{ color: "var(--text-dim)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              No notebooks match &ldquo;{search}&rdquo;
            </p>
            <button
              onClick={() => setSearch("")}
              className="text-sm mt-1 hover:underline"
              style={{ color: "var(--brand-primary)" }}
            >
              Clear search
            </button>
          </div>
        )}

        {/* Grid view */}
        {!isLoading && filtered.length > 0 && view === "grid" && (
          <AnimatePresence>
            <motion.div
              className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
              layout
            >
              {filtered.map(nb => (
                <GridCard
                  key={nb.id}
                  nb={nb}
                  menuOpen={activeMenuId === nb.id}
                  onMenuToggle={() => menuToggle(nb.id)}
                  onRename={() => { setRenamingNb(nb); setActiveMenuId(null); }}
                  onDuplicate={() => { duplicateNotebook.mutate(nb); toast.success("Notebook duplicated!"); setActiveMenuId(null); }}
                  onDelete={() => { handleDelete(nb); setActiveMenuId(null); }}
                />
              ))}

              {/* New notebook tile */}
              <motion.button
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowCreate(true)}
                className="min-h-[160px] flex flex-col items-center justify-center gap-3 rounded-2xl transition-all"
                style={{ border: "1px dashed var(--border)", color: "var(--text-dim)" }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = "var(--brand-primary)";
                  e.currentTarget.style.color = "var(--brand-primary)";
                  e.currentTarget.style.background = "rgba(249,115,22,0.04)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-dim)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "var(--surface-2)" }}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">New Notebook</span>
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}

        {/* List view */}
        {!isLoading && filtered.length > 0 && view === "list" && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
          >
            <AnimatePresence>
              {filtered.map(nb => (
                <ListRow
                  key={nb.id}
                  nb={nb}
                  menuOpen={activeMenuId === nb.id}
                  onMenuToggle={() => menuToggle(nb.id)}
                  onRename={() => { setRenamingNb(nb); setActiveMenuId(null); }}
                  onDuplicate={() => { duplicateNotebook.mutate(nb); toast.success("Notebook duplicated!"); setActiveMenuId(null); }}
                  onDelete={() => { handleDelete(nb); setActiveMenuId(null); }}
                />
              ))}
            </AnimatePresence>

            {/* Add row */}
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "var(--surface-2)";
                e.currentTarget.style.color = "var(--brand-primary)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-dim)";
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--surface-2)" }}>
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">New Notebook</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreate && (
          <NotebookModal
            title="New Notebook"
            onClose={() => setShowCreate(false)}
            onSave={data => createNotebook.mutateAsync({ ...data }).then(nb => {
              navigate(`/notebooks/${nb.id}`);
            })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {renamingNb && (
          <NotebookModal
            title="Edit Notebook"
            initial={renamingNb}
            onClose={() => setRenamingNb(null)}
            onSave={data => patchNotebook.mutateAsync({ id: renamingNb.id, ...data }).then(() => {})}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
