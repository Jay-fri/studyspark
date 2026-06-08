import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline  = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  goOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-warning)]/10 border-b border-[var(--brand-warning)]/30 text-xs font-medium text-[var(--text-primary)] z-50"
        >
          <WifiOff className="w-3.5 h-3.5 text-[var(--brand-warning)] shrink-0" />
          You're offline. Some features may not work.
        </motion.div>
      )}
    </AnimatePresence>
  );
}
