import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BookMarked, Library, Plus, Coffee } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useNotebookStore } from "@/stores/notebookStore";
import { activeTour } from "@/hooks/useTour";

type Tab = { to: string; icon: React.ElementType; label: string; isFab: boolean; tourId?: string };

const TABS: Tab[] = [
  { to: "/dashboard",          icon: LayoutDashboard, label: "Home",      isFab: false, tourId: "tour-nav-home"      },
  { to: "/notebooks",          icon: BookMarked,      label: "Notebooks", isFab: false, tourId: "tour-nav-notebooks" },
  { to: "/notebooks?create=1", icon: Plus,            label: "New",       isFab: true                               },
  { to: "/library",            icon: Library,         label: "Library",   isFab: false, tourId: "tour-nav-library"   },
  { to: "/break",              icon: Coffee,          label: "Break",     isFab: false, tourId: "tour-break-room"    },
];

export function MobileNav() {
  const location  = useLocation();
  const aiOutputs = useNotebookStore((s) => s.aiOutputs);

  const tabs = TABS;

  const activeIdx = tabs.findIndex((t) => {
    const tabPath = t.to.split("?")[0];
    return location.pathname.startsWith(tabPath) && !t.isFab;
  });

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border"
      style={{
        background: "rgba(10,22,40,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div className="relative flex h-[68px] safe-area-pb">
        {activeIdx !== -1 && (
          <ActivePill activeIdx={activeIdx} total={tabs.length} />
        )}

        {tabs.map(({ to, icon: Icon, label, isFab, tourId }, i) => {
          const isActive    = activeIdx === i;
          const hasLibBadge = to.startsWith("/library") && aiOutputs.length > 0;

          if (isFab) {
            return (
              <NavLink
                key={to}
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative z-10"
              >
                <div
                  className="w-9 h-9 rounded-[12px] flex items-center justify-center"
                  style={{
                    background: "rgba(56,224,195,0.18)",
                    border: "1px solid rgba(56,224,195,0.35)",
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#38E0C3" }} />
                </div>
                <span className="text-[10px] font-medium" style={{ color: "rgba(56,224,195,0.75)" }}>
                  {label}
                </span>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              id={tourId}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 relative z-10 transition-colors",
                isActive ? "text-[#38E0C3]" : "text-text-muted hover:text-text-secondary"
              )}
              onClick={() => {
                if (activeTour.pendingNotebooksNav && to === "/notebooks") {
                  activeTour.pendingNotebooksNav = false;
                  activeTour.waitForThenNext("#tour-notebook-demo-card");
                }
              }}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {hasLibBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-accent" />
                )}
              </div>
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function ActivePill({ activeIdx, total }: { activeIdx: number; total: number }) {
  return (
    <motion.div
      className="absolute inset-y-1.5 rounded-xl"
      style={{
        width: `${100 / total}%`,
        left: `${(activeIdx / total) * 100}%`,
        background: "rgba(56,224,195,0.08)",
      }}
      layout
      layoutId="mobile-nav-pill"
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    />
  );
}
