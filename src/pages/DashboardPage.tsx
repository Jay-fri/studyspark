import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useSRS } from "@/hooks/useSRS";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { useUIStore } from "@/stores/uiStore";
import type { AIOutput } from "@/types";
import toast from "react-hot-toast";

const stagger = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 360, damping: 30 } },
};

const OUTPUT_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  summary:     { label: "Summary",      emoji: "📄", color: "#F97316", bg: "rgba(249,115,22,0.10)"  },
  quiz:        { label: "Quiz",         emoji: "✏️",  color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  flashcards:  { label: "Flashcards",   emoji: "🃏", color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  mindmap:     { label: "Mind map",     emoji: "🕸️",  color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  studyguide:  { label: "Study guide",  emoji: "📋", color: "#F97316", bg: "rgba(249,115,22,0.10)"  },
  keyconcepts: { label: "Key concepts", emoji: "💡", color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  podcast:     { label: "Podcast",      emoji: "🎙️",  color: "#EC4899", bg: "rgba(236,72,153,0.10)"  },
};

function greeting(name: string) {
  const h = new Date().getHours();
  const g = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${g}, ${name}.`;
}

function TokenBar({ balance, max = 1000 }: { balance: number; max?: number }) {
  const pct = Math.min((balance / max) * 100, 100);
  const color = balance < 50 ? "#EF4444" : balance < 200 ? "#F59E0B" : "#10B981";
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: `${color}20` }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const profile               = useAuthStore((s) => s.profile);
  const notebooks             = useNotebookStore((s) => s.notebooks);
  const { setPaymentModalOpen } = useUIStore();
  const { getDueCards }       = useSRS();
  const [searchParams, setSearchParams] = useSearchParams();

  // Show a toast if redirected here from PaymentCallbackPage (e.g. 3DS card flow)
  useEffect(() => {
    const payment = searchParams.get("payment");
    if (!payment) return;
    if (payment === "success") {
      toast.success("Payment received! Tokens will be credited shortly.");
    } else if (payment === "cancelled") {
      toast("Payment cancelled.", { icon: "ℹ️" });
    } else {
      toast.error("Payment was not completed — please try again.");
    }
    // Remove the query param so it doesn't re-fire on refresh
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userId    = profile?.id;
  const balance   = profile?.study_tokens ?? 0;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const today     = format(new Date(), "EEEE, MMMM d");

  const { data: recentOutputs = [] } = useQuery<AIOutput[]>({
    queryKey: ["recent-outputs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs").select("*")
        .order("updated_at", { ascending: false }).limit(6);
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const { data: sourceCount = 0 } = useQuery<number>({
    queryKey: ["source-count", userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("sources").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

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

  const recentNotebooks = useMemo(() => notebooks.slice(0, 3), [notebooks]);

  const tokenLabel =
    balance < 50  ? "Critically low — top up now" :
    balance < 200 ? "Running low" :
    "Tokens available";

  const tokenColor =
    balance < 50  ? "#EF4444" :
    balance < 200 ? "#F59E0B" :
    "#10B981";

  // Summary text for subtitle
  const summaryParts: string[] = [];
  if (notebooks.length)   summaryParts.push(`${notebooks.length} notebook${notebooks.length !== 1 ? "s" : ""}`);
  if (recentOutputs.length) summaryParts.push(`${recentOutputs.length} AI output${recentOutputs.length !== 1 ? "s" : ""}`);
  if (sourceCount)        summaryParts.push(`${sourceCount} source${sourceCount !== 1 ? "s" : ""}`);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-8">

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} className="pt-2">
          <p className="text-sm" style={{ color: "var(--text-dim)" }}>{today}</p>
          <h1 className="text-3xl sm:text-4xl font-display mt-1 leading-tight" style={{ color: "var(--text-primary)" }}>
            {greeting(firstName)}
          </h1>
          {summaryParts.length > 0 && (
            <p className="text-base mt-2" style={{ color: "var(--text-muted)" }}>
              {summaryParts.join(" · ")}
            </p>
          )}

          {/* Quick actions — emoji pills */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { to: "/notebooks", label: "New notebook", emoji: "📚" },
              { to: "/library",   label: "My library",   emoji: "🗂️" },
              ...(totalDue > 0 ? [{ to: "/study/review", label: `Review ${totalDue} cards`, emoji: "🔁" }] : []),
            ].map(a => (
              <Link
                key={a.label}
                to={a.to}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:-translate-y-px"
                style={{
                  background: "var(--surface-2)",
                  color: "var(--text-secondary)",
                  border: "0.5px solid var(--border)",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "var(--surface-3)";
                  e.currentTarget.style.borderColor = "var(--brand-primary)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = "var(--surface-2)";
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <span>{a.emoji}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* ── Token strip ────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-5"
            style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-display" style={{ color: tokenColor }}>
                  {balance.toLocaleString()}
                </span>
                <span className="text-xs" style={{ color: tokenColor }}>
                  {tokenLabel}
                </span>
              </div>
              <TokenBar balance={balance} />
            </div>
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="shrink-0 px-4 py-2 rounded-xl text-white text-sm font-semibold gradient-brand hover:opacity-90 transition-opacity"
            >
              Top up
            </button>
          </div>
        </motion.div>

        {/* ── Flashcard review banner ─────────────────────────────────────── */}
        {totalDue > 0 && (
          <motion.div variants={fadeUp}>
            <Link
              to="/study/review"
              className="flex items-center justify-between gap-4 px-5 py-4 rounded-2xl group transition-all"
              style={{
                background: "rgba(249,115,22,0.06)",
                border: "0.5px solid rgba(249,115,22,0.2)",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(249,115,22,0.2)"}
            >
              <div>
                <p className="text-base font-semibold" style={{ color: "var(--brand-primary)" }}>
                  🔁  {totalDue} flashcard{totalDue !== 1 ? "s" : ""} due for review
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Keep your streak — takes just a few minutes
                </p>
              </div>
              <ChevronRight
                className="w-5 h-5 shrink-0 group-hover:translate-x-0.5 transition-transform"
                style={{ color: "var(--brand-primary)" }}
              />
            </Link>
          </motion.div>
        )}

        {/* ── Recent notebooks ────────────────────────────────────────────── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Recent notebooks
            </h2>
            <Link
              to="/notebooks"
              className="text-sm font-medium hover:underline flex items-center gap-1"
              style={{ color: "var(--brand-primary)" }}
            >
              All notebooks <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentNotebooks.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-3">
              {recentNotebooks.map(nb => {
                const color = nb.color || "#F97316";
                return (
                  <Link
                    key={nb.id}
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
                    {/* Colored header zone */}
                    <div className="px-5 pt-5 pb-4" style={{ background: `${color}0f` }}>
                      <span className="text-2xl leading-none block">{nb.emoji || "📚"}</span>
                      <p className="mt-2.5 text-sm font-semibold leading-snug line-clamp-2"
                        style={{ color: "var(--text-primary)" }}>
                        {nb.title}
                      </p>
                    </div>
                    <div className="px-5 py-3 flex items-center justify-between"
                      style={{ borderTop: "0.5px solid var(--border-subtle)" }}>
                      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
                        {formatDistanceToNow(new Date(nb.updated_at), { addSuffix: true })}
                      </p>
                      <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div
              className="py-14 rounded-2xl flex flex-col items-center justify-center text-center"
              style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
            >
              <p className="text-3xl mb-3">📚</p>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No notebooks yet</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Create your first to get started
              </p>
              <Link
                to="/notebooks"
                className="mt-5 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Create notebook
              </Link>
            </div>
          )}
        </motion.div>

        {/* ── Recent activity ─────────────────────────────────────────────── */}
        {recentOutputs.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Recent activity</h2>
              <Link
                to="/library"
                className="text-sm font-medium hover:underline flex items-center gap-1"
                style={{ color: "var(--brand-primary)" }}
              >
                Library <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--surface-1)", border: "0.5px solid var(--border)" }}
            >
              {recentOutputs.slice(0, 5).map((ao, i) => {
                const meta = OUTPUT_LABELS[ao.type] ?? OUTPUT_LABELS.summary;
                const nb   = notebooks.find(n => n.id === ao.notebook_id);
                const isLast = i === Math.min(recentOutputs.length, 5) - 1;
                return (
                  <Link
                    key={ao.id}
                    to={`/notebooks/${ao.notebook_id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{ borderBottom: isLast ? "none" : "0.5px solid var(--border-subtle)" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {/* Type badge */}
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.emoji} {meta.label}
                    </span>

                    {/* Notebook title */}
                    <p className="flex-1 text-sm truncate" style={{ color: "var(--text-secondary)" }}>
                      {nb?.title ?? "—"}
                    </p>

                    {/* Date */}
                    <p className="text-xs shrink-0" style={{ color: "var(--text-dim)" }}>
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
