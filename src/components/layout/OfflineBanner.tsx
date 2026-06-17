import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "@/lib/icons";
import { Network } from "@capacitor/network";
import { isNative } from "@/lib/capacitor";

type NetStatus = "offline" | "slow" | "online";

function getWebNetStatus(): NetStatus {
  if (!navigator.onLine) return "offline";
  const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  if (conn?.effectiveType === "slow-2g" || conn?.effectiveType === "2g") return "slow";
  return "online";
}

export function OfflineBanner() {
  const [status, setStatus] = useState<NetStatus>("online");

  useEffect(() => {
    if (isNative) {
      Network.getStatus().then(s => setStatus(s.connected ? "online" : "offline"));
      const listenerPromise = Network.addListener("networkStatusChange", s =>
        setStatus(s.connected ? "online" : "offline")
      );
      return () => {
        listenerPromise.then(l => l.remove());
      };
    } else {
      setStatus(getWebNetStatus());
      const update = () => setStatus(getWebNetStatus());
      window.addEventListener("offline", update);
      window.addEventListener("online", update);
      const conn = (navigator as unknown as { connection?: EventTarget }).connection;
      conn?.addEventListener("change", update);
      return () => {
        window.removeEventListener("offline", update);
        window.removeEventListener("online", update);
        conn?.removeEventListener("change", update);
      };
    }
  }, []);

  const visible = status !== "online";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <div
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium"
            style={{
              background: status === "offline"
                ? "rgba(239,68,68,0.08)"
                : "rgba(234,179,8,0.08)",
              borderBottom: status === "offline"
                ? "0.5px solid rgba(239,68,68,0.2)"
                : "0.5px solid rgba(234,179,8,0.2)",
              color: status === "offline"
                ? "rgba(239,68,68,0.9)"
                : "rgba(234,179,8,0.9)",
            }}
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            {status === "offline"
              ? "You're offline — changes will sync when you reconnect."
              : "Slow connection detected — some content may take longer to load."
            }
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
