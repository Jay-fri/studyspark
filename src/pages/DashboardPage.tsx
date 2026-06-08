import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSRS } from "@/hooks/useSRS";
import {
  Plus,
  Upload,
  BookMarked,
  Sparkles,
  FileText,
  Zap,
  TrendingUp,
  ChevronRight,
  BookOpen,
  ClipboardList,
  Brain,
  Repeat2,
} from "lucide-react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { useUIStore } from "@/stores/uiStore";
import type { AIOutput } from "@/types";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 28 } },
};

const OUTPUT_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  summary:     { icon: FileText,    label: "Summary",     color: "text-brand-primary"   },
  quiz:        { icon: ClipboardList, label: "Quiz",      color: "text-brand-warning"   },
  flashcards:  { icon: BookOpen,    label: "Flashcards",  color: "text-brand-accent"    },
  mindmap:     { icon: Brain,       label: "Mind Map",    color: "text-brand-secondary" },
  studyguide:  { icon: BookMarked,  label: "Study Guide", color: "text-brand-primary"   },
  keyconcepts: { icon: Sparkles,    label: "Key Concepts",color: "text-brand-accent"    },
  podcast:     { icon: Sparkles,    label: "Podcast",     color: "text-brand-secondary" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

// Circular token arc (same as sidebar)
function TokenArc({ balance, max = 1000 }: { balance: number; max?: number }) {
  const r             = 22;
  const circumference = 2 * Math.PI * r;
  const pct           = Math.min(balance / max, 1);
  const offset        = circumference * (1 - pct);
  const strokeColor =
    balance < 50  ? "var(--brand-danger)"
    : balance < 100 ? "var(--brand-warning)"
    : "var(--brand-primary)";

  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
      <motion.circle
        cx="28" cy="28" r={r}
        fill="none"
        stroke={strokeColor}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </svg>
  );
}

export default function DashboardPage() {
  const profile         = useAuthStore((s) => s.profile);
  const notebooks       = useNotebookStore((s) => s.notebooks);
  const { setPaymentModalOpen } = useUIStore();
  const { getDueCards } = useSRS();

  const userId = profile?.id;
  const balance = profile?.study_tokens ?? 0;
  const firstName = profile?.full_name?.split(" ")[0] ?? "Student";
  const today = format(new Date(), "EEEE, MMMM d");

  // Recent AI outputs for activity feed
  const { data: recentOutputs = [] } = useQuery<AIOutput[]>({
    queryKey: ["recent-outputs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Source count
  const { data: sourceCount = 0 } = useQuery<number>({
    queryKey: ["source-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sources")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  // Total due flashcards across all outputs
  const { data: allFlashcardOutputs = [] } = useQuery({
    queryKey: ["flashcard-outputs-srs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs").select("*").eq("type", "flashcards");
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const totalDue = useMemo(() => {
    let count = 0;
    for (const o of allFlashcardOutputs) {
      if (o.content.type === "flashcards") count += getDueCards(o.content.cards).length;
    }
    return count;
  }, [allFlashcardOutputs, getDueCards]);

  const recentNotebooks = useMemo(() => notebooks.slice(0, 4), [notebooks]);

  const stats = [
    { label: "Notebooks",  value: notebooks.length,          icon: BookMarked,  color: "text-brand-primary"   },
    { label: "AI Outputs", value: recentOutputs.length,      icon: Sparkles,    color: "text-brand-secondary" },
    { label: "Sources",    value: sourceCount,                icon: FileText,    color: "text-brand-accent"    },
    { label: "Tokens Left",value: balance.toLocaleString(),   icon: Zap,         color: "text-brand-warning"   },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">

      {/* Welcome banner */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-display text-text-primary">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="text-sm text-text-muted mt-0.5">{today}</p>
        </div>
        <Link
          to="/notebooks"
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Notebook
        </Link>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

        {/* Stats row */}
        <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-surface-1 border border-border rounded-2xl p-4 shadow-sm"
            >
              <stat.icon className={`w-5 h-5 mb-3 ${stat.color}`} />
              <p className="text-2xl font-display text-text-primary">{stat.value}</p>
              <p className="text-xs text-text-muted mt-0.5">{stat.label}</p>
            </div>
          ))}
        </motion.div>

        {/* SRS Review Banner */}
        {totalDue > 0 && (
          <motion.div variants={item}>
            <Link
              to="/study/review"
              className="flex items-center gap-4 p-4 rounded-2xl bg-[var(--brand-primary)]/8 border border-[var(--brand-primary)]/25 hover:border-[var(--brand-primary)]/50 hover:bg-[var(--brand-primary)]/12 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)]/15 flex items-center justify-center shrink-0">
                <Repeat2 className="w-5 h-5 text-[var(--brand-primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--brand-primary)]">
                  {totalDue} flashcard{totalDue !== 1 ? "s" : ""} due for review
                </p>
                <p className="text-xs text-text-muted">
                  Keep your memory fresh with spaced repetition
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--brand-primary)] group-hover:translate-x-1 transition-transform shrink-0" />
            </Link>
          </motion.div>
        )}

        {/* Two-column section: token card + quick actions */}
        <motion.div variants={item} className="grid sm:grid-cols-2 gap-4">

          {/* Token status card */}
          <div className="bg-surface-1 border border-border rounded-2xl p-5 flex items-center gap-5">
            <div className="relative flex items-center justify-center">
              <TokenArc balance={balance} />
              <span
                className={cn(
                  "absolute text-[11px] font-bold",
                  balance < 50 ? "text-brand-danger" : balance < 100 ? "text-brand-warning" : "text-brand-primary"
                )}
              >
                {balance >= 1000 ? `${Math.floor(balance / 1000)}k` : balance}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {balance.toLocaleString()} tokens
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {balance < 50
                  ? "Critically low — top up now"
                  : balance < 200
                  ? "Running low"
                  : "Available balance"}
              </p>
              <button
                onClick={() => setPaymentModalOpen(true)}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                <Zap className="w-3 h-3" />
                Top Up
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { to: "/notebooks",           icon: Plus,   label: "New Notebook",    bg: "bg-brand-primary/10",   color: "text-brand-primary"   },
              { to: "/upload",              icon: Upload, label: "Upload Source",    bg: "bg-brand-secondary/10", color: "text-brand-secondary" },
              { to: "/library",             icon: BookOpen,  label: "Browse Library",bg: "bg-brand-accent/10",    color: "text-brand-accent"    },
              { to: "/notebooks",           icon: TrendingUp,label: "View Progress", bg: "bg-brand-warning/10",   color: "text-brand-warning"   },
            ].map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface-1 border border-border hover:border-brand-primary/30 hover:shadow-sm transition-all group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${action.bg}`}>
                  <action.icon className={`w-4.5 h-4.5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary text-center leading-tight">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Recent notebooks */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-text-primary">Recent Notebooks</h2>
            <Link to="/notebooks" className="flex items-center gap-1 text-xs text-brand-primary hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {recentNotebooks.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recentNotebooks.map((nb) => (
                <Link
                  key={nb.id}
                  to={`/notebooks/${nb.id}`}
                  className="group relative flex flex-col rounded-2xl border border-border bg-surface-1 overflow-hidden hover:border-brand-primary/40 hover:shadow-md transition-all"
                >
                  {/* Color bar */}
                  <div
                    className="h-1.5 w-full shrink-0"
                    style={{ backgroundColor: nb.color || "var(--brand-primary)" }}
                  />
                  <div className="p-4 flex-1">
                    <div className="text-2xl mb-2">{nb.emoji || "📚"}</div>
                    <p className="text-sm font-semibold text-text-primary truncate group-hover:text-brand-primary transition-colors">
                      {nb.title}
                    </p>
                    {nb.description && (
                      <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                        {nb.description}
                      </p>
                    )}
                    <p className="text-[10px] text-text-muted mt-2">
                      {format(new Date(nb.updated_at), "MMM d")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border bg-surface-1 text-center">
              <BookMarked className="w-8 h-8 text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-primary">No notebooks yet</p>
              <p className="text-xs text-text-muted mt-1 mb-4">
                Create a notebook to organise your study materials
              </p>
              <Link
                to="/notebooks"
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Notebook
              </Link>
            </div>
          )}
        </motion.div>

        {/* Recent activity */}
        {recentOutputs.length > 0 && (
          <motion.div variants={item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
              <Link to="/library" className="flex items-center gap-1 text-xs text-brand-primary hover:underline">
                Library <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentOutputs.slice(0, 5).map((ao) => {
                const meta = OUTPUT_META[ao.type] ?? OUTPUT_META.summary;
                const nb   = notebooks.find((n) => n.id === ao.notebook_id);
                const Icon = meta.icon;
                return (
                  <Link
                    key={ao.id}
                    to={`/notebooks/${ao.notebook_id}`}
                    className="flex items-center gap-3 p-3.5 rounded-xl bg-surface-1 border border-border hover:border-brand-primary/30 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary">
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">
                        {nb?.title ?? "Unknown notebook"}
                      </p>
                    </div>
                    <p className="text-[10px] text-text-muted shrink-0">
                      {format(new Date(ao.updated_at), "MMM d")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
}
