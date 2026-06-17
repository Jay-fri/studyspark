import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Share, MoreVertical } from "@/lib/icons";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { isNative } from "@/lib/capacitor";

function IOSInstructions({ browser, onDone }: { browser: "safari" | "chrome" | "other"; onDone: () => void }) {
  const steps =
    browser === "safari"
      ? [
          { icon: <Share className="w-5 h-5" />, text: 'Tap the Share button at the bottom of your screen' },
          { icon: <span className="text-lg">📋</span>, text: 'Scroll down and tap "Add to Home Screen"' },
          { icon: <span className="text-lg">✅</span>, text: 'Tap "Add" in the top right' },
        ]
      : browser === "chrome"
      ? [
          { icon: <MoreVertical className="w-5 h-5" />, text: 'Tap the three-dot menu in the top right' },
          { icon: <span className="text-lg">📋</span>, text: 'Tap "Add to Home Screen"' },
          { icon: <span className="text-lg">✅</span>, text: 'Tap "Add" to confirm' },
        ]
      : [
          { icon: <Share className="w-5 h-5" />, text: 'Open Safari and tap the Share button' },
          { icon: <span className="text-lg">📋</span>, text: 'Tap "Add to Home Screen"' },
          { icon: <span className="text-lg">✅</span>, text: 'Tap "Add" to confirm' },
        ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onDone}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="StudyLM" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Install StudyLM</p>
              <p className="text-xs text-[var(--text-muted)]">Add to your home screen</p>
            </div>
          </div>
          <button
            onClick={onDone}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-5 pb-2 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center shrink-0 mt-0.5">
                {step.icon}
              </div>
              <div className="flex-1 pt-1.5">
                <p className="text-sm text-[var(--text-primary)] leading-snug">{step.text}</p>
              </div>
              <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-[10px] font-bold text-[var(--text-muted)] shrink-0 mt-1">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Dismiss */}
        <div className="px-5 pb-5 pt-3">
          <button
            onClick={onDone}
            className="w-full py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
          >
            Got it
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function PWAPrompt() {
  const { showBanner, install, dismiss, isIOS, isSafari } = usePWAInstall();

  if (isNative) return null;
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleInstallClick = () => {
    if (isIOS) { setShowIOSGuide(true); return; }
    install();
  };

  const handleDismissIOSGuide = () => {
    setShowIOSGuide(false);
    dismiss();
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-24 md:bottom-6 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80"
          >
            <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="StudyLM" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Install StudyLM</p>
                  <p className="text-xs text-[var(--text-muted)]">Study offline, anytime</p>
                </div>
              </div>

              {/* Buttons on second row so they're always visible */}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl gradient-brand text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isIOS ? "How to Install" : "Install"}
                </button>
                <button
                  onClick={dismiss}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showIOSGuide && (
          <IOSInstructions
            browser={isSafari ? "safari" : "chrome"}
            onDone={handleDismissIOSGuide}
          />
        )}
      </AnimatePresence>
    </>
  );
}
