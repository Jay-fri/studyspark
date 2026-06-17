import { motion, AnimatePresence } from "framer-motion";
import { Download, X } from "@/lib/icons";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { isNative } from "@/lib/capacitor";
import { useNavigate } from "react-router-dom";

export function PWAPrompt() {
  const { showBanner, dismiss } = usePWAInstall();
  const navigate = useNavigate();

  if (isNative) return null;

  const handleInstallClick = () => {
    dismiss();
    navigate('/download');
  };

  return (
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
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstallClick}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl gradient-brand text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                Get the App
              </button>
              <button
                onClick={dismiss}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-1)] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
