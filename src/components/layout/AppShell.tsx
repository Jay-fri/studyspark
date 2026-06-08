import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
  const routeKey = location.pathname.split("/")[1] ?? "/";
  const mainRef  = useRef<HTMLElement>(null);

  // /notebooks/:id pages manage their own layout (tab bar replaces navbar on mobile)
  const segments       = location.pathname.split("/").filter(Boolean);
  const isNotebookView = segments[0] === "notebooks" && segments.length > 1;

  // Scroll the main content area back to the top on every route change
  useEffect(() => {
    if (!isNotebookView && mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.pathname, isNotebookView]);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-0">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Network/token banners */}
        <OfflineBanner />
        <TokenBanner />

        {/* Top navbar — hidden on mobile when inside a specific notebook */}
        <div className={isNotebookView ? "hidden md:contents" : "contents"}>
          <Navbar />
        </div>

        {/* Page content with transition */}
        <main ref={mainRef} className={
          isNotebookView
            ? "flex-1 overflow-hidden relative"
            : "flex-1 overflow-y-auto scrollbar-thin relative"
          }
          style={!isNotebookView ? {
            paddingBottom: "calc(5rem + env(safe-area-inset-bottom, 0px))"
          } : undefined}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className={isNotebookView ? "h-full bg-[var(--surface-0)]" : "min-h-full bg-[var(--surface-0)]"}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
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
