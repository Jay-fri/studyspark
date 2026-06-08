import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, Check, Loader2,
  CreditCard, Building2, Smartphone, ShieldCheck,
} from "lucide-react";
import { useUIStore }      from "@/stores/uiStore";
import { useFlutterwave }  from "@/hooks/useFlutterwave";
import { useAuthStore }    from "@/stores/authStore";
import { TOKEN_PACKAGES }  from "@/types";
import { cn }              from "@/lib/utils";

// How many of each action a package unlocks (based on TOKEN_COSTS)
const PACKAGE_VALUE: Record<string, { label: string; count: number }[]> = {
  Starter:   [{ label: "AI chats",   count: 200 }, { label: "summaries",  count: 50  }, { label: "quizzes", count: 40 }],
  "Study Pro":[{ label: "AI chats",  count: 1000},  { label: "summaries", count: 250 }, { label: "quizzes", count: 200 }],
  Scholar:   [{ label: "AI chats",  count: 3000},  { label: "summaries", count: 750 }, { label: "quizzes", count: 600 }],
};

const PAYMENT_METHODS = [
  { icon: CreditCard,  label: "Card"  },
  { icon: Building2,   label: "Bank"  },
  { icon: Smartphone,  label: "USSD"  },
];

export function PaymentModal() {
  const { paymentModalOpen, setPaymentModalOpen } = useUIStore();
  const { topUp, isLoading } = useFlutterwave();
  const balance = useAuthStore((s) => s.profile?.study_tokens ?? 0);
  const [selected, setSelected] = useState(1);

  const close = () => { if (!isLoading) setPaymentModalOpen(false); };

  const handlePurchase = async () => {
    const pkg = TOKEN_PACKAGES[selected];
    await topUp(pkg.price_ngn, pkg.tokens);
    setPaymentModalOpen(false);
  };

  const pkg = TOKEN_PACKAGES[selected];

  return (
    <AnimatePresence>
      {paymentModalOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          <motion.div
            className="relative w-full max-w-md bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          >

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">Top Up Tokens</h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    Balance:{" "}
                    <span className="font-semibold text-[var(--brand-primary)]">
                      {balance.toLocaleString()} tokens
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={close}
                disabled={isLoading}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] disabled:opacity-40 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6 space-y-3">
              {/* Package selector */}
              {TOKEN_PACKAGES.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => setSelected(i)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-150",
                    selected === i
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand-primary)]/40"
                  )}
                >
                  {/* Radio dot */}
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                      selected === i
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                        : "border-[var(--border)]"
                    )}
                  >
                    {selected === i && (
                      <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{p.label}</span>
                      {p.popular && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full gradient-brand text-white">
                          Popular
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {p.tokens.toLocaleString()} tokens
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      ₦{p.price_ngn.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      ₦{(p.price_ngn / p.tokens).toFixed(2)}/token
                    </p>
                  </div>
                </button>
              ))}

              {/* Value breakdown */}
              <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] px-4 py-3">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-2">
                  What you get with {pkg.tokens.toLocaleString()} tokens
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {(PACKAGE_VALUE[pkg.label] ?? []).map(({ label, count }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
                    >
                      <Check className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                      <span className="font-medium text-[var(--text-primary)]">
                        {count.toLocaleString()}
                      </span>{" "}
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Payment methods row */}
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-[var(--text-muted)] shrink-0">Pay with:</p>
                <div className="flex gap-1.5">
                  {PAYMENT_METHODS.map(({ icon: Icon, label }) => (
                    <span
                      key={label}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[10px] text-[var(--text-muted)]"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handlePurchase}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl gradient-brand text-white text-sm font-semibold shadow-md hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {isLoading
                  ? "Processing…"
                  : `Pay ₦${pkg.price_ngn.toLocaleString()}`}
              </motion.button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[var(--text-muted)]">
                <ShieldCheck className="w-3 h-3" />
                Secured by Flutterwave · NGN payments only
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
