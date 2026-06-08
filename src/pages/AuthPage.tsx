import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { getLastPath } from "@/components/auth/AuthGuard";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NIGERIAN_UNIVERSITIES } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

type Tab = "signin" | "signup" | "forgot" | "check-email";

const slide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, x: -24, transition: { duration: 0.2 } },
};

// ─── Field component ──────────────────────────────────────────────────────

interface FieldProps {
  label:       string;
  type?:       string;
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  required?:   boolean;
  error?:      string;
  showToggle?: boolean;
  children?:   React.ReactNode;
}

function Field({ label, type = "text", value, onChange, placeholder, required, error, showToggle, children }: FieldProps) {
  const [show, setShow] = useState(false);
  const inputType = type === "password" ? (show ? "text" : "password") : type;

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-text-secondary">{label}</label>
      {children ?? (
        <div className="relative">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            required={required}
            className={cn(
              "w-full px-3 py-2.5 rounded-xl border bg-surface-0 text-text-primary text-sm",
              "placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors",
              showToggle ? "pr-10" : "",
              error ? "border-brand-danger focus:ring-brand-danger/30" : "border-border"
            )}
          />
          {showToggle && (
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
              tabIndex={-1}
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-brand-danger">{error}</p>}
    </div>
  );
}

// ─── Sign-in ──────────────────────────────────────────────────────────────

function SignInForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { signIn, signInWithGoogle, isLoading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);
    try {
      await signIn(email, password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? getLastPath();
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const isCredentialError =
        msg.toLowerCase().includes("invalid login") ||
        msg.toLowerCase().includes("invalid credentials") ||
        msg.toLowerCase().includes("email not confirmed") === false && msg.toLowerCase().includes("invalid");
      setFormError(isCredentialError ? "Wrong email or password." : (msg || "Sign in failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setGLoading(false);
    }
  };

  if (isLoading) return null;

  return (
    <motion.div key="signin" {...slide}>
      <h2 className="text-2xl font-display text-text-primary mb-1">Welcome back</h2>
      <p className="text-sm text-text-secondary mb-6">Sign in to your StudyLM account</p>

      <GoogleButton loading={gLoading} onClick={handleGoogle} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" required />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={(v) => { setPassword(v); if (formError) setFormError(""); }}
          placeholder="••••••••"
          required
          showToggle
        />

        {formError && (
          <p className="text-sm text-brand-danger text-center -mt-1">{formError}</p>
        )}

        <button
          type="button"
          onClick={() => onSwitch("forgot")}
          className="text-xs text-brand-primary hover:underline ml-auto block"
        >
          Forgot password?
        </button>

        <SubmitButton loading={loading} label="Sign in" />
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        Don't have an account?{" "}
        <button onClick={() => onSwitch("signup")} className="text-brand-primary font-medium hover:underline">
          Sign up free
        </button>
      </p>
    </motion.div>
  );
}

// ─── Sign-up ─────────────────────────────────────────────────────────────

function SignUpForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email,    setEmail]    = useState("");
  const [uni,      setUni]      = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim())    e.fullName = "Full name is required";
    if (!email.includes("@")) e.email   = "Enter a valid email";
    if (password.length < 8) e.password = "Password must be at least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { sessionAvailable } = await signUp(email, password, fullName, uni || undefined);
      if (sessionAvailable) {
        navigate("/dashboard", { replace: true });
      } else {
        onSwitch("check-email");
      }
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
      toast.error(err instanceof Error ? err.message : "Google sign in failed");
      setGLoading(false);
    }
  };

  return (
    <motion.div key="signup" {...slide}>
      <h2 className="text-2xl font-display text-text-primary mb-1">Create account</h2>
      <p className="text-sm text-text-secondary mb-6">Start studying smarter — 1,000 free tokens included</p>

      <GoogleButton loading={gLoading} onClick={handleGoogle} />
      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full name" value={fullName} onChange={setFullName} placeholder="Adaeze Okonkwo" required error={errors.fullName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" required error={errors.email} />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-secondary">University</label>
          <select
            value={uni}
            onChange={(e) => setUni(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-surface-0 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary transition-colors"
          >
            <option value="">Select your university (optional)</option>
            {NIGERIAN_UNIVERSITIES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>

        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" required showToggle error={errors.password}>
          <div className="relative">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className={cn(
                "w-full px-3 py-2.5 rounded-xl border bg-surface-0 text-text-primary text-sm",
                "placeholder:text-text-muted focus:outline-none focus:ring-2 transition-colors",
                errors.password
                  ? "border-brand-danger focus:ring-brand-danger/30"
                  : "border-border focus:ring-brand-primary/30 focus:border-brand-primary"
              )}
            />
          </div>
        </Field>

        {/* Password strength indicator */}
        {password.length > 0 && (
          <div className="flex gap-1">
            {[4, 6, 8, 10].map((threshold) => (
              <div
                key={threshold}
                className={cn(
                  "flex-1 h-1 rounded-full transition-colors",
                  password.length >= threshold
                    ? threshold >= 10 ? "bg-brand-accent" : threshold >= 8 ? "bg-brand-warning" : "bg-brand-danger/60"
                    : "bg-surface-2"
                )}
              />
            ))}
          </div>
        )}

        <SubmitButton loading={loading} label="Create account" />
      </form>

      <p className="text-center text-sm text-text-secondary mt-6">
        Already have an account?{" "}
        <button onClick={() => onSwitch("signin")} className="text-brand-primary font-medium hover:underline">
          Sign in
        </button>
      </p>
    </motion.div>
  );
}

// ─── Forgot password ──────────────────────────────────────────────────────

function ForgotForm({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  const { sendPasswordReset } = useAuth();
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);

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
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to sign in
      </button>

      {sent ? (
        <div className="text-center py-6">
          <Mail className="w-12 h-12 text-brand-primary mx-auto mb-4" />
          <h2 className="text-xl font-display text-text-primary mb-2">Check your email</h2>
          <p className="text-sm text-text-secondary">
            We sent a password reset link to <strong>{email}</strong>
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-2xl font-display text-text-primary mb-1">Reset password</h2>
          <p className="text-sm text-text-secondary mb-6">
            Enter your email and we'll send you a reset link.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@university.edu" required />
            <SubmitButton loading={loading} label="Send reset link" />
          </form>
        </>
      )}
    </motion.div>
  );
}

// ─── Check email ──────────────────────────────────────────────────────────

function CheckEmail({ onSwitch }: { onSwitch: (t: Tab) => void }) {
  return (
    <motion.div key="check-email" {...slide} className="text-center py-4">
      <CheckCircle2 className="w-14 h-14 text-brand-accent mx-auto mb-4" />
      <h2 className="text-2xl font-display text-text-primary mb-2">Verify your email</h2>
      <p className="text-sm text-text-secondary mb-8 max-w-xs mx-auto">
        We've sent a confirmation link to your email. Click it to activate your account.
      </p>
      <button
        onClick={() => onSwitch("signin")}
        className="text-sm text-brand-primary hover:underline"
      >
        Back to sign in
      </button>
    </motion.div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl border border-border bg-surface-0 hover:bg-surface-2 text-text-primary text-sm font-medium transition-colors disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-text-muted">or</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl gradient-brand text-white text-sm font-medium shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => {
    const t = params.get("tab");
    if (t === "signup") return "signup";
    if (t === "forgot") return "forgot";
    return "signin";
  });

  // Keep URL in sync
  useEffect(() => {
    const url = new URL(window.location.href);
    if (tab === "signup") url.searchParams.set("tab", "signup");
    else if (tab === "forgot") url.searchParams.set("tab", "forgot");
    else url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.toString());
  }, [tab]);

  const forms: Record<Tab, React.ReactNode> = {
    signin:      <SignInForm     onSwitch={setTab} />,
    signup:      <SignUpForm     onSwitch={setTab} />,
    forgot:      <ForgotForm     onSwitch={setTab} />,
    "check-email": <CheckEmail  onSwitch={setTab} />,
  };

  return (
    <div className="min-h-dvh flex bg-surface-0">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] gradient-brand p-12">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="StudyLM" className="w-9 h-9 rounded-xl object-cover" />
          <span className="font-display text-xl text-white">StudyLM</span>
        </Link>

        <div className="text-white">
          <blockquote className="text-2xl font-display leading-snug mb-4">
            "I went from spending 4 hours making notes to 20 minutes. StudyLM is genuinely insane for exam prep."
          </blockquote>
          <p className="text-indigo-200 text-sm">— Adaeze O., University of Lagos</p>
        </div>

        <div className="flex gap-2">
          {["AI Chat", "Flashcards", "Quizzes", "Mind Maps"].map((f) => (
            <span
              key={f}
              className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/15 text-white"
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <img src="/logo.jpg" alt="StudyLM" className="w-9 h-9 rounded-xl object-cover" />
            <span className="font-display text-xl text-text-primary">StudyLM</span>
          </div>

          <AnimatePresence mode="wait">
            {forms[tab]}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
