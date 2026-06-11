import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BookMarked, Library, Plus, Coffee } from "@/lib/icons";
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
  const navigate  = useNavigate();
  const aiOutputs = useNotebookStore((s) => s.aiOutputs);

  const getIsActive = (to: string) => {
    const tabPath = to.split("?")[0];
    return location.pathname.startsWith(tabPath);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.06]"
      style={{
        background: "rgba(10,22,40,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="flex items-center justify-around h-[68px] px-2">
        {TABS.map(({ to, icon: Icon, label, isFab, tourId }) => {
          const isActive = !isFab && getIsActive(to);
          const hasLibBadge = to.startsWith("/library") && aiOutputs.length > 0;

          if (isFab) {
            return (
              <motion.button
                key={to}
                onClick={() => navigate(to)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.08 }}
                className="flex flex-col items-center gap-1 flex-1"
              >
                <motion.div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "rgba(56,224,195,0.15)",
                    border: "0.5px solid rgba(56,224,195,0.3)",
                  }}
                  whileTap={{ rotate: 90 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <Icon className="w-4 h-4" style={{ color: "#38E0C3" }} />
                </motion.div>
                <span className="text-[10px]" style={{ color: "rgba(56,224,195,0.5)" }}>
                  {label}
                </span>
              </motion.button>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              id={tourId}
              className="flex flex-col items-center gap-1 flex-1 relative py-2 rounded-xl"
              onClick={() => {
                if (activeTour.pendingNotebooksNav && to === "/notebooks") {
                  activeTour.pendingNotebooksNav = false;
                  activeTour.waitForThenNext("#tour-notebook-demo-card");
                }
              }}
            >
              {/* Sliding background pill */}
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  style={{
                    background: "rgba(56,224,195,0.08)",
                    border: "0.5px solid rgba(56,224,195,0.15)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div className="relative">
                <motion.div
                  animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className="w-5 h-5 relative z-10 transition-colors duration-200"
                    style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.3)" }}
                  />
                </motion.div>
                {hasLibBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#38E0C3]" />
                )}
              </div>

              <motion.span
                className="text-[10px] relative z-10 transition-colors duration-200"
                style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.3)" }}
                animate={{ opacity: isActive ? 1 : 0.7 }}
              >
                {label}
              </motion.span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
