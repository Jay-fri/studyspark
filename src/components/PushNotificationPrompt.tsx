import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const STORAGE_KEY = "studyai_push_prompted";

export function PushNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const { isSupported, permission, subscribe, isLoading } = usePushNotifications();

  useEffect(() => {
    if (!isSupported || permission !== "default" || localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [isSupported, permission]);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  const handleEnable = async () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
    await subscribe();
  };

  return (
    <div
      className="fixed z-50 bottom-24 md:bottom-6 left-0 right-0 md:left-auto md:right-6 md:w-80 px-4 md:px-0"
      style={{ pointerEvents: "auto" }}>
      <div
        style={{
          background: "rgba(17,29,48,0.95)",
          backdropFilter: "blur(20px)",
          border: "0.5px solid rgba(56,224,195,0.22)",
          borderRadius: "12px",
          padding: "16px",
        }}>
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
            style={{
              width: 36,
              height: 36,
              background: "rgba(56,224,195,0.1)",
              border: "0.5px solid rgba(56,224,195,0.2)",
            }}>
            <Bell size={16} style={{ color: "#38E0C3" }} />
          </div>

          <div className="flex-1 min-w-0">
            <p
              className="font-medium"
              style={{ color: "#fff", fontSize: 13, letterSpacing: "-0.01em" }}>
              Stay in the loop
            </p>
            <p
              className="mt-0.5"
              style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, lineHeight: "1.45" }}>
              Get notified when friends challenge you or new features drop.
            </p>

            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                style={{
                  background: "rgba(56,224,195,0.12)",
                  border: "0.5px solid rgba(56,224,195,0.3)",
                  borderRadius: 8,
                  color: "#38E0C3",
                  fontSize: 12,
                  fontWeight: 500,
                  padding: "6px 14px",
                  cursor: isLoading ? "wait" : "pointer",
                  transition: "all 150ms ease",
                  minHeight: 32,
                }}>
                {isLoading ? "Enabling…" : "Enable notifications"}
              </button>
              <button
                onClick={dismiss}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "6px 8px",
                  minHeight: 32,
                  transition: "all 150ms ease",
                }}>
                Later
              </button>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="flex-shrink-0"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "rgba(255,255,255,0.3)",
              lineHeight: 1,
            }}>
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
