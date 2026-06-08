import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, BookMarked, Library, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotebookStore } from "@/stores/notebookStore";

const tabs = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/notebooks", icon: BookMarked,       label: "Notebooks"  },
  { to: "/library",   icon: Library,           label: "Library"   },
  { to: "/settings",  icon: User,              label: "Profile"   },
] as const;

export function MobileNav() {
  const location  = useLocation();
  const aiOutputs = useNotebookStore((s) => s.aiOutputs);
  const activeIdx = tabs.findIndex((t) => location.pathname.startsWith(t.to));

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface-0/95 backdrop-blur-md border-t border-border safe-area-pb">
      <div className="relative flex">
        {activeIdx !== -1 && (
          <ActivePill activeIdx={activeIdx} total={tabs.length} />
        )}

        {tabs.map(({ to, icon: Icon, label }, i) => {
          const isActive    = activeIdx === i;
          const hasLibBadge = to === "/library" && aiOutputs.length > 0;

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 pt-3 pb-2 transition-colors",
                isActive ? "text-brand-primary" : "text-text-muted hover:text-text-secondary"
              )}
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
  const width = `${100 / total}%`;
  const left  = `${(activeIdx / total) * 100}%`;

  return (
    <motion.div
      className="absolute top-1.5 h-9 rounded-xl bg-brand-primary/10"
      style={{ width, left }}
      layout
      layoutId="mobile-nav-pill"
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    />
  );
}
