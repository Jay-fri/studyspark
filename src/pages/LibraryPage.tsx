import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, X, Loader2, LayoutGrid, List,
  Download, Trash2, ArrowUpRight, ChevronDown,
} from "@/lib/icons";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import type { AIOutput, AIOutputType, Notebook } from "@/types";
import { LibraryCard, TYPE_META, getPreview } from "@/components/library/LibraryCard";
import { LibraryDetailModal } from "@/components/library/LibraryDetailModal";
import toast from "react-hot-toast";
import {
  exportQuizPDF, exportFlashcardsCSV,
  exportSummaryMarkdown, exportStudyGuidePDF,
} from "@/lib/exportUtils";

type SortMode  = "newest" | "oldest";
type ViewMode  = "grid" | "list";
type FilterKey = AIOutputType | "all";

const TYPE_ORDER: FilterKey[] = [
  "all", "summary", "quiz", "flashcards", "mindmap", "studyguide", "keyconcepts", "podcast",
];

interface NotebookSection {
  notebookId: string;
  notebook:   Notebook | undefined;
  outputs:    AIOutput[];
  latestAt:   number;
}

export default function LibraryPage() {
  const userId    = useAuthStore((s) => s.user?.id);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const qc        = useQueryClient();

  const [filter,    setFilter]    = useState<FilterKey>("all");
  const [sort,      setSort]      = useState<SortMode>("newest");
  const [search,    setSearch]    = useState("");
  const [view,      setView]      = useState<ViewMode>("grid");
  const [selected,  setSelected]  = useState<AIOutput | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { data: outputs = [], isLoading } = useQuery<AIOutput[]>({
    queryKey: ["library-outputs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const deleteOutput = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_outputs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library-outputs"] });
      toast.success("Deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  const handleExport = (output: AIOutput) => {
    const nb    = notebooks.find((n) => n.id === output.notebook_id);
    const title = nb?.title ?? "Notebook";
    const c     = output.content;
    if      (c.type === "quiz")       exportQuizPDF(c.questions, title);
    else if (c.type === "flashcards") exportFlashcardsCSV(c.cards, title);
    else if (c.type === "summary")    exportSummaryMarkdown(c.text, title);
    else if (c.type === "studyguide") exportStudyGuidePDF(c.sections, title);
    else toast("No export available for this type");
  };

  const allOutputs = useMemo(
    () => outputs.filter((o) => o.type !== "chat_history"),
    [outputs],
  );

  const countFor = (key: FilterKey) =>
    key === "all" ? allOutputs.length : allOutputs.filter((o) => o.type === key).length;

  const visibleTabs = TYPE_ORDER.filter((k) => k === "all" || countFor(k) > 0);

  const filtered = useMemo(() => {
    let result = allOutputs;
    if (filter !== "all") result = result.filter((o) => o.type === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const nb    = notebooks.find((n) => n.id === o.notebook_id);
        const label = `${nb?.title ?? ""} ${TYPE_META[o.type]?.label ?? ""}`.toLowerCase();
        const c     = o.content;
        let body    = "";
        if (c.type === "summary")     body = c.text ?? "";
        if (c.type === "podcast")     body = c.script ?? "";
        if (c.type === "studyguide")  body = c.sections?.map((s) => s.heading).join(" ") ?? "";
        if (c.type === "keyconcepts") body = c.concepts?.map((k) => k.term).join(" ") ?? "";
        return label.includes(q) || body.toLowerCase().includes(q);
      });
    }
    return result;
  }, [allOutputs, filter, search, notebooks]);

  // Group filtered outputs by notebook, sorted by most-recently-active section first
  const sections = useMemo<NotebookSection[]>(() => {
    const map = new Map<string, NotebookSection>();
    for (const output of filtered) {
      const key = output.notebook_id ?? "__orphaned__";
      if (!map.has(key)) {
        map.set(key, {
          notebookId: key,
          notebook:   notebooks.find((n) => n.id === output.notebook_id),
          outputs:    [],
          latestAt:   0,
        });
      }
      const s   = map.get(key)!;
      const ts  = new Date(output.updated_at).getTime();
      s.outputs.push(output);
      if (ts > s.latestAt) s.latestAt = ts;
    }
    // Sort outputs within each section
    for (const s of map.values()) {
      s.outputs.sort((a, b) =>
        sort === "oldest"
          ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }
    return Array.from(map.values()).sort((a, b) => b.latestAt - a.latestAt);
  }, [filtered, notebooks, sort]);

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedNotebook = selected
    ? notebooks.find((n) => n.id === selected.notebook_id)
    : undefined;

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="px-4 sm:px-6 lg:px-8 pt-6 pb-4"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-display" style={{ color: "var(--text-primary)" }}>
              Library
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
              {allOutputs.length === 0
                ? "No AI outputs yet"
                : `${allOutputs.length} output${allOutputs.length !== 1 ? "s" : ""} across ${sections.length} notebook${sections.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: "var(--text-muted)" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="w-44 sm:w-56 pl-9 pr-8 py-2 rounded-xl text-sm outline-none transition-colors"
                style={{
                  background: "var(--surface-2)",
                  border: "0.5px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--brand-primary)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div
              className="hidden sm:flex items-center gap-1 p-1 rounded-xl"
              style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}
            >
              <button
                onClick={() => setView("grid")}
                className="p-1.5 rounded-lg transition-all"
                style={
                  view === "grid"
                    ? { background: "var(--surface-0)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" }
                    : { color: "var(--text-dim)" }
                }
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView("list")}
                className="p-1.5 rounded-lg transition-all"
                style={
                  view === "list"
                    ? { background: "var(--surface-0)", color: "var(--text-primary)", boxShadow: "var(--shadow-sm)" }
                    : { color: "var(--text-dim)" }
                }
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Filter tabs + sort ────────────────────────────────────────────── */}
        {allOutputs.length > 0 && (
          <div id="tour-library-filter" className="flex items-center gap-1 overflow-x-auto scrollbar-none -mb-px">
            {visibleTabs.map((key) => {
              const isActive = filter === key;
              const meta     = key !== "all" ? TYPE_META[key] : null;
              return (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className="relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors shrink-0"
                  style={{ color: isActive ? "var(--brand-primary)" : "var(--text-muted)" }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-secondary)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  {meta ? `${meta.emoji} ${meta.label}` : "All"}
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={
                      isActive
                        ? { background: "rgba(249,115,22,0.12)", color: "var(--brand-primary)" }
                        : { background: "var(--surface-2)", color: "var(--text-dim)" }
                    }
                  >
                    {countFor(key)}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="library-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                      style={{ background: "var(--brand-primary)" }}
                    />
                  )}
                </button>
              );
            })}

            <div className="ml-auto pl-4 flex items-center gap-1 shrink-0">
              {(["newest", "oldest"] as SortMode[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSort(s)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors"
                  style={
                    sort === s
                      ? { background: "var(--surface-3)", color: "var(--text-primary)" }
                      : { color: "var(--text-dim)" }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 lg:px-8 py-6 space-y-8">

        {isLoading && (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--brand-primary)" }} />
          </div>
        )}

        {!isLoading && allOutputs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <p className="text-4xl mb-4">📚</p>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
              Your library is empty
            </h3>
            <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
              Open a notebook and generate a summary, quiz, or flashcards — they'll all appear here.
            </p>
          </motion.div>
        )}

        {!isLoading && allOutputs.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
              Nothing matches your filters
            </p>
            <button
              onClick={() => { setSearch(""); setFilter("all"); }}
              className="text-sm mt-1"
              style={{ color: "var(--brand-primary)" }}
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── Notebook sections ─────────────────────────────────────────── */}
        {!isLoading && sections.map((section) => {
          const nb          = section.notebook;
          const color       = nb?.color ?? "#6B7280";
          const isCollapsed = collapsed.has(section.notebookId);

          return (
            <motion.section
              key={section.notebookId}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Section header */}
              <div
                className="relative flex items-center gap-3 px-4 py-3 rounded-xl mb-4 overflow-hidden"
                style={
                  nb?.cover_image_url
                    ? { backgroundImage: `url(${nb.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center", border: `0.5px solid ${color}40` }
                    : { background: `${color}10`, border: `0.5px solid ${color}25` }
                }
              >
                {nb?.cover_image_url && (
                  <div className="absolute inset-0 rounded-xl" style={{ background: "rgba(5,12,25,0.62)" }} />
                )}
                <div
                  className="relative z-10 w-7 h-7 rounded-lg flex items-center justify-center text-base shrink-0 overflow-hidden"
                  style={nb?.icon_url ? undefined : { background: `${color}22` }}
                >
                  {nb?.icon_url
                    ? <img src={nb.icon_url} alt="" className="w-full h-full object-cover" />
                    : (nb?.emoji ?? "📚")
                  }
                </div>

                <button
                  onClick={() => toggleCollapse(section.notebookId)}
                  className="relative z-10 flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: nb?.cover_image_url ? "rgba(255,255,255,0.95)" : "var(--text-primary)" }}
                  >
                    {nb?.title ?? "Unknown notebook"}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                    style={{
                      background: nb?.cover_image_url ? "rgba(255,255,255,0.15)" : `${color}25`,
                      color: nb?.cover_image_url ? "rgba(255,255,255,0.9)" : color,
                    }}
                  >
                    {section.outputs.length}
                  </span>
                  <motion.div
                    animate={{ rotate: isCollapsed ? -90 : 0 }}
                    transition={{ duration: 0.18 }}
                    className="shrink-0 ml-0.5"
                  >
                    <ChevronDown className="w-3.5 h-3.5" style={{ color: nb?.cover_image_url ? "rgba(255,255,255,0.5)" : "var(--text-dim)" }} />
                  </motion.div>
                </button>

                {nb && (
                  <Link
                    to={`/notebooks/${nb.id}`}
                    className="relative z-10 flex items-center gap-1 text-xs shrink-0 px-2.5 py-1.5 rounded-lg font-medium transition-all"
                    style={{
                      color: nb.cover_image_url ? "rgba(255,255,255,0.85)" : color,
                      background: nb.cover_image_url ? "rgba(255,255,255,0.12)" : `${color}15`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = nb.cover_image_url ? "rgba(255,255,255,0.22)" : `${color}25`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = nb.cover_image_url ? "rgba(255,255,255,0.12)" : `${color}15`; }}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    Open
                  </Link>
                )}
              </div>

              {/* Section content */}
              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    {view === "grid" ? (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {section.outputs.map((output) => (
                          <LibraryCard
                            key={output.id}
                            output={output}
                            notebook={nb}
                            onOpen={setSelected}
                            onDelete={(id) => deleteOutput.mutate(id)}
                            onExport={handleExport}
                          />
                        ))}
                      </div>
                    ) : (
                      <div
                        className="rounded-2xl overflow-hidden"
                        style={{ background: "var(--surface-1)", border: `0.5px solid ${color}30` }}
                      >
                        {section.outputs.map((output, i) => {
                          const meta    = TYPE_META[output.type] ?? TYPE_META.summary;
                          const preview = getPreview(output);
                          const isLast  = i === section.outputs.length - 1;
                          return (
                            <div
                              key={output.id}
                              className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                              style={{
                                borderBottom: isLast ? "none" : "0.5px solid var(--border-subtle)",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = `${color}08`)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                              <div
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ background: color }}
                              />

                              <button
                                onClick={() => setSelected(output)}
                                className="flex-1 min-w-0 text-left flex items-center gap-4"
                              >
                                <span
                                  className="hidden sm:inline-flex shrink-0 items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
                                  style={{ background: meta.bg, color: meta.color }}
                                >
                                  {meta.emoji} {meta.label}
                                </span>
                                <div className="flex-1 min-w-0">
                                  {preview ? (
                                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>
                                      {preview}
                                    </p>
                                  ) : (
                                    <p className="text-sm" style={{ color: "var(--text-dim)" }}>
                                      {meta.label}
                                    </p>
                                  )}
                                </div>
                              </button>

                              <span className="text-xs shrink-0" style={{ color: "var(--text-dim)" }}>
                                {format(new Date(output.updated_at), "MMM d")}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleExport(output)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: "var(--text-dim)" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "var(--surface-3)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteOutput.mutate(output.id)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ color: "var(--text-dim)" }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--brand-danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}
      </div>

      <LibraryDetailModal
        output={selected}
        notebook={selectedNotebook}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
