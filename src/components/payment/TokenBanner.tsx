import { motion, AnimatePresence } from "framer-motion";
import { Zap, X } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;
const WARN_THRESHOLD     = 200;
const PULSE_THRESHOLD    = 50;

export function TokenBanner() {
  const balance               = useAuthStore((s) => s.profile?.study_tokens ?? Infinity);
  const { tokenBannerDismissedAt, dismissTokenBanner, setPaymentModalOpen } = useUIStore();

  const isDismissed =
    tokenBannerDismissedAt !== null &&
    Date.now() - tokenBannerDismissedAt < DISMISS_DURATION_MS;

  const shouldShow = balance < WARN_THRESHOLD && !isDismissed;
  const isPulsing  = balance < PULSE_THRESHOLD;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "relative flex items-center gap-3 px-4 py-2.5",
            "bg-brand-warning/10 border-b border-brand-warning/30",
            "text-sm text-text-primary z-40"
          )}
        >
          {/* Pulsing dot when critically low */}
          {isPulsing && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-danger opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-danger" />
            </span>
          )}

          <Zap
            className={cn(
              "w-4 h-4 shrink-0",
              isPulsing ? "text-brand-danger" : "text-brand-warning"
            )}
          />

          <p className="flex-1 text-xs font-medium">
            {isPulsing
              ? `Only ${balance} tokens left — top up now to keep studying`
              : `Running low on tokens — ${balance} remaining`}
          </p>

          <button
            onClick={() => setPaymentModalOpen(true)}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold text-white shrink-0 transition-opacity hover:opacity-90",
              isPulsing ? "bg-brand-danger" : "gradient-brand"
            )}
          >
            Top Up Now
          </button>

          <button
            onClick={dismissTokenBanner}
            className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
