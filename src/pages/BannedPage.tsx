import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldOff, LogOut, Send, Loader2 } from "@/lib/icons";
import toast from "react-hot-toast";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";

const LOGOUT_SECONDS = 300;

export default function BannedPage() {
  const { user, profile } = useAuthStore();
  const [countdown, setCountdown] = useState(LOGOUT_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [appeal, setAppeal]         = useState("");
  const [email, setEmail]            = useState(profile?.email ?? "");
  const [sending, setSending]        = useState(false);
  const [sent, setSent]              = useState(false);
  const [lastStatus, setLastStatus]  = useState<string | null>(null);

  // Check last appeal status by email
  useEffect(() => {
    const e = profile?.email ?? email;
    if (!e) return;
    (supabase.from("ban_appeals") as any)
      .select("status")
      .eq("email", e)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }: any) => { if (data) setLastStatus(data.status); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Block back/forward navigation
  useEffect(() => {
    window.history.pushState(null, "", "/banned");
    const block = () => window.history.pushState(null, "", "/banned");
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

  const handleSignOut = async () => {
    clearInterval(intervalRef.current!);
    await supabase.auth.signOut();
    useAuthStore.getState().signOut();
    window.location.replace("/auth");
  };

  // Countdown → auto sign-out
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { handleSignOut(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAppeal = async () => {
    if (!appeal.trim() || !email.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("ban_appeals") as any).insert({
      email:   email.trim(),
      message: appeal.trim(),
    });
    setSending(false);
    if (error) { console.error("[appeal] insert error:", error); toast.error("Failed to send. Try again."); return; }
    setSent(true);
    setLastStatus("pending");
    toast.success("Appeal sent to admin.");
  };

  const mins = String(Math.floor(countdown / 60)).padStart(2, "0");
  const secs = String(countdown % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--surface-0)] overflow-y-auto">
      <div className="min-h-full flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm text-center space-y-5 py-8"
      >
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-display text-[var(--text-primary)]">Account Banned</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Your account has been suspended by an administrator.
          </p>
          {profile?.ban_reason && (
            <p className="mt-2 text-sm text-red-400 font-medium">Reason: {profile.ban_reason}</p>
          )}
        </div>

        {/* Countdown */}
        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5">
          <p className="text-xs text-[var(--text-muted)] mb-2">Logging you out in</p>
          <p className="text-4xl font-display text-red-500 tabular-nums">{mins}:{secs}</p>
          <div className="mt-3 h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
            <motion.div
              className="h-full bg-red-500 rounded-full origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: countdown / LOGOUT_SECONDS }}
              transition={{ duration: 1, ease: "linear" }}
            />
          </div>
          <button
            onClick={handleSignOut}
            className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out now
          </button>
        </div>

        {/* Appeal section */}
        {sent || lastStatus === "pending" ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 text-left">
            <p className="text-sm font-medium text-[#F59E0B]">⏳ Appeal received</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">The admin will review your appeal and may unban your account.</p>
          </div>
        ) : lastStatus === "ignored" ? (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
              <p className="text-xs text-yellow-400">⚠️ Your previous appeal was ignored by the admin. You can send a new one below.</p>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            />
            <textarea
              value={appeal}
              onChange={(e) => setAppeal(e.target.value)}
              rows={3}
              placeholder="Explain why you think this ban should be lifted…"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 resize-none"
            />
            <button
              onClick={submitAppeal}
              disabled={sending || !appeal.trim() || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send New Appeal
            </button>
          </div>
        ) : (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-5 text-left space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Think this is a mistake?</p>
            <p className="text-xs text-[var(--text-muted)]">Send an appeal to the admin before you're logged out.</p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30"
            />
            <textarea
              value={appeal}
              onChange={(e) => setAppeal(e.target.value)}
              rows={3}
              placeholder="Explain why you think this ban should be lifted…"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/30 resize-none"
            />
            <button
              onClick={submitAppeal}
              disabled={sending || !appeal.trim() || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-brand text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send Appeal
            </button>
          </div>
        )}
      </motion.div>
      </div>
    </div>
  );
}
