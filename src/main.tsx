import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "driver.js/dist/driver.css";
import App from "./App";
import { registerSW } from "virtual:pwa-register";
import { initNativeApp } from "@/lib/capacitor";

// Register service worker.
// onNeedRefresh fires when a new SW build is waiting to activate. We dispatch
// a custom event so any component (UpdateBanner) can pick it up and prompt
// the user to reload — without coupling main.tsx to React component internals.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Make the update function available globally so UpdateBanner can call it.
    (window as any).__swUpdate = () => updateSW(true);
    window.dispatchEvent(new CustomEvent("sw-update-available"));
  },
  onOfflineReady() {
    // App is cached and ready offline — no user action needed.
  },
  onRegistered(registration) {
    if (!registration) return;
    // Check for updates on page focus and every 30 minutes while the page is open.
    // This is how users get new deployments without needing to clear cache manually.
    const checkUpdate = () => registration.update().catch(() => {});
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkUpdate();
    });
    setInterval(checkUpdate, 30 * 60 * 1000);
  },
});

initNativeApp().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
