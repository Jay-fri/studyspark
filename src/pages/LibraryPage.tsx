import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, SortDesc, Library, X, Loader2 } from "lucide-react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import type { AIOutput, AIOutputType } from "@/types";
import { cn } from "@/lib/utils";
import { LibraryCard, TYPE_META } from "@/components/library/LibraryCard";
import { LibraryDetailModal }   from "@/components/library/LibraryDetailModal";
import toast from "react-hot-toast";
import {
  exportQuizPDF, exportFlashcardsCSV,
  exportSummaryMarkdown, exportStudyGuidePDF,
} from "@/lib/exportUtils";

type SortMode = "newest" | "oldest" | "notebook";

const FILTER_TABS: { key: AIOutputType | "all"; label: string }[] = [
  { key: "all",        label: "All"          },
  { key: "summary",    label: "Summaries"    },
  { key: "quiz",       label: "Quizzes"      },
  { key: "flashcards", label: "Flashcards"   },
  { key: "mindmap",    label: "Mind Maps"    },
  { key: "studyguide", label: "Study Guides" },
  { key: "keyconcepts",label: "Key Concepts" },
  { key: "podcast",    label: "Podcasts"     },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "newest",   label: "Newest"   },
  { key: "oldest",   label: "Oldest"   },
  { key: "notebook", label: "Notebook" },
];

export default function LibraryPage() {
  const userId    = useAuthStore((s) => s.user?.id);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const qc        = useQueryClient();

  const [filter, setFilter]   = useState<AIOutputType | "all">("all");
  const [sort, setSort]       = useState<SortMode>("newest");
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState<AIOutput | null>(null);

  const { data: outputs = [], isLoading } = useQuery<AIOutput[]>({
    queryKey: ["library-outputs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
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
    if (c.type === "quiz")           exportQuizPDF(c.questions, title);
    else if (c.type === "flashcards")    exportFlashcardsCSV(c.cards, title);
    else if (c.type === "summary")       exportSummaryMarkdown(c.text, title);
    else if (c.type === "studyguide")    exportStudyGuidePDF(c.sections, title);
    else toast("No export available for this type");
  };

  // Filter + sort + search
  const filtered = useMemo(() => {
    let result = outputs.filter((o) => o.type !== "chat_history");

    if (filter !== "all") result = result.filter((o) => o.type === filter);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) => {
        const nb = notebooks.find((n) => n.id === o.notebook_id);
        const title  = `${nb?.title ?? ""} ${TYPE_META[o.type]?.label ?? ""}`.toLowerCase();
        const c = o.content;
        let body = "";
        if (c.type === "summary")     body = c.text ?? "";
        if (c.type === "podcast")     body = c.script ?? "";
        if (c.type === "studyguide")  body = c.sections?.map((s) => s.heading).join(" ") ?? "";
        if (c.type === "keyconcepts") body = c.concepts?.map((k) => k.term).join(" ") ?? "";
        return title.includes(q) || body.toLowerCase().includes(q);
      });
    }

    return [...result].sort((a, b) => {
      if (sort === "newest") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      if (sort === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      // by notebook
      const nbA = notebooks.find((n) => n.id === a.notebook_id)?.title ?? "";
      const nbB = notebooks.find((n) => n.id === b.notebook_id)?.title ?? "";
      return nbA.localeCompare(nbB);
    });
  }, [outputs, filter, sort, search, notebooks]);

  const totalByType = (type: AIOutputType | "all") =>
    type === "all" ? outputs.filter((o) => o.type !== "chat_history").length
    : outputs.filter((o) => o.type === type).length;

  const selectedNotebook = selected ? notebooks.find((n) => n.id === selected.notebook_id) : undefined;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display text-[var(--text-primary)]">My Library</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          All your AI-generated study materials in one place
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library…"
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <SortDesc className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <div className="flex rounded-xl border border-[var(--border)] overflow-hidden">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  sort === opt.key
                    ? "bg-[var(--brand-primary)] text-white"
                    : "bg-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap mb-6">
        {FILTER_TABS.map((tab) => {
          const count = totalByType(tab.key);
          if (tab.key !== "all" && count === 0) return null;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                filter === tab.key
                  ? "bg-[var(--brand-primary)] text-white shadow-sm"
                  : "bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/30 hover:text-[var(--text-primary)]"
              )}
            >
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-[10px] font-semibold",
                filter === tab.key ? "bg-white/20 text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 text-[var(--brand-primary)] animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] text-center"
        >
          <Library className="w-10 h-10 text-[var(--text-muted)] mb-3" />
          <h3 className="text-base font-medium text-[var(--text-primary)] mb-1">
            {search ? "No results found" : filter === "all" ? "No outputs yet" : `No ${filter}s yet`}
          </h3>
          <p className="text-sm text-[var(--text-muted)] max-w-xs">
            {search ? "Try a different search term" : "Open a notebook and generate AI content to build your library"}
          </p>
        </motion.div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filtered.map((output) => (
              <LibraryCard
                key={output.id}
                output={output}
                notebook={notebooks.find((n) => n.id === output.notebook_id)}
                onOpen={setSelected}
                onDelete={(id) => deleteOutput.mutate(id)}
                onExport={handleExport}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Detail modal */}
      <LibraryDetailModal
        output={selected}
        notebook={selectedNotebook}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
