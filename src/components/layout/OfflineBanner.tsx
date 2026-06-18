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
  const isOffline = status === "offline";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 68px)",
            right: "16px",
            zIndex: 100,
            maxWidth: "260px",
            pointerEvents: "none",
          }}
        >
          <div
            className="flex items-center gap-2 text-xs font-medium"
            style={{
              padding: "9px 14px",
              borderRadius: "10px",
              background: isOffline ? "rgba(239,68,68,0.12)" : "rgba(234,179,8,0.12)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: isOffline
                ? "0.5px solid rgba(239,68,68,0.25)"
                : "0.5px solid rgba(234,179,8,0.25)",
              color: isOffline ? "rgba(239,68,68,0.9)" : "rgba(234,179,8,0.9)",
            }}
          >
            <WifiOff className="w-3.5 h-3.5 shrink-0" />
            <span>{isOffline ? "No internet connection" : "Slow connection"}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
