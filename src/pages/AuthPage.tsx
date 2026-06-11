import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { getLastPath } from "@/components/auth/AuthGuard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  ShieldOff,
  Send,
} from "@/lib/icons";
import { useAuth } from "@/hooks/useAuth";
import { NIGERIAN_UNIVERSITIES } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";
import { supabase } from "@/services/supabase";
import { WetPaintButton } from "@/components/ui/WetPaintButton";

type Tab = "signin" | "signup" | "forgot" | "check-email";

const slide = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.16 } },
};

// ── Input field ────────────────────────────────────────────────────────────

function Field({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  error,
  showToggle,
  children,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  showToggle?: boolean;
  children?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const inputType = type === "password" ? (show ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label
        className="block text-xs font-medium"
        style={{ color: "rgba(255,255,255,0.55)" }}>
        {label}
      </label>
      {children ?? (
        <div className="relative">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={cn(
              "w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-[rgba(255,255,255,0.25)]",
              "focus:outline-none transition-all duration-150",
              showToggle && "pr-10",
              error
                ? "border border-red-500/60 bg-[rgba(239,68,68,0.08)] focus:border-red-400"
                : "border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.06)] focus:border-[rgba(56,224,195,0.5)] focus:bg-[rgba(255,255,255,0.08)]",
            )}
          />
          {showToggle && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(255,255,255,0.35)" }}>
              {show ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="text-xs" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Google button ──────────────────────────────────────────────────────────

function GoogleButton({
  loading,
  onClick,
}: {
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-150 disabled:opacity-50"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "0.5px solid rgba(255,255,255,0.12)",
        color: "rgba(255,255,255,0.85)",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "rgba(255,255,255,0.06)")
      }>
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      )}
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
      <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        or
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: "rgba(255,255,255,0.08)" }}
      />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <WetPaintButton type="submit" disabled={loading} className="w-full justify-center">
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </WetPaintButton>
  );
}

// ── Banned modal ──────────────────────────────────────────────────────────

const APPEAL_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Pending review",
  reviewed: "👀 Being reviewed",
  dismissed: "❌ Dismissed",
};

function BannedModal({
  userId,
  banReason,
  existingStatus,
  adminReply: initialAdminReply,
  onClose,
}: {
  userId: string;
  banReason: string | null;
  existingStatus: string | null;
  adminReply: string | null;
  onClose: () => void;
}) {
  const [appeal, setAppeal] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(!!existingStatus);
  const [appealStatus, setAppealStatus] = useState<string | null>(
    existingStatus,
  );

  const submit = async () => {
    if (!appeal.trim()) return;
    setSending(true);
    const { error } = await (supabase.from("ban_appeals") as any).insert({
      user_id: userId,
      message: appeal.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Failed to send. Try again.");
      return;
    }
    setSent(true);
    setAppealStatus("pending");
    toast.success("Appeal sent.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative w-full max-w-sm rounded-2xl p-6 space-y-4"
        style={{
          background: "rgba(20,30,50,0.98)",
          border: "0.5px solid rgba(239,68,68,0.3)",
        }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
            <ShieldOff className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Account Banned</p>
            {banReason && (
              <p className="text-xs text-red-400 mt-0.5">{banReason}</p>
            )}
          </div>
        </div>

        {sent ? (
          <div className="space-y-2">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Your appeal status:
            </p>
            <p
              className="text-sm font-medium"
              style={{
                color:
                  appealStatus === "dismissed"
                    ? "#94A3B8"
                    : appealStatus === "reviewed"
                      ? "#6366F1"
                      : "#F59E0B",
              }}>
              {APPEAL_STATUS_LABELS[appealStatus ?? "pending"] ?? "Pending"}
            </p>
            {initialAdminReply && (
              <div
                className="mt-2 p-3 rounded-xl"
                style={{
                  background: "rgba(99,102,241,0.08)",
                  border: "0.5px solid rgba(99,102,241,0.2)",
                }}>
                <p
                  className="text-[10px] font-semibold mb-1"
                  style={{ color: "#6366F1" }}>
                  Admin reply
                </p>
                <p
                  className="text-xs"
                  style={{ color: "rgba(255,255,255,0.7)" }}>
                  {initialAdminReply}
                </p>
              </div>
            )}
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
              Check back here when you sign in to see updates.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              Think this is a mistake? Send an appeal to the admin.
            </p>
            <textarea
              value={appeal}
              onChange={(e) => setAppeal(e.target.value)}
              rows={3}
              placeholder="Explain why you think this ban should be lifted…"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-[rgba(255,255,255,0.2)] resize-none focus:outline-none"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.1)",
              }}
            />
            <button
              onClick={submit}
              disabled={sending || !appeal.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-opacity"
              style={{ background: "#38E0C3", color: "#0a1628" }}>
              {sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Appeal
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Sign-in form ───────────────────────────────────────────────────────────

function SignInForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { signIn, signInWithGoogle, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [bannedInfo, setBannedInfo] = useState<{
    userId: string;
    reason: string | null;
    existingStatus: string | null;
    adminReply: string | null;
  } | null>(null);
  // i just want to sleep 😭
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      await signIn(email, password);
      // After sign-in, check if banned before navigating
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_banned, ban_reason")
        .eq("email", email)
        .single();
      if (profile?.is_banned) {
        // Fetch existing appeal status while session is still valid
        const { data: existingAppeal } = await (
          supabase.from("ban_appeals") as any
        )
          .select("status, admin_reply")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        await supabase.auth.signOut();
        setBannedInfo({
          userId: profile.id,
          reason: profile.ban_reason,
          existingStatus: existingAppeal?.status ?? null,
          adminReply: existingAppeal?.admin_reply ?? null,
        });
        setLoading(false);
        return;
      }
      const from =
        (location.state as { from?: { pathname: string } })?.from?.pathname ??
        getLastPath();
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isCred =
        msg.toLowerCase().includes("invalid login") ||
        msg.toLowerCase().includes("invalid credentials");
      setFormError(
        isCred ? "Wrong email or password." : msg || "Sign in failed",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <motion.div key="signin" {...slide}>
      <h2 className="text-[22px] font-semibold text-white mb-1">
        Welcome back
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
        Sign in to continue to StudyLM
      </p>

      <GoogleButton loading={gLoading} onClick={handleGoogle} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@university.edu"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          showToggle
          onChange={(v) => {
            setPassword(v);
            if (formError) setFormError("");
          }}
          placeholder="••••••••"
          required
        />

        {formError && (
          <p
            className="text-xs text-center py-2 px-3 rounded-lg"
            style={{
              color: "#f87171",
              background: "rgba(239,68,68,0.08)",
              border: "0.5px solid rgba(239,68,68,0.2)",
            }}>
            {formError}
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onSwitch("forgot")}
            className="text-xs transition-colors"
            style={{ color: "#38E0C3" }}>
            Forgot password?
          </button>
        </div>

        <SubmitButton loading={loading} label="Sign in" />
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        No account?{" "}
        <button
          onClick={() => onSwitch("signup")}
          className="font-medium"
          style={{ color: "#38E0C3" }}>
          Sign up free
        </button>
      </p>
      {bannedInfo && (
        <BannedModal
          userId={bannedInfo.userId}
          banReason={bannedInfo.reason}
          existingStatus={bannedInfo.existingStatus}
          adminReply={bannedInfo.adminReply}
          onClose={() => setBannedInfo(null)}
        />
      )}
    </motion.div>
  );
}

// ── Sign-up form ───────────────────────────────────────────────────────────

function SignUpForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [uni, setUni] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required";
    if (!email.includes("@")) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Minimum 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { sessionAvailable } = await signUp(
        email,
        password,
        fullName,
        uni || undefined,
      );
      if (sessionAvailable) navigate("/dashboard", { replace: true });
      else onSwitch("check-email");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setGLoading(false);
    }
  };

  const strength =
    password.length === 0
      ? 0
      : password.length < 6
        ? 1
        : password.length < 10
          ? 2
          : password.length < 14
            ? 3
            : 4;
  const strengthColor = ["", "#ef4444", "#f59e0b", "#38E0C3", "#10b981"][
    strength
  ];

  return (
    <motion.div key="signup" {...slide}>
      <h2 className="text-[22px] font-semibold text-white mb-1">
        Create account
      </h2>
      <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
        1,000 free tokens on sign-up
      </p>

      <GoogleButton loading={gLoading} onClick={handleGoogle} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <Field
          label="Full name"
          value={fullName}
          onChange={setFullName}
          placeholder="Adaeze Okonkwo"
          required
          error={errors.fullName}
        />
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@university.edu"
          required
          error={errors.email}
        />

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            University{" "}
            <span style={{ color: "rgba(255,255,255,0.25)" }}>(optional)</span>
          </label>
          <select
            value={uni}
            onChange={(e) => setUni(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "0.5px solid rgba(255,255,255,0.09)",
              color: uni ? "white" : "rgba(255,255,255,0.25)",
              colorScheme: "dark",
            }}>
            <option value="">Select your university</option>
            {[...NIGERIAN_UNIVERSITIES]
              .sort((a, b) => a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b))
              .map((u) => (
              <option
                key={u}
                value={u}
                style={{ background: "#0f2039", color: "white" }}>
                {u}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label
            className="block text-xs font-medium"
            style={{ color: "rgba(255,255,255,0.55)" }}>
            Password
          </label>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none transition-all duration-150",
                errors.password
                  ? "border border-red-500/60 bg-[rgba(239,68,68,0.08)]"
                  : "border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.06)] focus:border-[rgba(56,224,195,0.5)] focus:bg-[rgba(255,255,255,0.08)]",
              )}
            />
          </div>
          {password.length > 0 && (
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className="flex-1 h-0.5 rounded-full transition-all duration-300"
                  style={{
                    background:
                      strength >= level
                        ? strengthColor
                        : "rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          )}
          {errors.password && (
            <p className="text-xs" style={{ color: "#f87171" }}>
              {errors.password}
            </p>
          )}
        </div>

        <SubmitButton loading={loading} label="Create account" />
      </form>

      <p
        className="text-center text-sm mt-6"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        Already have an account?{" "}
        <button
          onClick={() => onSwitch("signin")}
          className="font-medium"
          style={{ color: "#38E0C3" }}>
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

// ── Forgot password ────────────────────────────────────────────────────────

function ForgotForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div key="forgot" {...slide}>
      <button
        onClick={() => onSwitch("signin")}
        className="flex items-center gap-1.5 text-xs mb-6 transition-colors"
        style={{ color: "rgba(255,255,255,0.4)" }}>
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </button>

      {sent ? (
        <div className="text-center py-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: "rgba(56,224,195,0.12)",
              border: "0.5px solid rgba(56,224,195,0.2)",
            }}>
            <CheckCircle2 className="w-6 h-6" style={{ color: "#38E0C3" }} />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Check your inbox
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            We sent a reset link to{" "}
            <span className="text-white font-medium">{email}</span>
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-[22px] font-semibold text-white mb-1">
            Reset password
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "rgba(255,255,255,0.45)" }}>
            Enter your email and we'll send a reset link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@university.edu"
              required
            />
            <SubmitButton loading={loading} label="Send reset link" />
          </form>
        </>
      )}
    </motion.div>
  );
}

// ── Check email ────────────────────────────────────────────────────────────

function CheckEmail({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  return (
    <motion.div key="check-email" {...slide} className="text-center py-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{
          background: "rgba(56,224,195,0.1)",
          border: "0.5px solid rgba(56,224,195,0.2)",
        }}>
        <CheckCircle2 className="w-7 h-7" style={{ color: "#38E0C3" }} />
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">
        Verify your email
      </h2>
      <p
        className="text-sm mb-8 max-w-xs mx-auto"
        style={{ color: "rgba(255,255,255,0.45)" }}>
        Click the confirmation link we sent to activate your account.
      </p>
      <button
        onClick={() => onSwitch("signin")}
        className="text-sm font-medium"
        style={{ color: "#38E0C3" }}>
        Back to sign in
      </button>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get("tab");
    if (t === "signup") return "signup";
    if (t === "forgot") return "forgot";
    return "signin";
  });

  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "signup") url.searchParams.set("tab", "signup");
    else if (tab === "forgot") url.searchParams.set("tab", "forgot");
    else url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const forms: Record<Tab, React.ReactNode> = {
    signin: <SignInForm onSwitch={setTab} />,
    signup: <SignUpForm onSwitch={setTab} />,
    forgot: <ForgotForm onSwitch={setTab} />,
    "check-email": <CheckEmail onSwitch={setTab} />,
  };

  return (
    <div className="min-h-dvh flex" style={{ background: "#0a1628" }}>
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "rgba(56,224,195,0.10)",
          top: "-200px",
          left: "-150px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(99,179,255,0.07)",
          bottom: "-100px",
          right: "-80px",
          pointerEvents: "none",
        }}
      />

      {/* Left panel — desktop only */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden p-12"
        style={{ borderRight: "0.5px solid rgba(255,255,255,0.06)" }}>
        {/* Extra orb for left panel depth */}
        <div
          style={{
            position: "absolute",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "rgba(56,224,195,0.07)",
            top: "30%",
            left: "-80px",
            pointerEvents: "none",
          }}
        />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="StudyLM"
            className="w-9 h-9 rounded-xl object-cover"
          />
          <span className="font-display text-lg text-white">StudyLM</span>
        </div>

        <div className="relative z-10">
          <p
            className="text-[11px] font-medium tracking-widest uppercase mb-6"
            style={{ color: "rgba(56,224,195,0.7)" }}>
            Trusted by 10,000+ students
          </p>
          <blockquote className="text-2xl font-display text-white leading-snug mb-4">
            "I went from 4 hours making notes to 20 minutes. StudyLM is insane
            for exam prep."
          </blockquote>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            — Adaeze O., University of Lagos
          </p>

          <div className="flex flex-wrap gap-2 mt-8">
            {[
              "AI Chat",
              "Flashcards",
              "Quizzes",
              "Mind Maps",
              "Study Guides",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full text-xs font-medium"
                style={{
                  background: "rgba(56,224,195,0.08)",
                  border: "0.5px solid rgba(56,224,195,0.2)",
                  color: "rgba(255,255,255,0.65)",
                }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <p
          className="relative z-10 text-xs"
          style={{ color: "rgba(255,255,255,0.2)" }}>
          © 2025 StudyLM
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 relative z-10">
        {/* Mobile logo */}
        <div className="flex items-center gap-2.5 mb-10 lg:hidden">
          <img
            src="/logo.jpg"
            alt="StudyLM"
            className="w-8 h-8 rounded-xl object-cover"
          />
          <span className="font-display text-lg text-white">StudyLM</span>
        </div>

        {/* Glass card */}
        <div
          className="w-full max-w-sm rounded-2xl p-7"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "0.5px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}>
          <AnimatePresence mode="wait">{forms[tab]}</AnimatePresence>
        </div>

        <p
          className="text-[11px] mt-6 text-center"
          style={{ color: "rgba(255,255,255,0.2)" }}>
          By continuing you agree to our Terms & Privacy Policy
        </p>
      </div>
    </div>
  );
}
