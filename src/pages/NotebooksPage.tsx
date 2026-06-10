import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { activeTour } from "@/hooks/useTour";
import {
  Plus, Loader2, X, Search,
  Pencil, Copy, Trash2, LayoutGrid, List, ImagePlus,
} from "@/lib/icons";
import { useNotebooks } from "@/hooks/useNotebook";
import { useNotebookStore } from "@/stores/notebookStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { format, formatDistanceToNow } from "date-fns";
import type { Notebook } from "@/types";
import toast from "react-hot-toast";

// ── Design tokens ─────────────────────────────────────────────────────────────
const EMOJI_OPTIONS = [
  "📚","📖","🧠","🔬","💡","📝","🎯","🏆","⚗️","🌐",
  "🧮","📊","🔭","💻","🎨","✏️","🔖","🗒️","🔑","🌿",
  "🧬","🦠","⚡","🌍","🏛️","🎭","🎵","🧪","🔐","🌟",
  "🪐","🔮","🧲","📡","🗺️","🧩","🎲","💎","🌊","🔥",
];

const COLOR_OPTIONS = [
  { hex: "#38E0C3", name: "Mint"    },
  { hex: "#F97316", name: "Orange"  },
  { hex: "#10B981", name: "Emerald" },
  { hex: "#3B82F6", name: "Blue"    },
  { hex: "#8B5CF6", name: "Violet"  },
  { hex: "#EC4899", name: "Pink"    },
  { hex: "#F59E0B", name: "Amber"   },
  { hex: "#EF4444", name: "Red"     },
];

// 24 educational-themed cover presets via picsum (seed-based = always same photo)
const COVER_PRESETS = [
  "https://picsum.photos/seed/study/600/220",
  "https://picsum.photos/seed/books/600/220",
  "https://picsum.photos/seed/science/600/220",
  "https://picsum.photos/seed/math/600/220",
  "https://picsum.photos/seed/library/600/220",
  "https://picsum.photos/seed/research/600/220",
  "https://picsum.photos/seed/campus/600/220",
  "https://picsum.photos/seed/laboratory/600/220",
  "https://picsum.photos/seed/coding/600/220",
  "https://picsum.photos/seed/biology/600/220",
  "https://picsum.photos/seed/chemistry/600/220",
  "https://picsum.photos/seed/physics/600/220",
  "https://picsum.photos/seed/astronomy/600/220",
  "https://picsum.photos/seed/medicine/600/220",
  "https://picsum.photos/seed/engineering/600/220",
  "https://picsum.photos/seed/history/600/220",
  "https://picsum.photos/seed/geography/600/220",
  "https://picsum.photos/seed/architecture/600/220",
  "https://picsum.photos/seed/writing/600/220",
  "https://picsum.photos/seed/philosophy/600/220",
  "https://picsum.photos/seed/psychology/600/220",
  "https://picsum.photos/seed/economics/600/220",
  "https://picsum.photos/seed/art/600/220",
  "https://picsum.photos/seed/music/600/220",
  "https://picsum.photos/seed/language/600/220",
  "https://picsum.photos/seed/technology/600/220",
  "https://picsum.photos/seed/graduate/600/220",
  "https://picsum.photos/seed/notebook/600/220",
  "https://picsum.photos/seed/university/600/220",
  "https://picsum.photos/seed/anatomy/600/220",
];

// ── Upload helpers ────────────────────────────────────────────────────────────
async function uploadNotebookAsset(
  userId: string,
  file: File,
  kind: "covers" | "icons"
): Promise<string> {
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from("notebook-assets")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("notebook-assets").getPublicUrl(path);
  return data.publicUrl;
}

// ── Notebook creation / edit modal ────────────────────────────────────────────
function NotebookModal({
  initial, title: heading, onClose, onSave,
}: {
  initial?: Partial<Notebook>;
  title:   string;
  onClose: () => void;
  onSave:  (data: Pick<Notebook, "title"|"description"|"emoji"|"color"|"cover_image_url"|"icon_url">) => Promise<void>;
}) {
  const userId = useAuthStore((s) => s.user?.id);

  const [title,          setTitle]          = useState(initial?.title         ?? "");
  const [desc,           setDesc]           = useState(initial?.description   ?? "");
  const [emoji,          setEmoji]          = useState(initial?.emoji         ?? "📚");
  const [color,          setColor]          = useState(initial?.color         ?? "#38E0C3");
  const [coverUrl,       setCoverUrl]       = useState<string | null>(initial?.cover_image_url ?? null);
  const [iconUrl,        setIconUrl]        = useState<string | null>(initial?.icon_url ?? null);
  const [submitting,     setSub]            = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [iconUploading,  setIconUploading]  = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  // Use opacity-0 + overflow-hidden instead of display:none so iOS Safari fires the click
  const coverInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef  = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSub(true);
    try {
      await onSave({
        title:           title.trim(),
        description:     desc.trim() || null,
        emoji,
        color,
        cover_image_url: coverUrl ?? null,
        icon_url:        iconUrl  ?? null,
      });
      onClose();
    } finally { setSub(false); }
  };

  const handleCoverUpload = async (file: File) => {
    if (!userId) return;
    setCoverUploading(true);
    try {
      const url = await uploadNotebookAsset(userId, file, "covers");
      setCoverUrl(url);
    } catch { toast.error("Cover upload failed"); }
    finally { setCoverUploading(false); }
  };

  const handleIconUpload = async (file: File) => {
    if (!userId) return;
    setIconUploading(true);
    try {
      const url = await uploadNotebookAsset(userId, file, "icons");
      setIconUrl(url);
    } catch { toast.error("Icon upload failed"); }
    finally { setIconUploading(false); }
  };

  return (
    <>
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-[84px] sm:px-0 sm:pb-0"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        className="relative w-full sm:max-w-[440px] sm:mx-4 rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: "#0f1e35",
          border: "0.5px solid rgba(255,255,255,0.08)",
          maxHeight: "min(80dvh, calc(100dvh - 68px - env(safe-area-inset-bottom, 0px)))",
        }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        {/* ── Cover zone ─────────────────────────────────────────────────── */}
        <div className="relative shrink-0">
          {/* Background layer (image or tint) */}
          <div
            className="h-[110px] sm:h-[170px] w-full"
            style={coverUrl
              ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)` }
            }
          />
          {/* Dark scrim on photo */}
          {coverUrl && (
            <div className="absolute inset-0" style={{ background: "rgba(5,12,25,0.55)" }} />
          )}

          {/* Top-right controls */}
          <div className="absolute top-3 right-3 flex gap-1.5 z-10">
            <button
              onClick={() => setShowCoverPicker(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all"
              style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.85)", backdropFilter: "blur(10px)" }}
            >
              <ImagePlus className="w-3 h-3" />
              {coverUrl ? "Change" : "Add cover"}
            </button>
            {coverUrl && (
              <button
                onClick={() => setCoverUrl(null)}
                className="px-2.5 py-1.5 rounded-xl text-[11px] font-medium transition-all"
                style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.5)", backdropFilter: "blur(10px)" }}
              >
                Remove
              </button>
            )}
            <button
              onClick={onClose}
              className="w-[28px] h-[28px] rounded-xl flex items-center justify-center transition-all"
              style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)" }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Icon — overlaps cover bottom edge */}
          <div className="absolute" style={{ bottom: "-30px", left: "24px", zIndex: 20 }}>
            <div
              className="relative w-[60px] h-[60px] rounded-2xl flex items-center justify-center text-3xl overflow-hidden transition-all cursor-pointer"
              style={iconUrl
                ? { border: "3px solid #0f1e35" }
                : { background: color, boxShadow: `0 4px 20px ${color}40`, border: "3px solid #0f1e35" }
              }
              onClick={() => iconInputRef.current?.click()}
              title="Upload icon"
            >
              {iconUrl
                ? <img src={iconUrl} alt="" className="w-full h-full object-cover" />
                : <span>{emoji}</span>
              }
              {/* Upload overlay hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-[13px]" style={{ background: "rgba(0,0,0,0.55)" }}>
                <ImagePlus className="w-4 h-4 text-white" />
              </div>
              {iconUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-[13px]" style={{ background: "rgba(0,0,0,0.65)" }}>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">

          {/* ── Cover picker (collapses) ──────────────────────────────────── */}
          <AnimatePresence>
            {showCoverPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <div className="px-4 sm:px-5 pt-5 pb-4 space-y-4">
                  {/* Color accents */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Accent color
                    </p>
                    <div className="flex gap-2.5 flex-wrap">
                      {COLOR_OPTIONS.map(c => (
                        <button
                          key={c.hex}
                          onClick={() => setColor(c.hex)}
                          title={c.name}
                          className="w-7 h-7 rounded-full transition-all shrink-0"
                          style={{
                            background: c.hex,
                            transform: color === c.hex ? "scale(1.25)" : "scale(1)",
                            outline: color === c.hex ? `2px solid ${c.hex}` : "none",
                            outlineOffset: "2px",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Preset images */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Photo covers
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {COVER_PRESETS.map((url) => (
                        <button
                          key={url}
                          onClick={() => { setCoverUrl(url); setShowCoverPicker(false); }}
                          className="relative aspect-video rounded-lg overflow-hidden transition-all"
                          style={{
                            outline: coverUrl === url ? `2px solid ${color}` : "0.5px solid rgba(255,255,255,0.1)",
                            outlineOffset: coverUrl === url ? "2px" : "0",
                          }}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Upload custom cover */}
                  <button
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                    className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl w-full justify-center transition-all"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "0.5px dashed rgba(255,255,255,0.15)",
                      color: "rgba(255,255,255,0.5)",
                    }}
                  >
                    {coverUploading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
                      : <><ImagePlus className="w-3.5 h-3.5" />Upload your own cover</>
                    }
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Emoji picker — open by default ───────────────────────────── */}
          <div className="px-4 sm:px-5" style={{ paddingTop: "46px", borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}>
            <div className="pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                Choose icon
              </p>
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 mb-3">
                {EMOJI_OPTIONS.map(e => (
                  <button
                    key={e}
                    onClick={() => { setEmoji(e); setIconUrl(null); }}
                    className="aspect-square rounded-xl text-lg flex items-center justify-center transition-all"
                    style={emoji === e && !iconUrl
                      ? { background: color, transform: "scale(1.12)" }
                      : { background: "rgba(255,255,255,0.06)" }
                    }
                  >
                    {e}
                  </button>
                ))}
              </div>
              <button
                onClick={() => iconInputRef.current?.click()}
                disabled={iconUploading}
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl w-full justify-center transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px dashed rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.5)",
                }}
              >
                {iconUploading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</>
                  : <><ImagePlus className="w-3.5 h-3.5" />Upload custom image</>
                }
              </button>
            </div>
          </div>

          {/* ── Form ──────────────────────────────────────────────────────── */}
          <div className="px-4 sm:px-5 py-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Notebook name
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSave()}
                placeholder="e.g. Organic Chemistry, WAEC Prep…"
                autoFocus
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: title ? `0.5px solid ${color}60` : "0.5px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.95)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = `${color}80`}
                onBlur={e => e.currentTarget.style.borderColor = title ? `${color}60` : "rgba(255,255,255,0.1)"}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                Description <span style={{ color: "rgba(255,255,255,0.2)" }}>(optional)</span>
              </label>
              <textarea
                value={desc}
                onChange={e => setDesc(e.target.value)}
                rows={2}
                placeholder="What are you studying?"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.75)",
                }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"}
                onBlur={e => e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"}
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!title.trim() || submitting}
              className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-35 transition-all flex items-center justify-center gap-2"
              style={{ background: title.trim() ? color : "rgba(255,255,255,0.08)", color: title.trim() ? "#0a1628" : "rgba(255,255,255,0.3)" }}
            >
              {submitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : heading === "New Notebook" ? "Create Notebook" : "Save Changes"
              }
            </button>


          </div>
        </div>

      </motion.div>
    </motion.div>

    {/* File inputs portalled to document.body so Android Chrome isn't blocked by overflow:hidden ancestors */}
    {createPortal(
      <>
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); e.target.value = ""; }}
          style={{ position: "fixed", opacity: 0, width: 0, height: 0, pointerEvents: "none", top: 0, left: 0 }}
          tabIndex={-1}
        />
        <input
          ref={iconInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = ""; }}
          style={{ position: "fixed", opacity: 0, width: 0, height: 0, pointerEvents: "none", top: 0, left: 0 }}
          tabIndex={-1}
        />
      </>,
      document.body
    )}
    </>
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

// ── Grid card ─────────────────────────────────────────────────────────────────
function GridCard({
  nb, onRename, onDuplicate, onDelete, menuOpen, onMenuToggle, tourId, onTourClick,
}: {
  nb: Notebook; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
  tourId?: string; onTourClick?: () => void;
}) {
  const color = nb.color || "#38E0C3";
  return (
    <motion.div
      layout
      id={tourId}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 340, damping: 28 }}
      className="relative group"
    >
      <Link
        to={`/notebooks/${nb.id}`}
        onClick={onTourClick}
        className="flex flex-col rounded-2xl overflow-hidden transition-all duration-150"
        style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(56,224,195,0.2)")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {/* Header */}
        <div
          className="relative h-20 overflow-hidden"
          style={nb.cover_image_url
            ? { backgroundImage: `url(${nb.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: `${color}14` }
          }
        >
          {nb.cover_image_url && (
            <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
          )}
          <div className="absolute bottom-3 left-4 z-10">
            {nb.icon_url ? (
              <div className="w-9 h-9 rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(255,255,255,0.25)" }}>
                <img src={nb.icon_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <span className="text-2xl leading-none">{nb.emoji || "📚"}</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
          <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: "var(--text-primary)" }}>
            {nb.title}
          </p>
          {nb.description ? (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--text-muted)" }}>
              {nb.description}
            </p>
          ) : (
            <p className="text-xs italic" style={{ color: "var(--text-dim)" }}>No description</p>
          )}
          <div className="flex items-center justify-between mt-1" style={{ borderTop: "0.5px solid var(--border-subtle)", paddingTop: "8px" }}>
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {formatDistanceToNow(new Date(nb.updated_at), { addSuffix: true })}
            </span>
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          </div>
        </div>
      </Link>

      {/* Menu trigger */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuToggle(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all text-xs"
          style={{
            color: nb.cover_image_url ? "rgba(255,255,255,0.8)" : "var(--text-muted)",
            background: nb.cover_image_url ? "rgba(0,0,0,0.35)" : (menuOpen ? "var(--surface-2)" : `${color}20`),
          }}
        >
          ···
        </button>
        {menuOpen && (
          <CardMenu nb={nb} onClose={onMenuToggle} onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete} />
        )}
      </div>
    </motion.div>
  );
}

// ── List row ──────────────────────────────────────────────────────────────────
function ListRow({
  nb, onRename, onDuplicate, onDelete, menuOpen, onMenuToggle,
}: {
  nb: Notebook; onRename: () => void; onDuplicate: () => void; onDelete: () => void;
  menuOpen: boolean; onMenuToggle: () => void;
}) {
  const color = nb.color || "#38E0C3";
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
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
          style={nb.icon_url ? undefined : { background: `${color}18` }}
        >
          {nb.icon_url
            ? <img src={nb.icon_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-xl">{nb.emoji || "📚"}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{nb.title}</p>
          {nb.description && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{nb.description}</p>
          )}
        </div>
        <div className="text-right shrink-0 pr-8">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>{format(new Date(nb.updated_at), "MMM d")}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-dim)" }}>{format(new Date(nb.updated_at), "yyyy")}</p>
        </div>
      </Link>
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); onMenuToggle(); }}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-all"
          style={{ color: "var(--text-muted)", background: menuOpen ? "var(--surface-3)" : "transparent" }}
        >···</button>
        {menuOpen && (
          <CardMenu nb={nb} onClose={onMenuToggle} onRename={onRename} onDuplicate={onDuplicate} onDelete={onDelete} />
        )}
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type SortKey  = "recent" | "name";
type ViewMode = "grid" | "list";

export default function NotebooksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreate,   setShowCreate]   = useState(() => searchParams.get("create") === "1");
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

  const menuToggle = (id: string) => setActiveMenuId(prev => (prev === id ? null : id));

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-5" style={{ borderBottom: "0.5px solid var(--border-subtle)" }}>
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-display" style={{ color: "var(--text-primary)" }}>My Notebooks</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {notebooks.length === 0 ? "No notebooks yet" : `${notebooks.length} notebook${notebooks.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shrink-0 transition-all"
            style={{ background: "#38E0C3", color: "#0a1628" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Notebook</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        {notebooks.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-muted)" }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-sm outline-none transition-colors"
                style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(56,224,195,0.5)"}
                onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
              {(["recent", "name"] as SortKey[]).map(key => (
                <button key={key} onClick={() => setSortBy(key)} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={sortBy === key ? { background: "rgba(56,224,195,0.15)", color: "#38E0C3" } : { color: "var(--text-muted)" }}>
                  {key === "recent" ? "Recent" : "A–Z"}
                </button>
              ))}
            </div>

            <div className="hidden sm:flex items-center gap-1 rounded-xl p-1" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
              <button onClick={() => setView("grid")} className="p-1.5 rounded-lg transition-all"
                style={view === "grid" ? { background: "var(--surface-3)", color: "var(--text-primary)" } : { color: "var(--text-muted)" }}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setView("list")} className="p-1.5 rounded-lg transition-all"
                style={view === "list" ? { background: "var(--surface-3)", color: "var(--text-primary)" } : { color: "var(--text-muted)" }}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#38E0C3" }} />
          </div>
        )}

        {!isLoading && notebooks.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 text-3xl" style={{ background: "rgba(56,224,195,0.08)" }}>
              📚
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Start your first notebook</h3>
            <p className="text-sm max-w-xs mb-6" style={{ color: "var(--text-muted)" }}>
              Upload your notes, slides or PDFs and let AI help you study smarter.
            </p>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "#38E0C3", color: "#0a1628" }}>
              <Plus className="w-4 h-4" />Create Notebook
            </button>
          </motion.div>
        )}

        {!isLoading && notebooks.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 mb-3" style={{ color: "var(--text-dim)" }} />
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              No notebooks match &ldquo;{search}&rdquo;
            </p>
            <button onClick={() => setSearch("")} className="text-sm mt-1 hover:underline" style={{ color: "#38E0C3" }}>
              Clear search
            </button>
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === "grid" && (
          <AnimatePresence>
            <motion.div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" layout>
              {filtered.map((nb, idx) => (
                <GridCard key={nb.id} nb={nb} menuOpen={activeMenuId === nb.id} onMenuToggle={() => menuToggle(nb.id)}
                  onRename={() => { setRenamingNb(nb); setActiveMenuId(null); }}
                  onDuplicate={() => { duplicateNotebook.mutate(nb); toast.success("Notebook duplicated!"); setActiveMenuId(null); }}
                  onDelete={() => { handleDelete(nb); setActiveMenuId(null); }}
                  tourId={idx === 0 ? "tour-notebook-demo-card" : undefined}
                  onTourClick={idx === 0 ? () => { if (activeTour.isActive) setTimeout(activeTour.moveNext, 1100); } : undefined}
                />
              ))}
              <motion.button layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => setShowCreate(true)}
                className="min-h-[160px] flex flex-col items-center justify-center gap-3 rounded-2xl transition-all"
                style={{ border: "1px dashed var(--border)", color: "var(--text-dim)" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(56,224,195,0.35)"; e.currentTarget.style.color = "#38E0C3"; e.currentTarget.style.background = "rgba(56,224,195,0.04)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--surface-2)" }}>
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">New Notebook</span>
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}

        {!isLoading && filtered.length > 0 && view === "list" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}>
            <AnimatePresence>
              {filtered.map(nb => (
                <ListRow key={nb.id} nb={nb} menuOpen={activeMenuId === nb.id} onMenuToggle={() => menuToggle(nb.id)}
                  onRename={() => { setRenamingNb(nb); setActiveMenuId(null); }}
                  onDuplicate={() => { duplicateNotebook.mutate(nb); toast.success("Notebook duplicated!"); setActiveMenuId(null); }}
                  onDelete={() => { handleDelete(nb); setActiveMenuId(null); }}
                />
              ))}
            </AnimatePresence>
            <button onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "#38E0C3"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--surface-2)" }}>
                <Plus className="w-4 h-4" />
              </div>
              <span className="font-medium">New Notebook</span>
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <NotebookModal
            title="New Notebook"
            onClose={() => setShowCreate(false)}
            onSave={data => createNotebook.mutateAsync({ ...data }).then(nb => {
              if (nb?.id) navigate(`/notebooks/${nb.id}`);
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
