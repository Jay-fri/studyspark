import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "driver.js/dist/driver.css";
import App from "./App";
import { registerSW } from "virtual:pwa-register";
import { initNativeApp } from "@/lib/capacitor";

// Register service worker (PWA path — no-op in native WebView)
registerSW({
  immediate: true,
  onRegistered(r) {
    console.log("SW Registered:", r);
  },
  onRegisterError(error) {
    console.log("SW registration error", error);
  },
});

initNativeApp().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
