import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { subDays, format, startOfDay, parseISO } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import {
  LayoutDashboard, Users, CreditCard, BarChart2, Megaphone, Cpu,
  Zap, Search, Gift, BookOpen, ShieldCheck, ShieldOff, UserCog,
  PlusCircle, Loader2, AlertTriangle, Check, X,
  TrendingUp, TrendingDown, Trash2, ToggleLeft, ToggleRight, SlidersHorizontal,
} from "@/lib/icons";
import toast from "react-hot-toast";
import { supabase }      from "@/services/supabase";
import { useAuthStore }  from "@/stores/authStore";
import { cn }            from "@/lib/utils";
import type { Profile, Payment, Announcement } from "@/types";

// ─── Constants ────────────────────────────────────────────────────────────────

type AdminTab = "overview" | "users" | "payments" | "analytics" | "announcements" | "groq" | "token-costs";

const TABS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",      label: "Overview",      icon: LayoutDashboard    },
  { id: "users",         label: "Users",         icon: Users              },
  { id: "payments",      label: "Payments",      icon: CreditCard         },
  { id: "analytics",     label: "Analytics",     icon: BarChart2          },
  { id: "announcements", label: "Announcements", icon: Megaphone          },
  { id: "token-costs",   label: "Token Costs",   icon: SlidersHorizontal  },
  { id: "groq",          label: "Groq Monitor",  icon: Cpu                },
];

const CHART_COLORS = ["#E07B1A","#6366F1","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4"];

const TYPE_LABELS: Record<string, string> = {
  summary:     "Summary",
  quiz:        "Quiz",
  flashcards:  "Flashcards",
  mindmap:     "Mind Map",
  studyguide:  "Study Guide",
  keyconcepts: "Key Concepts",
  podcast:     "Podcast",
  chat_history:"Chat",
};

const POWERFUL_TYPES = new Set(["summary","studyguide","mindmap","podcast"]);
const FAST_TYPES     = new Set(["quiz","flashcards","keyconcepts","chat_history"]);
const GROQ_DAILY_LIMIT = { powerful: 200, fast: 800 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, sub,
}: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 shadow-sm">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", color + "/15")}>
        <Icon className={cn("w-4.5 h-4.5", color)} />
      </div>
      <p className="text-2xl font-display text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-muted)] mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="text-[var(--text-muted)] mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color ?? "#E07B1A" }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const todayISO    = startOfDay(new Date()).toISOString();
  const weekAgoISO  = subDays(new Date(), 7).toISOString();

  const { data: userCount   = 0 } = useQuery({ queryKey: ["admin-user-count"],   queryFn: async () => { const { count } = await supabase.from("profiles").select("*",{count:"exact",head:true}); return count ?? 0; }, staleTime: 60_000 });
  const { data: notebookCnt = 0 } = useQuery({ queryKey: ["admin-nb-count"],      queryFn: async () => { const { count } = await supabase.from("notebooks").select("*",{count:"exact",head:true}); return count ?? 0; }, staleTime: 60_000 });
  const { data: outputCnt   = 0 } = useQuery({ queryKey: ["admin-output-count"],  queryFn: async () => { const { count } = await supabase.from("ai_outputs").select("*",{count:"exact",head:true}); return count ?? 0; }, staleTime: 60_000 });

  const { data: activeUsers = 0 } = useQuery({ queryKey: ["admin-active-users"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_outputs").select("user_id").gte("created_at", weekAgoISO);
      return new Set(data?.map((r) => r.user_id)).size;
    }, staleTime: 60_000 });

  const { data: tokensToday = 0 } = useQuery({ queryKey: ["admin-tokens-today"],
    queryFn: async () => {
      const { data } = await supabase.from("token_transactions").select("amount").eq("type","spend").gte("created_at", todayISO);
      return (data ?? []).reduce((s, r) => s + r.amount, 0);
    }, staleTime: 60_000 });

  const { data: revenue = 0 } = useQuery({ queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("amount_ngn").eq("status","success");
      return (data ?? []).reduce((s, r) => s + r.amount_ngn, 0);
    }, staleTime: 60_000 });

  const stats = [
    { label: "Total Users",        value: userCount,                                    icon: Users,        color: "text-[var(--brand-primary)]" },
    { label: "Active (7 days)",    value: activeUsers,                                  icon: TrendingUp,   color: "text-green-500" },
    { label: "Notebooks",          value: notebookCnt,                                  icon: BookOpen,     color: "text-[#6366F1]" },
    { label: "AI Outputs",         value: outputCnt,                                    icon: Zap,          color: "text-[#F59E0B]" },
    { label: "Tokens Spent Today", value: tokensToday.toLocaleString(),                 icon: TrendingDown, color: "text-red-500" },
    { label: "Total Revenue",      value: `₦${(revenue / 1000).toFixed(1)}k`,          icon: CreditCard,   color: "text-[#10B981]" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {stats.map((s) => <StatCard key={s.label} {...s} />)}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

type UserFilter = "all" | "low_tokens" | "active_week";

function GrantTokensModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const adminProfile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();

  const grant = async () => {
    const n = parseInt(amount);
    if (!n || n <= 0) { toast.error("Enter a valid amount"); return; }
    const { error } = await (supabase as any).rpc("admin_grant_tokens", {
      p_admin_id:    adminProfile!.id,
      p_user_id:     user.id,
      p_amount:      n,
      p_description: "Admin token grant",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${n.toLocaleString()} tokens granted to ${user.full_name ?? user.email}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">Grant Tokens</h3>
        <p className="text-xs text-[var(--text-muted)] mb-4">
          To: <span className="font-medium text-[var(--text-secondary)]">{user.full_name ?? user.email}</span>
          <span className="ml-2 opacity-60">· {user.study_tokens.toLocaleString()} current</span>
        </p>
        <input
          type="number"
          placeholder="Token amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 mb-4"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors">Cancel</button>
          <button onClick={grant} className="flex-1 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity">Grant</button>
        </div>
      </motion.div>
    </div>
  );
}

function ViewNotebooksModal({ user, onClose }: { user: Profile; onClose: () => void }) {
  const { data: notebooks = [], isLoading } = useQuery({
    queryKey: ["admin-user-notebooks", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notebooks").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl max-h-[70vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {user.full_name ?? user.email}'s Notebooks
            </h3>
            <p className="text-xs text-[var(--text-muted)]">{notebooks.length} total</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {isLoading && <div className="text-center py-8 text-sm text-[var(--text-muted)]"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>}
          {!isLoading && notebooks.length === 0 && <p className="text-center py-8 text-sm text-[var(--text-muted)]">No notebooks yet</p>}
          {notebooks.map((nb: any) => (
            <div key={nb.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <span className="text-xl">{nb.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{nb.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{format(new Date(nb.updated_at), "MMM d, yyyy")}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState<UserFilter>("all");
  const [grantUser, setGrantUser] = useState<Profile | null>(null);
  const [nbUser, setNbUser]       = useState<Profile | null>(null);

  const weekAgoISO = subDays(new Date(), 7).toISOString();

  const { data: allProfiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: ["admin-users"],
    queryFn:  async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
    staleTime: 30_000,
  });

  const { data: aiCounts = {} as Record<string, number> } = useQuery({
    queryKey: ["admin-ai-counts"],
    queryFn:  async () => {
      const { data } = await supabase.from("ai_outputs").select("user_id");
      return (data ?? []).reduce<Record<string, number>>((acc, r) => {
        acc[r.user_id] = (acc[r.user_id] ?? 0) + 1;
        return acc;
      }, {});
    },
    staleTime: 60_000,
  });

  const { data: activeUserIds = new Set<string>() } = useQuery({
    queryKey: ["admin-active-ids"],
    queryFn:  async () => {
      const { data } = await supabase.from("ai_outputs").select("user_id").gte("created_at", weekAgoISO);
      return new Set((data ?? []).map((r) => r.user_id));
    },
    staleTime: 60_000,
  });

  const displayed = useMemo(() => {
    let list = allProfiles;
    if (filter === "low_tokens")  list = list.filter((p) => p.study_tokens < 100);
    if (filter === "active_week") list = list.filter((p) => activeUserIds.has(p.id));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.email.toLowerCase().includes(q) || (p.full_name ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [allProfiles, filter, search, activeUserIds]);

  const toggleSuspend = async (p: Profile) => {
    const { error } = await (supabase.from("profiles") as any).update({ is_suspended: !p.is_suspended }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(p.is_suspended ? "Account reactivated" : "Account suspended");
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const toggleRole = async (p: Profile) => {
    const newRole = p.role === "admin" ? "student" : "admin";
    const { error } = await (supabase.from("profiles") as any).update({ role: newRole }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Role changed to ${newRole}`);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
          />
        </div>
        <div className="flex gap-1 shrink-0">
          {(["all","low_tokens","active_week"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-2 rounded-xl border text-xs font-medium transition-colors capitalize whitespace-nowrap",
                filter === f
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand-primary)]/40"
              )}
            >
              {f === "all" ? "All" : f === "low_tokens" ? "Low Tokens" : "Active This Week"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                {["User","Email","University","Tokens","AI Calls","Joined","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td></tr>
              )}
              {!isLoading && displayed.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-[var(--text-muted)]">No users found</td></tr>
              )}
              {displayed.map((p) => (
                <tr key={p.id} className={cn(
                  "border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors",
                  p.is_suspended && "opacity-50"
                )}>
                  {/* Avatar + name */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full gradient-brand flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-white">
                            {(p.full_name ?? p.email)[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                          {p.full_name ?? "—"}
                        </p>
                        <div className="flex gap-1 mt-0.5">
                          {p.role === "admin" && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">admin</span>
                          )}
                          {p.is_suspended && (
                            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-500/10 text-red-500">suspended</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] max-w-[160px] truncate">{p.email}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] max-w-[120px] truncate">{p.university ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "font-semibold",
                      p.study_tokens < 50 ? "text-red-500" : p.study_tokens < 200 ? "text-[var(--brand-warning)]" : "text-[var(--brand-primary)]"
                    )}>
                      {p.study_tokens.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{(aiCounts[p.id] ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button title="Grant tokens" onClick={() => setGrantUser(p)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors">
                        <Gift className="w-3.5 h-3.5" />
                      </button>
                      <button title="View notebooks" onClick={() => setNbUser(p)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#6366F1] hover:bg-[#6366F1]/10 transition-colors">
                        <BookOpen className="w-3.5 h-3.5" />
                      </button>
                      <button title={`Make ${p.role === "admin" ? "student" : "admin"}`} onClick={() => toggleRole(p)} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors">
                        <UserCog className="w-3.5 h-3.5" />
                      </button>
                      <button title={p.is_suspended ? "Reactivate" : "Suspend"} onClick={() => toggleSuspend(p)} className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        p.is_suspended
                          ? "text-green-500 hover:bg-green-500/10"
                          : "text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                      )}>
                        {p.is_suspended ? <ShieldCheck className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
          {displayed.length} of {allProfiles.length} users
        </div>
      </div>

      {grantUser && <GrantTokensModal user={grantUser} onClose={() => setGrantUser(null)} />}
      {nbUser    && <ViewNotebooksModal user={nbUser}   onClose={() => setNbUser(null)} />}
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab() {
  const { data: payments = [], isLoading } = useQuery<(Payment & { profiles?: { full_name: string | null; email: string } })[]>({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 30_000,
  });

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              {["User","Amount","Tokens","Flutterwave Ref","Status","Date"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold text-[var(--text-muted)] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} className="py-12 text-center text-[var(--text-muted)]"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
            {!isLoading && payments.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">No payments yet</td></tr>}
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-[var(--text-primary)] truncate max-w-[120px]">{p.profiles?.full_name ?? "—"}</p>
                  <p className="text-[var(--text-muted)] truncate max-w-[120px]">{p.profiles?.email}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-[#10B981]">₦{p.amount_ngn.toLocaleString()}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{p.tokens_purchased.toLocaleString()}</td>
                <td className="px-4 py-3 font-mono text-[var(--text-muted)] text-[10px] max-w-[160px] truncate">{p.flutterwave_ref}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                    p.status === "success" ? "bg-green-500/10 text-green-600" :
                    p.status === "failed"  ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-600"
                  )}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{format(new Date(p.created_at), "MMM d, yyyy")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────

function AnalyticsTab() {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  const { data: outputsRaw = [] } = useQuery({
    queryKey: ["admin-outputs-raw"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_outputs").select("created_at, type").gte("created_at", thirtyDaysAgo);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const { data: spendRaw = [] } = useQuery({
    queryKey: ["admin-spend-raw"],
    queryFn: async () => {
      const { data } = await supabase.from("token_transactions").select("created_at, amount").eq("type","spend").gte("created_at", thirtyDaysAgo);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Bar chart: calls per day
  const callsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      map[format(subDays(new Date(), i), "MM/dd")] = 0;
    }
    outputsRaw.forEach((o: any) => {
      const key = format(parseISO(o.created_at), "MM/dd");
      if (key in map) map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [outputsRaw]);

  // Pie chart: type distribution
  const typeDistrib = useMemo(() => {
    const map: Record<string, number> = {};
    outputsRaw.forEach((o: any) => {
      map[o.type] = (map[o.type] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name: TYPE_LABELS[name] ?? name, value }));
  }, [outputsRaw]);

  // Line chart: token spend per day
  const spendByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      map[format(subDays(new Date(), i), "MM/dd")] = 0;
    }
    spendRaw.forEach((t: any) => {
      const key = format(parseISO(t.created_at), "MM/dd");
      if (key in map) map[key] = (map[key] ?? 0) + t.amount;
    });
    return Object.entries(map).map(([date, tokens]) => ({ date, tokens }));
  }, [spendRaw]);

  // Top features (same as type distrib, sorted)
  const totalOutputs = typeDistrib.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* AI Calls per day */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">AI Calls Per Day (30 days)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={callsByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} interval={6} />
            <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} />
            <RTooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Calls" fill="#E07B1A" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Output type distribution */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Output Type Distribution</h3>
        {typeDistrib.length === 0 ? (
          <div className="h-[180px] flex items-center justify-center text-sm text-[var(--text-muted)]">No data yet</div>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={typeDistrib} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                  {typeDistrib.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {typeDistrib.slice(0, 6).map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="flex-1 text-[var(--text-secondary)] truncate">{d.name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Token spend over time */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Token Spend (30 days)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={spendByDay} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#94A3B8" }} interval={6} />
            <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} />
            <RTooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="tokens" name="Tokens" stroke="#6366F1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top features ranking */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Most Used Features</h3>
        <div className="space-y-3">
          {typeDistrib.length === 0 && <p className="text-sm text-[var(--text-muted)]">No data yet</p>}
          {typeDistrib.slice(0, 7).map((d, i) => (
            <div key={d.name} className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[var(--text-muted)] w-4 text-right">{i + 1}</span>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">{d.name}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{d.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(d.value / totalOutputs) * 100}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="h-full rounded-full"
                    style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Announcements Tab ────────────────────────────────────────────────────────

function AnnouncementsTab() {
  const adminProfile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: all = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Announcement[];
    },
    staleTime: 30_000,
  });

  const publish = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Title and message are required"); return; }
    setSaving(true);
    const { error } = await (supabase.from("announcements") as any).insert({
      title:      title.trim(),
      message:    message.trim(),
      created_by: adminProfile?.id,
      active:     true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Announcement published");
    setTitle(""); setMessage("");
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const toggleActive = async (ann: Announcement) => {
    const { error } = await (supabase.from("announcements") as any).update({ active: !ann.active }).eq("id", ann.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  const deleteAnn = async (id: string) => {
    const { error } = await (supabase.from("announcements") as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    qc.invalidateQueries({ queryKey: ["announcements"] });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      {/* Create form */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <PlusCircle className="w-4 h-4 text-[var(--brand-primary)]" />
          New Announcement
        </h3>
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
        />
        <textarea
          placeholder="Message shown to all users…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 resize-none"
        />
        <button
          onClick={publish}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Megaphone className="w-3.5 h-3.5" />}
          Publish Announcement
        </button>
      </div>

      {/* Existing announcements */}
      <div className="space-y-2">
        {isLoading && <p className="text-center text-sm text-[var(--text-muted)] py-8">Loading…</p>}
        {!isLoading && all.length === 0 && <p className="text-center text-sm text-[var(--text-muted)] py-8">No announcements yet</p>}
        {all.map((ann) => (
          <div key={ann.id} className={cn(
            "flex gap-4 p-4 rounded-xl border bg-[var(--surface-1)] transition-opacity",
            ann.active ? "border-[var(--brand-primary)]/30" : "border-[var(--border)] opacity-50"
          )}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{ann.title}</p>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                  ann.active ? "bg-green-500/10 text-green-600" : "bg-[var(--surface-3)] text-[var(--text-muted)]"
                )}>{ann.active ? "LIVE" : "INACTIVE"}</span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{ann.message}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{format(new Date(ann.created_at), "MMM d, yyyy · h:mm a")}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => toggleActive(ann)} title={ann.active ? "Deactivate" : "Activate"} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 transition-colors">
                {ann.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteAnn(ann.id)} title="Delete" className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Token Costs Tab ──────────────────────────────────────────────────────────

const COST_FIELDS: { key: string; label: string; desc: string }[] = [
  { key: "summary",     label: "Summary",      desc: "AI summary of sources" },
  { key: "quiz",        label: "Quiz",         desc: "Generated quiz questions" },
  { key: "flashcards",  label: "Flashcards",   desc: "Flashcard deck" },
  { key: "mindmap",     label: "Mind Map",     desc: "Visual concept map" },
  { key: "studyguide",  label: "Study Guide",  desc: "Comprehensive study guide" },
  { key: "keyconcepts", label: "Key Concepts", desc: "Key concept extraction" },
  { key: "podcast",     label: "Podcast",      desc: "Podcast-style script" },
  { key: "chat",        label: "Chat (per msg)", desc: "Each AI chat message" },
];

function TokenCostsTab() {
  const qc = useQueryClient();

  const { data: saved, isLoading } = useQuery<Record<string, number>>({
    queryKey: ["app-settings", "token_costs"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("app_settings")
        .select("value")
        .eq("id", "token_costs")
        .single();
      return (data?.value ?? {}) as Record<string, number>;
    },
    staleTime: 0,
  });

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Populate draft when data loads
  useEffect(() => {
    if (saved) {
      setDraft(Object.fromEntries(Object.entries(saved).map(([k, v]) => [k, String(v)])));
    }
  }, [saved]);

  const handleSave = async () => {
    const parsed: Record<string, number> = {};
    for (const { key } of COST_FIELDS) {
      const n = parseInt(draft[key] ?? "");
      if (isNaN(n) || n < 0) { toast.error(`Invalid value for ${key}`); return; }
      parsed[key] = n;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("app_settings")
      .upsert({ id: "token_costs", value: parsed, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Token costs updated");
    // Invalidate so useTokenCosts() everywhere refreshes immediately
    qc.invalidateQueries({ queryKey: ["app-settings", "token_costs"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const hasChanges = saved && COST_FIELDS.some(
    ({ key }) => draft[key] !== undefined && parseInt(draft[key]) !== saved[key]
  );

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Token cost per operation</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Changes take effect immediately for all users.</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {COST_FIELDS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{desc}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  min="0"
                  value={draft[key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm text-right focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]"
                />
                <span className="text-xs text-[var(--text-muted)] w-10">tokens</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-4 border-t border-[var(--border)] flex items-center justify-between gap-3">
          {hasChanges ? (
            <p className="text-xs text-[var(--brand-warning)]">Unsaved changes</p>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">All changes saved</p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save costs
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Groq Monitor Tab ─────────────────────────────────────────────────────────

function GroqMonitorTab() {
  const todayISO = startOfDay(new Date()).toISOString();

  const { data: todayOutputs = [] } = useQuery({
    queryKey: ["admin-groq-today"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_outputs").select("type").gte("created_at", todayISO);
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const powerfulCount = todayOutputs.filter((o: any) => POWERFUL_TYPES.has(o.type)).length;
  const fastCount     = todayOutputs.filter((o: any) => FAST_TYPES.has(o.type)).length;
  const totalCount    = todayOutputs.length;
  const totalLimit    = GROQ_DAILY_LIMIT.powerful + GROQ_DAILY_LIMIT.fast;

  const pctPowerful = Math.min((powerfulCount / GROQ_DAILY_LIMIT.powerful) * 100, 100);
  const pctFast     = Math.min((fastCount     / GROQ_DAILY_LIMIT.fast)     * 100, 100);
  const pctTotal    = Math.min((totalCount    / totalLimit)                  * 100, 100);

  function meterColor(pct: number) {
    if (pct >= 90) return { bar: "#EF4444", text: "text-red-500",    bg: "bg-red-500/10",    label: "Near limit", icon: AlertTriangle };
    if (pct >= 70) return { bar: "#F59E0B", text: "text-yellow-500", bg: "bg-yellow-500/10", label: "Caution",    icon: AlertTriangle };
    return               { bar: "#10B981", text: "text-green-500",   bg: "bg-green-500/10",  label: "Safe",       icon: Check };
  }

  function MeterCard({ label, count, limit, pct }: { label: string; count: number; limit: number; pct: number }) {
    const m = meterColor(pct);
    const Icon = m.icon;
    return (
      <div className={cn("bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5")}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
          <span className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", m.bg, m.text)}>
            <Icon className="w-3 h-3" /> {m.label}
          </span>
        </div>
        <p className={cn("text-3xl font-display mb-1", m.text)}>{count.toLocaleString()}</p>
        <p className="text-xs text-[var(--text-muted)] mb-3">of ~{limit.toLocaleString()} estimated daily capacity</p>
        <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ background: m.bar }}
          />
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-1 text-right">{pct.toFixed(1)}%</p>
      </div>
    );
  }

  // Type breakdown today
  const typeBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    todayOutputs.forEach((o: any) => { map[o.type] = (map[o.type] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [todayOutputs]);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid sm:grid-cols-3 gap-3">
        <MeterCard label="LLaMA 3.3 70B (Powerful)" count={powerfulCount} limit={GROQ_DAILY_LIMIT.powerful} pct={pctPowerful} />
        <MeterCard label="LLaMA 3.1 8B (Fast)"      count={fastCount}     limit={GROQ_DAILY_LIMIT.fast}     pct={pctFast}     />
        <MeterCard label="Total Requests Today"       count={totalCount}    limit={totalLimit}                pct={pctTotal}    />
      </div>

      {/* Type breakdown */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Request Breakdown Today</h3>
        {typeBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No requests today</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {typeBreakdown.map(([type, count]) => (
              <div key={type} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-2)]">
                <span className="text-sm font-medium text-[var(--text-secondary)] flex-1">
                  {TYPE_LABELS[type] ?? type}
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                    ({POWERFUL_TYPES.has(type) ? "powerful" : "fast"})
                  </span>
                </span>
                <span className="font-bold text-[var(--brand-primary)]">{count}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-3">
          * Limits are estimates based on Groq free tier guidelines. Actual limits depend on your plan.
        </p>
      </div>
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tab, setTab] = useState<AdminTab>("overview");

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-display text-[var(--text-primary)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Manage users, monitor usage, and control the platform.
        </p>
      </motion.div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none mb-6 border-b border-[var(--border)] pb-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors shrink-0",
              tab === id
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === "overview"      && <OverviewTab />}
          {tab === "users"         && <UsersTab />}
          {tab === "payments"      && <PaymentsTab />}
          {tab === "analytics"     && <AnalyticsTab />}
          {tab === "announcements" && <AnnouncementsTab />}
          {tab === "token-costs"   && <TokenCostsTab />}
          {tab === "groq"          && <GroqMonitorTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
