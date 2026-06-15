import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTour } from "@/hooks/useTour";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  User, Palette, Bell, Zap, Database,
  Camera, Loader2,
  TrendingUp, TrendingDown, Eye, EyeOff,
  AlertTriangle, Download, Trash2, Lock,
} from "@/lib/icons";
import { supabase }      from "@/services/supabase";
import { useAuthStore }  from "@/stores/authStore";
import { useUIStore }    from "@/stores/uiStore";
import { cn }            from "@/lib/utils";
import type { TokenTransaction } from "@/types";
import { NIGERIAN_UNIVERSITIES } from "@/types";
import toast from "react-hot-toast";

type Tab = "profile" | "appearance" | "notifications" | "tokens" | "data";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",       label: "Profile",       icon: User     },
  { id: "appearance",    label: "Appearance",    icon: Palette  },
  { id: "notifications", label: "Notifications", icon: Bell     },
  { id: "tokens",        label: "Tokens",        icon: Zap      },
  { id: "data",          label: "Data & Export", icon: Database },
];

// ── Reusable toggle ──────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={cn(
        "relative rounded-full transition-colors shrink-0",
        on ? "bg-[var(--brand-primary)]" : "bg-[var(--surface-3)] border border-[var(--border)]"
      )}
      style={{ width: 40, height: 22 }}
      aria-pressed={on}
    >
      <span
        className={cn(
          "absolute top-[2px] left-[2px] rounded-full bg-white shadow transition-transform",
          on && "translate-x-[18px]"
        )}
        style={{ width: 18, height: 18 }}
      />
    </button>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Profile Tab ───────────────────────────────────────────────────────────────
function ProfileTab() {
  const { profile, refreshProfile } = useAuthStore();
  const user = useAuthStore((s) => s.user);
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName,    setFullName]    = useState(profile?.full_name ?? "");
  const [university,  setUniversity]  = useState(profile?.university ?? "");
  const [saving,      setSaving]      = useState(false);
  const [uploading,   setUploading]   = useState(false);

  const [oldPwd,      setOldPwd]      = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [showPwd,     setShowPwd]     = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting,      setDeleting]      = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { data, error } = await (supabase.from("profiles") as any).update({
      full_name:  fullName.trim() || null,
      university: university || null,
      updated_at: new Date().toISOString(),
    }).eq("id", profile.id).select("*").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data) refreshProfile(data as any);
    toast.success("Profile updated");
  };

  const handleAvatarUpload = async (file: File) => {
    if (!profile) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max file size is 5 MB"); return; }
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `${profile.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Upload failed: " + upErr.message); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { data, error: dbErr } = await (supabase.from("profiles") as any)
      .update({ avatar_url: `${publicUrl}?v=${Date.now()}` })
      .eq("id", profile.id).select("*").single();
    setUploading(false);
    if (dbErr) { toast.error("Could not save avatar"); return; }
    if (data) refreshProfile(data as any);
    toast.success("Avatar updated");
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    setChangingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setChangingPwd(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    setOldPwd(""); setNewPwd("");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("delete-user", {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (error) { toast.error("Failed to delete account. Try again."); setDeleting(false); return; }
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
    window.location.replace("/auth");
  };

  const initials = (profile?.full_name ?? user?.email ?? "S")[0].toUpperCase();

  return (
    <div className="space-y-4">
      <Section title="Personal Information">
        {/* Avatar */}
        <div id="tour-profile-avatar" className="flex items-center gap-5 mb-5">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="avatar" className="w-16 h-16 rounded-2xl object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{initials}</span>
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-md"
            >
              {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{profile?.full_name ?? "Set your name"}</p>
            <p className="text-xs text-[var(--text-muted)]">{user?.email}</p>
            <button onClick={() => fileRef.current?.click()} className="text-xs text-[var(--brand-primary)] hover:underline mt-1">
              Change photo
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Full Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">Email</label>
            <input value={user?.email ?? ""} readOnly
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] text-sm cursor-not-allowed" />
          </div>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">University</label>
            <select
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-colors"
            >
              <option value="">— Select university —</option>
              {NIGERIAN_UNIVERSITIES.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl gradient-brand text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? <span className="flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</span> : "Save Changes"}
          </motion.button>
        </div>
      </Section>

      <Section title="Change Password">
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Current password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-colors"
            />
            <button onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <input
            type={showPwd ? "text" : "password"}
            placeholder="New password (min 8 characters)"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] transition-colors"
          />
          <button
            onClick={handleChangePassword} disabled={changingPwd || !newPwd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-50 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            {changingPwd ? "Updating…" : "Update Password"}
          </button>
        </div>
      </Section>

      <Section title="Delete Account">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)]">
              Deleting your account is permanent. All your notebooks, AI outputs, and data will be erased.
              Type <span className="font-mono font-bold text-red-500">DELETE</span> to confirm.
            </p>
          </div>
          <input
            placeholder='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors"
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== "DELETE" || deleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Processing…" : "Delete My Account"}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ── Appearance Tab ─────────────────────────────────────────────────────────────
function AppearanceTab() {
  const { density, setDensity, fontSize, setFontSize } = useUIStore();

  return (
    <div className="space-y-4">

      <Section title="Layout Density">
        <div className="grid grid-cols-2 gap-2">
          {(["compact","comfortable"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDensity(d)}
              className={cn(
                "flex flex-col items-start gap-2 p-4 rounded-xl border transition-all text-left",
                density === d
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
              )}
            >
              <div className="space-y-1 w-full">
                {d === "compact"
                  ? [3,3].map((_, i) => <div key={i} className="h-1.5 rounded bg-[var(--surface-3)] w-full" />)
                  : [3,4].map((_, i) => <div key={i} className={cn("rounded bg-[var(--surface-3)] w-full", i === 0 ? "h-2" : "h-3")} />)
                }
              </div>
              <span className={cn("text-xs font-semibold capitalize", density === d ? "text-[var(--brand-primary)]" : "text-[var(--text-secondary)]")}>
                {d}
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Font Size">
        <div className="grid grid-cols-5 gap-2">
          {([
            { key: "small",  px: "13px", label: "Small",   display: "text-xs"  },
            { key: "medium", px: "14px", label: "Medium",  display: "text-sm"  },
            { key: "large",  px: "16px", label: "Large",   display: "text-base"},
            { key: "xl",     px: "18px", label: "X-Large", display: "text-lg"  },
            { key: "xxl",    px: "20px", label: "XX-Large",display: "text-xl"  },
          ] as const).map(({ key, label, display }) => (
            <button
              key={key}
              onClick={() => setFontSize(key)}
              className={cn(
                "flex flex-col items-center gap-2 py-4 rounded-xl border transition-all",
                fontSize === key
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]"
              )}
            >
              <span className={cn(
                "font-semibold", display,
                fontSize === key ? "text-[var(--brand-primary)]" : "text-[var(--text-secondary)]"
              )}>Aa</span>
              <span className="text-[10px] text-center text-[var(--text-muted)] leading-tight px-1">{label}</span>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ── Notifications Tab ─────────────────────────────────────────────────────────
function NotificationsTab() {
  const { emailNotifications, setEmailNotifications, lowTokenWarnings, setLowTokenWarnings } = useUIStore();
  const { isSupported, inAppBrowser, permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();

  const rows = [
    {
      label: "Email Notifications",
      description: "Receive emails for announcements and important updates",
      value: emailNotifications,
      onChange: setEmailNotifications,
    },
    {
      label: "Low Token Warnings",
      description: "Show a banner when your token balance is running low",
      value: lowTokenWarnings,
      onChange: setLowTokenWarnings,
    },
  ];

  return (
    <div className="space-y-4">
      <Section title="Notification Preferences">
        <div className="divide-y divide-[var(--border)]">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{row.label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{row.description}</p>
              </div>
              <Toggle on={row.value} onChange={row.onChange} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Push Notifications">
        {inAppBrowser ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">
              Open StudyLM directly in <strong>Chrome</strong> (not via WhatsApp, Instagram, or another app's browser) to enable push notifications.
            </p>
          </div>
        ) : !isSupported ? (
          <p className="text-sm text-[var(--text-muted)]">
            Push notifications require Chrome on Android or Safari on iOS 16.4+.
          </p>
        ) : permission === "denied" ? (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-secondary)]">
              Notifications are blocked in your browser. Enable them in browser or phone settings, then reload.
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Enable Push Notifications</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Receive updates directly on your phone or browser
              </p>
            </div>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
            ) : (
              <Toggle on={isSubscribed} onChange={(v) => (v ? subscribe() : unsubscribe())} />
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

// ── Token History Tab ─────────────────────────────────────────────────────────
function TokensTab() {
  const profile = useAuthStore((s) => s.profile);
  const { setPaymentModalOpen } = useUIStore();

  const { data: transactions = [], isLoading } = useQuery<TokenTransaction[]>({
    queryKey: ["token-transactions", profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_transactions").select("*")
        .eq("user_id", profile!.id)
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as TokenTransaction[];
    },
    enabled: !!profile?.id,
    staleTime: 30_000,
  });

  const colorMap: Record<string, string> = {
    grant: "text-green-600", purchase: "text-green-600",
    admin_grant: "text-blue-600", spend: "text-red-500",
  };
  const signMap: Record<string, string> = {
    grant: "+", purchase: "+", admin_grant: "+", spend: "−",
  };

  return (
    <div className="space-y-4">
      {/* Balance + top up */}
      <div className="flex items-center gap-4 p-5 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl">
        <div className="flex-1">
          <p className="text-3xl font-bold text-[var(--brand-primary)]">
            {(profile?.study_tokens ?? 0).toLocaleString()}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">tokens available</p>
          <p className="text-xs text-[var(--text-muted)]">
            {(profile?.total_tokens_used ?? 0).toLocaleString()} used all-time
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setPaymentModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Zap className="w-4 h-4" />
          Top Up
        </motion.button>
      </div>

      {/* History table */}
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Transaction History</h3>
        </div>
        {isLoading && (
          <div className="py-12 text-center text-sm text-[var(--text-muted)]">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        )}
        {!isLoading && transactions.length === 0 && (
          <p className="py-12 text-center text-sm text-[var(--text-muted)]">No transactions yet</p>
        )}
        <div className="divide-y divide-[var(--border)]">
          {transactions.map((tx) => {
            const isCredit = tx.type !== "spend";
            return (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-2)] transition-colors">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                  isCredit ? "bg-green-500/10" : "bg-red-500/10")}>
                  {isCredit
                    ? <TrendingUp   className="w-4 h-4 text-green-600" />
                    : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {tx.description ?? tx.type}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn("text-sm font-semibold", colorMap[tx.type] ?? "text-[var(--text-secondary)]")}>
                    {signMap[tx.type] ?? "+"}{tx.amount.toLocaleString()}
                  </p>
                  {tx.balance_after != null && (
                    <p className="text-[10px] text-[var(--text-muted)]">bal: {tx.balance_after.toLocaleString()}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Data & Export Tab ─────────────────────────────────────────────────────────
function DataTab() {
  const profile  = useAuthStore((s) => s.profile);
  const navigate = useNavigate();
  const [exporting,  setExporting]  = useState(false);
  const [clearing,   setClearing]   = useState(false);
  const [clearInput, setClearInput] = useState("");

  const handleExport = async () => {
    if (!profile) return;
    setExporting(true);
    const [nbRes, aoRes, srcRes] = await Promise.all([
      supabase.from("notebooks").select("*").eq("user_id", profile.id),
      supabase.from("ai_outputs").select("id, notebook_id, type, tokens_used, created_at, updated_at").eq("user_id", profile.id),
      supabase.from("sources").select("id, notebook_id, title, type, word_count, created_at").eq("user_id", profile.id),
    ]);
    setExporting(false);

    const payload = {
      exported_at: new Date().toISOString(),
      user:        { id: profile.id, email: profile.email, full_name: profile.full_name },
      notebooks:   nbRes.data ?? [],
      ai_outputs:  aoRes.data ?? [],
      sources:     srcRes.data ?? [],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `studylm-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully");
  };

  const handleClear = async () => {
    if (clearInput !== "CLEAR" || !profile) return;
    setClearing(true);
    const { error } = await (supabase.from("notebooks") as any)
      .delete().eq("user_id", profile.id);
    setClearing(false);
    if (error) { toast.error(error.message); return; }
    toast.success("All notebooks cleared");
    setClearInput("");
    navigate("/notebooks");
  };

  return (
    <div className="space-y-4">
      <Section title="Export Your Data">
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Download all your notebooks, AI outputs, and sources as a JSON file.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--surface-3)] disabled:opacity-60 transition-colors"
        >
          {exporting
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
            : <><Download className="w-4 h-4" /> Export All Data (JSON)</>}
        </motion.button>
      </Section>

      <Section title="Clear All Notebooks">
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-secondary)]">
              This will permanently delete <strong>all your notebooks</strong>, sources, and AI outputs. This cannot be undone.
              Type <span className="font-mono font-bold text-red-500">CLEAR</span> to confirm.
            </p>
          </div>
          <input
            placeholder='Type "CLEAR" to confirm'
            value={clearInput}
            onChange={(e) => setClearInput(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-colors"
          />
          <button
            onClick={handleClear}
            disabled={clearInput !== "CLEAR" || clearing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {clearing ? "Clearing…" : "Clear All Notebooks"}
          </button>
        </div>
      </Section>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  const navigate = useNavigate();
  const { startTour } = useTour();

  const handleReplayTour = () => {
    localStorage.removeItem("studyai_tour_complete");
    navigate("/dashboard");
    setTimeout(() => startTour(), 1200);
  };

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Manage your account and preferences</p>
          </div>
          <button
            onClick={handleReplayTour}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-opacity opacity-50 hover:opacity-100 shrink-0 mt-1"
            style={{ color: "#38E0C3", border: "0.5px solid rgba(56,224,195,0.25)" }}
          >
            <span>🎯</span>
            App tour
          </button>
        </div>
      </motion.div>

      {/* Tab nav */}
      <div className="flex mb-5 border-b border-[var(--border)]">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            title={label}
            onClick={() => setTab(id)}
            className={cn(
              "flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 py-2.5 sm:px-3 border-b-2 -mb-px transition-colors min-w-0",
              tab === id
                ? "border-[var(--brand-primary)] text-[var(--brand-primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            )}
          >
            <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="hidden sm:block text-xs font-medium whitespace-nowrap">{label}</span>
            <span className="sm:hidden text-[9px] font-medium truncate w-full text-center leading-tight">
              {label.split(" &")[0].split(" ")[0]}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
      >
        {tab === "profile"       && <ProfileTab />}
        {tab === "appearance"    && <AppearanceTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "tokens"        && <TokensTab />}
        {tab === "data"          && <DataTab />}
      </motion.div>
    </div>
  );
}
