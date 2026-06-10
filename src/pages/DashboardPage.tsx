import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { useSRS } from "@/hooks/useSRS";
import { ChevronRight, Layers } from "@/lib/icons";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { useUIStore } from "@/stores/uiStore";
import type { AIOutput } from "@/types";
import toast from "react-hot-toast";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 360, damping: 30 },
  },
};

const OUTPUT_LABELS: Record<
  string,
  { label: string; emoji: string; color: string; bg: string }
> = {
  summary: {
    label: "Summary",
    emoji: "📄",
    color: "#F97316",
    bg: "rgba(249,115,22,0.10)",
  },
  quiz: {
    label: "Quiz",
    emoji: "✏️",
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.10)",
  },
  flashcards: {
    label: "Flashcards",
    emoji: "🃏",
    color: "#10B981",
    bg: "rgba(16,185,129,0.10)",
  },
  mindmap: {
    label: "Mind map",
    emoji: "🕸️",
    color: "#8B5CF6",
    bg: "rgba(139,92,246,0.10)",
  },
  studyguide: {
    label: "Study guide",
    emoji: "📋",
    color: "#F97316",
    bg: "rgba(249,115,22,0.10)",
  },
  keyconcepts: {
    label: "Key concepts",
    emoji: "💡",
    color: "#3B82F6",
    bg: "rgba(59,130,246,0.10)",
  },
  podcast: {
    label: "Podcast",
    emoji: "🎙️",
    color: "#EC4899",
    bg: "rgba(236,72,153,0.10)",
  },
};

function greeting(name: string) {
  const h = new Date().getHours();
  const g =
    h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return `${g}, ${name}.`;
}

function TokenBar({ balance, max = 1000 }: { balance: number; max?: number }) {
  const pct = Math.min((balance / max) * 100, 100);
  return (
    <div className="w-full h-[3px] rounded-full overflow-hidden dark:bg-[rgba(56,224,195,0.1)] bg-surface-2">
      <motion.div
        className="h-full rounded-full dark:bg-[#38E0C3] bg-brand-primary"
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const profile = useAuthStore((s) => s.profile);
  const notebooks = useNotebookStore((s) => s.notebooks);
  const { setPaymentModalOpen } = useUIStore();
  const { getDueCards } = useSRS();
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

  const userId = profile?.id;
  const balance = profile?.study_tokens ?? 0;
  const max = 1000;
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const today = format(new Date(), "EEEE, MMMM d");

  const { data: recentOutputs = [] } = useQuery<AIOutput[]>({
    queryKey: ["recent-outputs", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_outputs")
        .select("*")
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false })
        .limit(6);
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
        .from("sources")
        .select("*", { count: "exact", head: true });
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
        .from("ai_outputs")
        .select("*")
        .eq("user_id", userId!)
        .eq("type", "flashcards");
      if (error) throw error;
      return (data ?? []) as AIOutput[];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });

  const totalDue = useMemo(() => {
    let count = 0;
    for (const o of allFlashcardOutputs) {
      const c = o.content as { type?: string; cards?: unknown[] } | null;
      if (c?.type === "flashcards" && Array.isArray(c.cards))
        count += getDueCards(c.cards as never).length;
    }
    return count;
  }, [allFlashcardOutputs, getDueCards]);

  const recentNotebooks = useMemo(() => notebooks.slice(0, 3), [notebooks]);

  // Summary text for subtitle
  const summaryParts: string[] = [];
  if (notebooks.length)
    summaryParts.push(
      `${notebooks.length} notebook${notebooks.length !== 1 ? "s" : ""}`,
    );
  if (recentOutputs.length)
    summaryParts.push(
      `${recentOutputs.length} AI output${recentOutputs.length !== 1 ? "s" : ""}`,
    );
  if (sourceCount)
    summaryParts.push(`${sourceCount} source${sourceCount !== 1 ? "s" : ""}`);

  return (
    <div className="relative px-5 sm:px-6 lg:px-8 py-6 max-w-5xl mx-auto">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* ── Mobile greeting — hidden on md+ since Navbar shows the breadcrumb there ── */}
        <motion.div variants={fadeUp} className="mb-5 md:hidden">
          <p
            className="text-[12px] font-medium"
            style={{ color: "var(--text-dim)" }}>
            {today}
          </p>
          <h1
            className="text-[30px] font-medium leading-tight mt-0.5"
            style={{ color: "var(--text-primary)" }}>
            {greeting(firstName)}
          </h1>
        </motion.div>

        {/* ── Mobile summary meta ── */}
        {summaryParts.length > 0 && (
          <p
            className="text-[11.5px] mb-5 md:hidden"
            style={{ color: "var(--text-muted)" }}>
            {summaryParts.join(" · ")}
          </p>
        )}

        {/* ── Desktop greeting ── */}
        <motion.div variants={fadeUp} className="hidden md:block mb-6 pt-2">
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            {today}
          </p>
          <h1
            className="text-3xl sm:text-4xl font-medium mt-1 leading-tight"
            style={{ color: "var(--text-primary)" }}>
            {greeting(firstName)}
          </h1>
          {summaryParts.length > 0 && (
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              {summaryParts.join(" · ")}
            </p>
          )}
        </motion.div>

        {/* ── Quick action pills ── */}
        <motion.div variants={fadeUp} className="flex flex-wrap gap-2 mb-5">
          {/* Primary pill */}
          <Link
            id="tour-new-notebook-btn"
            to="/notebooks"
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all hover:-translate-y-px"
            style={{
              background: "rgba(56,224,195,0.1)",
              border: "0.5px solid rgba(56,224,195,0.3)",
              color: "#38E0C3",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(56,224,195,0.18)";
              e.currentTarget.style.borderColor = "rgba(56,224,195,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(56,224,195,0.1)";
              e.currentTarget.style.borderColor = "rgba(56,224,195,0.3)";
            }}>
            <span>📚</span>
            New notebook
          </Link>

          {/* Secondary pill */}
          <Link
            to="/library"
            className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all hover:-translate-y-px"
            style={{
              background: "var(--surface-2)",
              border: "0.5px solid var(--border)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-3)";
              e.currentTarget.style.borderColor = "var(--brand-primary)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-2)";
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}>
            <span>🗂️</span>
            My library
          </Link>

          {/* Review pill if cards due */}
          {totalDue > 0 && (
            <Link
              to="/study/review"
              className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: "var(--surface-2)",
                border: "0.5px solid var(--border)",
                color: "var(--text-secondary)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-3)";
                e.currentTarget.style.borderColor = "var(--brand-primary)";
                e.currentTarget.style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }}>
              <span>🔁</span>
              {`Review ${totalDue} cards`}
            </Link>
          )}
        </motion.div>

        {/* ── Token card ── */}
        <motion.div variants={fadeUp} className="mb-3">
          <div
            id="tour-token-badge-dashboard"
            className="rounded-xl px-5 py-4 flex items-center gap-4 dark:bg-[rgba(56,224,195,0.07)] dark:border dark:border-[rgba(56,224,195,0.22)]"
            style={{
              background: "var(--surface-1)",
              border: "0.5px solid var(--border)",
            }}>
            {/* Balance number */}
            <div className="shrink-0">
              <p
                className="text-[24px] font-display leading-none dark:text-[#38E0C3]"
                style={{ color: "var(--brand-primary)" }}>
                {balance.toLocaleString()}
              </p>
              <p
                className="text-[11px] mt-1 dark:text-[rgba(56,224,195,0.55)]"
                style={{ color: "var(--text-muted)" }}>
                tokens left
              </p>
            </div>

            {/* Divider */}
            <div
              className="w-px h-8 shrink-0 dark:bg-[rgba(56,224,195,0.15)]"
              style={{ background: "var(--border)" }}
            />

            {/* Bar + label */}
            <div className="flex-1 min-w-0">
              <TokenBar balance={balance} max={max} />
              <p
                className="text-[11px] mt-1.5"
                style={{ color: "var(--text-dim)" }}>
                {balance.toLocaleString()} used · started with{" "}
                {max.toLocaleString()}
              </p>
            </div>

            {/* Top up button */}
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
              style={{
                background: "rgba(56,224,195,0.15)",
                border: "0.5px solid rgba(56,224,195,0.35)",
                color: "#38E0C3",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(56,224,195,0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(56,224,195,0.15)";
              }}>
              Top up
            </button>
          </div>
        </motion.div>

        {/* ── Flashcard review nudge ── */}
        {totalDue > 0 && (
          <motion.div variants={fadeUp} className="mb-6">
            <Link
              to="/study/review"
              className="flex items-center justify-between gap-4 p-4 rounded-xl group transition-all dark:bg-[rgba(56,224,195,0.05)] dark:border dark:border-[rgba(56,224,195,0.18)]"
              style={{
                background: "rgba(56,224,195,0.04)",
                border: "0.5px solid rgba(56,224,195,0.15)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(56,224,195,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(56,224,195,0.15)";
              }}>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0"
                  style={{
                    background: "rgba(56,224,195,0.08)",
                    border: "0.5px solid rgba(56,224,195,0.2)",
                  }}>
                  <Layers
                    className="w-4 h-4"
                    style={{ color: "var(--brand-primary)" }}
                  />
                </div>
                <div>
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: "var(--text-primary)" }}>
                    {totalDue} flashcard{totalDue !== 1 ? "s" : ""} due for
                    review
                  </p>
                  <p
                    className="text-[11.5px] mt-0.5"
                    style={{ color: "var(--text-dim)" }}>
                    Keep your streak — takes just a few minutes
                  </p>
                </div>
              </div>
              <ChevronRight
                className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform"
                style={{ color: "var(--text-dim)" }}
              />
            </Link>
          </motion.div>
        )}

        {/* ── Recent notebooks ── */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-[10.5px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}>
              Recent notebooks
            </p>
            <Link
              to="/notebooks"
              className="text-[11.5px] font-medium hover:underline transition-opacity hover:opacity-80"
              style={{ color: "rgba(56,224,195,0.7)" }}>
              All notebooks →
            </Link>
          </div>

          {recentNotebooks.length > 0 ? (
            <>
              {/* Desktop grid */}
              <div className="hidden sm:grid grid-cols-3 gap-3">
                {recentNotebooks.map((nb, i) => (
                  <div
                    key={nb.id}
                    id={i === 0 ? "tour-notebook-card" : undefined}>
                    <NotebookCard nb={nb} />
                  </div>
                ))}
              </div>

              {/* Mobile horizontal scroll */}
              <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-5 px-5 pb-2 sm:hidden">
                {recentNotebooks.map((nb, i) => (
                  <div
                    key={nb.id}
                    id={i === 0 ? "tour-notebook-card" : undefined}>
                    <NotebookCard nb={nb} mobile />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="py-14 rounded-2xl flex flex-col items-center justify-center text-center dark:bg-[rgba(255,255,255,0.03)] dark:border dark:border-[rgba(255,255,255,0.08)]"
              style={{
                background: "var(--surface-1)",
                border: "0.5px solid var(--border)",
              }}>
              <p className="text-3xl mb-3">📚</p>
              <p
                className="text-sm font-semibold mb-1"
                style={{ color: "var(--text-primary)" }}>
                No notebooks yet
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Create your first to get started
              </p>
              <Link
                to="/notebooks"
                className="mt-5 px-4 py-2 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 gradient-brand">
                Create notebook
              </Link>
            </div>
          )}
        </motion.div>

        {/* ── Recent activity ── */}
        {recentOutputs.length > 0 && (
          <motion.div variants={fadeUp} className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p
                className="text-[10.5px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}>
                Recent activity
              </p>
              <Link
                to="/library"
                className="text-[11.5px] font-medium hover:underline transition-opacity hover:opacity-80"
                style={{ color: "rgba(56,224,195,0.7)" }}>
                Library →
              </Link>
            </div>

            <div
              className="rounded-2xl overflow-hidden dark:bg-[rgba(255,255,255,0.03)] dark:border dark:border-[rgba(255,255,255,0.08)]"
              style={{
                background: "var(--surface-1)",
                border: "0.5px solid var(--border)",
              }}>
              {recentOutputs.slice(0, 5).map((ao, i) => {
                const meta = OUTPUT_LABELS[ao.type] ?? OUTPUT_LABELS.summary;
                const nb = notebooks.find((n) => n.id === ao.notebook_id);
                const isLast = i === Math.min(recentOutputs.length, 5) - 1;
                return (
                  <Link
                    key={ao.id}
                    to={`/notebooks/${ao.notebook_id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                    style={{
                      borderBottom: isLast
                        ? "none"
                        : "0.5px solid var(--border-subtle)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}>
                    {/* Type badge */}
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 dark:bg-[rgba(255,255,255,0.06)] dark:border dark:border-[rgba(255,255,255,0.1)]"
                      style={{ background: meta.bg, color: meta.color }}>
                      {meta.emoji} {meta.label}
                    </span>

                    {/* Notebook title */}
                    <p
                      className="flex-1 text-sm truncate"
                      style={{ color: "var(--text-secondary)" }}>
                      {nb?.title ?? "—"}
                    </p>

                    {/* Date */}
                    <p
                      className="text-xs shrink-0"
                      style={{ color: "var(--text-dim)" }}>
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

// ── Notebook Card component ────────────────────────────────────────────────
interface NbCardProps {
  nb: {
    id: string;
    title: string;
    emoji?: string | null;
    color?: string | null;
    cover_image_url?: string | null;
    icon_url?: string | null;
    updated_at: string;
  };
  mobile?: boolean;
}

function NotebookCard({ nb, mobile }: NbCardProps) {
  const color = nb.color || "#38E0C3";
  return (
    <Link
      to={`/notebooks/${nb.id}`}
      className={[
        "flex flex-col rounded-2xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5",
        mobile ? "shrink-0 min-w-[155px]" : "",
      ].join(" ")}
      style={{
        background: "var(--surface-1)",
        border: `0.5px solid ${color}40`,
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow =
          `0 4px 20px ${color}25`;
        (e.currentTarget as HTMLElement).style.borderColor = `${color}70`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)";
        (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
      }}>
      {/* Cover zone — image or color tint */}
      <div
        className="px-4 pt-4 pb-3.5 relative overflow-hidden"
        style={
          nb.cover_image_url
            ? {
                backgroundImage: `url(${nb.cover_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                minHeight: "76px",
              }
            : { background: `${color}18` }
        }>
        {nb.cover_image_url && (
          <div
            className="absolute inset-0"
            style={{ background: "rgba(5,12,25,0.52)" }}
          />
        )}
        {!nb.cover_image_url && (
          <div
            className="absolute -top-4 -right-4 w-16 h-16 rounded-full opacity-30"
            style={{
              background: `radial-gradient(circle, ${color}60, transparent 70%)`,
            }}
          />
        )}
        <div className="relative z-10">
          {nb.icon_url ? (
            <div
              className="w-8 h-8 rounded-xl overflow-hidden"
              style={{ border: "1.5px solid rgba(255,255,255,0.25)" }}>
              <img
                src={nb.icon_url}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <span className="text-2xl leading-none block">
              {nb.emoji || "📚"}
            </span>
          )}
          <p
            className="mt-2 text-sm font-semibold leading-snug line-clamp-2"
            style={{
              color: nb.cover_image_url
                ? "rgba(255,255,255,0.95)"
                : "var(--text-primary)",
            }}>
            {nb.title}
          </p>
        </div>
      </div>
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ borderTop: `0.5px solid ${color}20` }}>
        <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          {formatDistanceToNow(new Date(nb.updated_at), { addSuffix: true })}
        </p>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: color }}
        />
      </div>
    </Link>
  );
}
