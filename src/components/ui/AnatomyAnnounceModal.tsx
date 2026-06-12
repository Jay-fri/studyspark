import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const SEEN_KEY = "studylm-anatomy-announce-v1";

export function AnatomyAnnounceModal() {
  const [open, setOpen] = useState(() => !localStorage.getItem(SEEN_KEY));
  const navigate = useNavigate();

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, "1");
    setOpen(false);
  };

  const explore = () => {
    dismiss();
    navigate("/anatomy");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="anatomy-announce-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={dismiss}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(5,12,24,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          <motion.div
            key="anatomy-announce-card"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 360,
              background: "rgba(17,29,48,0.97)",
              border: "0.5px solid rgba(56,224,195,0.22)",
              borderRadius: 16,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Glow strip at top */}
            <div style={{
              position: "absolute",
              top: 0, left: 0, right: 0,
              height: 1,
              background: "linear-gradient(90deg, transparent, rgba(56,224,195,0.5), rgba(255,255,255,0.2), transparent)",
              pointerEvents: "none",
            }} />

            {/* Hero area */}
            <div style={{
              background: "rgba(56,224,195,0.05)",
              borderBottom: "0.5px solid rgba(56,224,195,0.1)",
              padding: "28px 24px 22px",
              textAlign: "center",
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Soft orb behind icon */}
              <div style={{
                position: "absolute",
                width: 160, height: 160,
                borderRadius: "50%",
                background: "rgba(56,224,195,0.08)",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                filter: "blur(2px)",
              }} />

              {/* Icon */}
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: "rgba(56,224,195,0.12)",
                border: "0.5px solid rgba(56,224,195,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 14px",
                position: "relative",
              }}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#38E0C3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                  <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                  <circle cx="20" cy="10" r="2" />
                </svg>
              </div>

              {/* NEW badge */}
              <div style={{
                display: "inline-flex", alignItems: "center",
                background: "rgba(56,224,195,0.12)",
                border: "0.5px solid rgba(56,224,195,0.3)",
                borderRadius: 20, padding: "2px 10px",
                marginBottom: 10,
              }}>
                <span style={{
                  color: "#38E0C3", fontSize: 9.5, fontWeight: 500,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                }}>Just Launched</span>
              </div>

              <h2 style={{
                color: "#fff", fontSize: 18, fontWeight: 500,
                letterSpacing: "-0.02em", margin: "0 0 6px",
              }}>
                3D Anatomy Explorer
              </h2>
              <p style={{
                color: "rgba(255,255,255,0.45)", fontSize: 12.5, margin: 0,
                lineHeight: 1.5,
              }}>
                Explore the full human body in 3D. Tap any structure for an AI-powered breakdown — bones, organs, muscles and more.
              </p>
            </div>

            {/* Feature pills */}
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap",
              padding: "16px 20px 4px",
            }}>
              {["Interactive 3D model", "AI explanations", "Chat history", "100+ structures"].map(f => (
                <span key={f} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.09)",
                  borderRadius: 6, padding: "4px 9px",
                  color: "rgba(255,255,255,0.45)", fontSize: 10.5,
                }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Actions */}
            <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={explore}
                style={{
                  width: "100%", padding: "11px",
                  background: "rgba(56,224,195,0.12)",
                  border: "0.5px solid rgba(56,224,195,0.35)",
                  borderRadius: 10, color: "#38E0C3",
                  fontSize: 13.5, fontWeight: 500, cursor: "pointer",
                  transition: "all 150ms ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(56,224,195,0.18)")}
                onMouseLeave={e => (e.currentTarget.style.background = "rgba(56,224,195,0.12)")}
              >
                Explore Now
              </button>
              <button
                onClick={dismiss}
                style={{
                  width: "100%", padding: "9px",
                  background: "none", border: "none",
                  color: "rgba(255,255,255,0.28)", fontSize: 12,
                  cursor: "pointer", transition: "color 150ms ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
