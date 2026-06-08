import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { useTheme } from "@/hooks/useTheme";
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
  const location = useLocation();
  const routeKey = location.pathname.split("/")[1] ?? "/";

  // /notebooks/:id pages manage their own layout (tab bar replaces navbar on mobile)
  const segments       = location.pathname.split("/").filter(Boolean);
  const isNotebookView = segments[0] === "notebooks" && segments.length > 1;

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
        <main className={
          isNotebookView
            ? "flex-1 overflow-hidden relative"
            : "flex-1 overflow-y-auto scrollbar-thin pb-28 md:pb-0 relative"
        }>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14, ease: "easeOut" }}
              className="h-full bg-[var(--surface-0)]"
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
