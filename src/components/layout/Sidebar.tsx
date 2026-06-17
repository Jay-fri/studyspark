import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, BookMarked, Library, Settings, Shield, LogOut, Dna, MessageSquare, Coffee,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { activeTour } from "@/hooks/useTour";
import { AnimatedHamburger } from "@/components/ui/AnimatedHamburger";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard",  tourId: "tour-sidebar-home"      },
  { to: "/notebooks", icon: BookMarked,       label: "Notebooks",  tourId: "tour-sidebar-notebooks" },
  { to: "/library",   icon: Library,          label: "Library",    tourId: "tour-sidebar-library"   },
  { to: "/anatomy",   icon: Dna,              label: "Anatomy 3D", tourId: "tour-sidebar-anatomy"   },
  { to: "/break",     icon: Coffee,           label: "Break Room", tourId: "tour-break-room"        },
  { to: "/feedback",  icon: MessageSquare,    label: "Feedback",   tourId: "tour-sidebar-feedback"  },
  { to: "/settings",  icon: Settings,         label: "Settings",   tourId: "tour-sidebar-settings"  },
] as const;

function TokenDots({ balance, max = 1000 }: { balance: number; max?: number }) {
  const total = 8;
  const filled = Math.round((Math.min(balance, max) / max) * total);
  const color =
    balance < 50  ? "#EF4444" :
    balance < 200 ? "#F59E0B" :
    "#38E0C3";
  return (
    <div className="flex gap-1 items-center">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: i < filled ? color : "var(--border)",
            opacity: i < filled ? 1 : 0.5,
          }}
        />
      ))}
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed, setPaymentModalOpen } = useUIStore();
  const { user, profile, isAdmin, signOut: storeSignOut } = useAuthStore();
  const navigate = useNavigate();

  const balance  = profile?.study_tokens ?? 0;
  const initials = (profile?.full_name ?? user?.email ?? "S")[0].toUpperCase();
  const name     = profile?.full_name ?? user?.email?.split("@")[0] ?? "Student";

  const tokenColor =
    balance < 50  ? "#EF4444" :
    balance < 200 ? "#F59E0B" :
    "#38E0C3";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    storeSignOut();
    navigate("/");
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="hidden md:flex relative flex-col h-full shrink-0 overflow-hidden dark:backdrop-blur-[20px]"
      style={{
        background: "var(--surface-1)",
        borderRight: "0.5px solid var(--border)",
      }}
    >
      {/* ── Logo row ──────────────────────────────────────────────────────── */}
      <div className={cn("flex items-center h-14 shrink-0", sidebarCollapsed ? "justify-center" : "px-3")}>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              className="flex items-center gap-2.5 flex-1 min-w-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <img src="/logo.jpg" alt="StudyLM" className="w-7 h-7 rounded-lg object-cover shrink-0" />
              <span className="font-display text-sm whitespace-nowrap truncate" style={{ color: "var(--text-primary)" }}>
                StudyLM
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hamburger: centered when collapsed, right-aligned when expanded */}
        <div className={cn(sidebarCollapsed ? "" : "ml-auto")}>
          <AnimatedHamburger
            active={!sidebarCollapsed}
            onClick={toggleSidebarCollapsed}
            size={28}
          />
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto scrollbar-none">

        {NAV_ITEMS.map(({ to, icon: Icon, label, tourId }) => (
          <NavLink
            key={to}
            to={to}
            id={tourId}
            title={sidebarCollapsed ? label : undefined}
            className="block relative group"
            onClick={() => {
              if (activeTour.pendingNotebooksNav && to === "/notebooks") {
                activeTour.pendingNotebooksNav = false;
                activeTour.waitForThenNext("#tour-notebook-demo-card");
              }
            }}
          >
            {({ isActive }) => (
              <div
                className={cn(
                  "relative flex items-center rounded-xl transition-colors duration-150",
                  sidebarCollapsed ? "w-9 h-9 mx-auto justify-center" : "gap-3 px-3 py-2.5"
                )}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Sliding background pill */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-[9px] pointer-events-none"
                    style={{
                      background: "rgba(56,224,195,0.08)",
                      border: "0.5px solid rgba(56,224,195,0.18)",
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}

                <Icon
                  className="w-[15px] h-[15px] shrink-0 relative z-10"
                  style={{ color: isActive ? "var(--brand-primary)" : "var(--text-muted)" }}
                />

                {!sidebarCollapsed && (
                  <span
                    className="text-sm font-medium truncate relative z-10"
                    style={{ color: isActive ? "var(--brand-primary)" : "var(--text-secondary)" }}
                  >
                    {label}
                  </span>
                )}

                {/* Active dot when collapsed */}
                {sidebarCollapsed && isActive && (
                  <span
                    className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full z-10"
                    style={{ background: "var(--brand-primary)" }}
                  />
                )}
              </div>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink to="/admin" title={sidebarCollapsed ? "Admin" : undefined} className="block relative group">
            {({ isActive }) => (
              <div
                className={cn(
                  "relative flex items-center rounded-xl transition-colors duration-150",
                  sidebarCollapsed ? "w-9 h-9 mx-auto justify-center" : "gap-3 px-3 py-2.5"
                )}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 rounded-[9px] pointer-events-none"
                    style={{ background: "rgba(56,224,195,0.08)", border: "0.5px solid rgba(56,224,195,0.18)" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <Shield className="w-[15px] h-[15px] shrink-0 relative z-10" style={{ color: isActive ? "var(--brand-primary)" : "var(--text-muted)" }} />
                {!sidebarCollapsed && (
                  <span className="text-sm font-medium relative z-10" style={{ color: isActive ? "var(--brand-primary)" : "var(--text-secondary)" }}>
                    Admin
                  </span>
                )}
                {sidebarCollapsed && isActive && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full z-10" style={{ background: "var(--brand-primary)" }} />
                )}
              </div>
            )}
          </NavLink>
        )}
      </nav>

      {/* ── Token indicator ───────────────────────────────────────────────── */}
      <div
        id="tour-token-badge"
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {sidebarCollapsed ? (
          <button
            onClick={() => setPaymentModalOpen(true)}
            title={`${balance} tokens`}
            className="w-8 h-8 flex items-center justify-center rounded-full mx-auto transition-colors"
            style={{ background: `${tokenColor}18` }}
          >
            <span className="text-[9px] font-bold" style={{ color: tokenColor }}>⚡</span>
          </button>
        ) : (
          <button
            onClick={() => setPaymentModalOpen(true)}
            className="w-full text-left group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>
                {balance >= 1000 ? `${(balance / 1000).toFixed(1)}k` : balance} tokens
              </span>
              <span
                className="text-[10px] font-semibold transition-opacity"
                style={{ color: "var(--brand-primary)" }}
              >
                Top up →
              </span>
            </div>
            <TokenDots balance={balance} />
          </button>
        )}
      </div>

      {/* ── User ──────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 px-3"
        style={{
          borderTop: "0.5px solid var(--border-subtle)",
          paddingBottom: "max(16px, env(safe-area-inset-bottom, 0px))",
        }}
      >
        {sidebarCollapsed ? (
          <button
            onClick={toggleSidebarCollapsed}
            className="w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-3 transition-colors hover:ring-2 hover:ring-[var(--border)]"
            title={name}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(56,224,195,0.15)", color: "var(--brand-primary)" }}
              >
                {initials}
              </div>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 mt-3 group">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "rgba(56,224,195,0.15)", color: "var(--brand-primary)" }}
              >
                {initials}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {name}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-dim)" }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg transition-all shrink-0"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={e => { e.currentTarget.style.color = "var(--brand-danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
