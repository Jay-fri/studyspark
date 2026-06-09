import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useTheme } from "@/hooks/useTheme";
import { useNotebooks } from "@/hooks/useNotebook";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { MobileNav } from "./MobileNav";
import { OfflineBanner } from "./OfflineBanner";
import { PWAPrompt } from "./PWAPrompt";
import { TokenBanner } from "@/components/payment/TokenBanner";
import { PaymentModal } from "@/components/payment/PaymentModal";
import { CommandPalette } from "@/components/ui/CommandPalette";

export function AppShell() {
  useTheme();
  useNotebooks(); // Keep notebook store populated on every page, not just /notebooks/:id

  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // /notebooks/:id pages manage their own layout (tab bar replaces navbar on mobile)
  const segments = location.pathname.split("/").filter(Boolean);
  const isNotebookView = segments[0] === "notebooks" && segments.length > 1;

  // Scroll the main content area back to the top on every route change
  useEffect(() => {
    if (!isNotebookView && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, isNotebookView]);

  return (
    <div
      className="relative flex h-dvh overflow-hidden"
      style={{ background: "#0a1628" }}>
      {/* Orb 1 mobile — tight to top-left corner */}
      <div
        className="md:hidden"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.12)",
          top: "-260px",
          left: "-200px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 1 desktop — pulled inward so more glow is visible */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.12)",
          top: "-80px",
          left: "-60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 2 — mobile: right side ~55% down */}
      <div
        className="md:hidden"
        style={{
          position: "absolute",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(99, 179, 255, 0.08)",
          top: "55%",
          right: "-80px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 2 — desktop: bottom-right */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "380px",
          height: "380px",
          borderRadius: "50%",
          background: "rgba(99, 179, 255, 0.08)",
          bottom: "-80px",
          right: "-60px",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      {/* Orb 3 — mint, center (desktop only) */}
      <div
        className="hidden md:block"
        style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: "rgba(56, 224, 195, 0.05)",
          top: "45%",
          right: "28%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Desktop sidebar */}
      <div className="relative" style={{ zIndex: 1 }}>
        <Sidebar />
      </div>

      {/* Main content area */}
      <div
        className="relative flex flex-col flex-1 min-w-0 overflow-x-hidden"
        style={{ zIndex: 1 }}>
        {/* Network/token banners */}
        <OfflineBanner />
        <TokenBanner />

        {/* Top navbar */}
        <Navbar />

        {/* Page content */}
        <main
          ref={mainRef}
          className={
            isNotebookView
              ? "flex-1 overflow-hidden relative"
              : "flex-1 overflow-y-auto scrollbar-thin relative"
          }
          style={
            !isNotebookView
              ? {
                  paddingBottom:
                    "calc(5rem + env(safe-area-inset-bottom, 0px))",
                }
              : undefined
          }>
          <div className={isNotebookView ? "h-full" : "min-h-full"}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — hidden inside a specific notebook */}
      {!isNotebookView && <MobileNav />}

      {/* Global overlays */}
      <CommandPalette />
      <PaymentModal />
      <PWAPrompt />

      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "!bg-surface-1 !text-text-primary !border !border-border !shadow-md !rounded-xl !text-sm",
          duration: 4000,
        }}
      />
    </div>
  );
}
