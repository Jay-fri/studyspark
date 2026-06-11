import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function useBackGuard(active: boolean) {
  const [showQuit, setShowQuit] = useState(false);

  useEffect(() => {
    if (!active) return;
    // Push a dummy history entry so the first "back" hits us, not the previous page
    window.history.pushState(null, "", window.location.href);
    const handler = () => {
      // Re-push to stay on this page
      window.history.pushState(null, "", window.location.href);
      setShowQuit(true);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [active]);

  return { showQuit, setShowQuit };
}

export function QuitGameModal({
  onConfirm,
  onCancel,
  message = "Are you sure you want to quit this game?",
}: {
  onConfirm: () => void;
  onCancel: () => void;
  message?: string;
}) {
  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-5"
        style={{ background: "rgba(10,22,40,0.8)", backdropFilter: "blur(12px)" }}
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.88, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="w-full max-w-xs rounded-2xl p-6"
          style={{
            background: "rgba(17,29,48,0.99)",
            border: "0.5px solid rgba(255,255,255,0.1)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-5">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl"
              style={{ background: "rgba(239,68,68,0.1)", border: "0.5px solid rgba(239,68,68,0.2)" }}
            >
              🚪
            </div>
            <h3
              className="text-base font-medium mb-1"
              style={{ color: "#fff", fontFamily: "Space Grotesk, sans-serif", letterSpacing: "-0.02em" }}
            >
              Quit game?
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
              {message}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "0.5px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              Keep playing
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "0.5px solid rgba(239,68,68,0.25)",
                color: "rgba(239,68,68,0.9)",
              }}
            >
              Quit
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
