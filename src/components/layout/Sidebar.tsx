import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookMarked,
  Library,
  Settings,
  Shield,
  ChevronLeft,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/notebooks", icon: BookMarked,       label: "Notebooks"  },
  { to: "/library",   icon: Library,           label: "Library"   },
  { to: "/settings",  icon: Settings,          label: "Settings"  },
] as const;

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebarCollapsed, setPaymentModalOpen } = useUIStore();
  const { user, profile, isAdmin, signOut: storeSignOut } = useAuthStore();
  const navigate = useNavigate();

  const balance  = profile?.study_tokens ?? 0;
  const initials = (profile?.full_name ?? user?.email ?? "S")[0].toUpperCase();

  const tokenPct   = Math.min((balance / 1000) * 100, 100);
  const tokenColor =
    balance < 50  ? "var(--brand-danger)"
    : balance < 100 ? "var(--brand-warning)"
    : "var(--brand-primary)";
  const tokenBg =
    balance < 50  ? "rgba(239,68,68,0.1)"
    : balance < 100 ? "rgba(245,158,11,0.1)"
    : "var(--orange-bg)";
  const tokenBorder =
    balance < 50  ? "rgba(239,68,68,0.2)"
    : balance < 100 ? "rgba(245,158,11,0.2)"
    : "rgba(249,115,22,0.2)";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    storeSignOut();
    navigate("/");
  };

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 60 : 248 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="hidden md:flex relative flex-col h-full shrink-0 overflow-hidden"
      style={{
        background: "var(--surface-1)",
        borderRight: "0.5px solid var(--border)",
      }}
    >
      {/* ── Logo ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-center h-14 px-3 shrink-0"
        style={{ borderBottom: "0.5px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <img
            src="/logo.jpg"
            alt="StudyLM"
            className="w-7 h-7 rounded-lg object-cover shrink-0"
          />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.14 }}
                className="font-display text-[15px] whitespace-nowrap truncate"
                style={{ color: "var(--text-primary)" }}
              >
                StudyLM
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={toggleSidebarCollapsed}
              className="p-1.5 rounded-lg transition-colors shrink-0 ml-1"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-none">

        {/* Expand button when collapsed */}
        {sidebarCollapsed && (
          <div className="flex justify-center mb-2">
            <button
              onClick={toggleSidebarCollapsed}
              className="w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-2)"; e.currentTarget.style.color = "var(--text-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
              title="Expand sidebar"
            >
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        )}

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={sidebarCollapsed ? label : undefined}
            className={({ isActive }) =>
              cn(
                "relative flex items-center rounded-xl transition-all duration-150 group",
                sidebarCollapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "gap-3 px-3 py-2.5",
                isActive
                  ? "text-[var(--brand-primary)]"
                  : "hover:text-[var(--text-secondary)]"
              )
            }
            style={({ isActive }) =>
              isActive
                ? { background: "rgba(249,115,22,0.08)" }
                : {}
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg shrink-0 transition-all duration-150",
                    sidebarCollapsed ? "w-9 h-9" : "w-7 h-7"
                  )}
                  style={{
                    background: isActive
                      ? "rgba(249,115,22,0.12)"
                      : "transparent",
                    color: isActive
                      ? "var(--brand-primary)"
                      : "var(--text-muted)",
                  }}
                >
                  <Icon className={sidebarCollapsed ? "w-[17px] h-[17px]" : "w-[15px] h-[15px]"} />
                </div>

                {!sidebarCollapsed && (
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: isActive ? "var(--brand-primary)" : "var(--text-secondary)" }}
                  >
                    {label}
                  </span>
                )}

                {/* Active dot (collapsed) */}
                {sidebarCollapsed && isActive && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--brand-primary)" }}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        {isAdmin && (
          <NavLink
            to="/admin"
            title={sidebarCollapsed ? "Admin" : undefined}
            className={({ isActive }) =>
              cn(
                "relative flex items-center rounded-xl transition-all duration-150 group",
                sidebarCollapsed
                  ? "w-10 h-10 mx-auto justify-center"
                  : "gap-3 px-3 py-2.5",
                isActive ? "text-[var(--brand-primary)]" : ""
              )
            }
            style={({ isActive }) =>
              isActive ? { background: "rgba(249,115,22,0.08)" } : {}
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "flex items-center justify-center rounded-lg shrink-0",
                    sidebarCollapsed ? "w-9 h-9" : "w-7 h-7"
                  )}
                  style={{
                    background: isActive ? "rgba(249,115,22,0.12)" : "transparent",
                    color: isActive ? "var(--brand-primary)" : "var(--text-muted)",
                  }}
                >
                  <Shield className={sidebarCollapsed ? "w-[17px] h-[17px]" : "w-[15px] h-[15px]"} />
                </div>
                {!sidebarCollapsed && (
                  <span
                    className="text-sm font-medium"
                    style={{ color: isActive ? "var(--brand-primary)" : "var(--text-secondary)" }}
                  >
                    Admin
                  </span>
                )}
                {sidebarCollapsed && isActive && (
                  <span
                    className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--brand-primary)" }}
                  />
                )}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* ── Token balance ───────────────────────────────────────────────── */}
      <div
        className={cn("shrink-0", sidebarCollapsed ? "px-2 py-2" : "px-3 py-3")}
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {sidebarCollapsed ? (
          <button
            onClick={() => setPaymentModalOpen(true)}
            title={`${balance} tokens`}
            className="w-10 h-10 flex items-center justify-center rounded-xl mx-auto transition-colors"
            style={{ background: tokenBg, color: tokenColor }}
          >
            <Zap className="w-4 h-4" />
          </button>
        ) : (
          <div
            className="rounded-xl px-3 py-2.5"
            style={{ background: tokenBg, border: `0.5px solid ${tokenBorder}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 shrink-0" style={{ color: tokenColor }} />
                <span className="text-[11px] font-semibold" style={{ color: tokenColor }}>
                  {balance >= 1000 ? `${(balance / 1000).toFixed(1)}k` : balance} tokens
                </span>
              </div>
              {balance < 300 && (
                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="text-[10px] font-semibold hover:opacity-70 transition-opacity"
                  style={{ color: tokenColor }}
                >
                  Top Up →
                </button>
              )}
            </div>
            <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: `${tokenColor}20` }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: tokenColor }}
                animate={{ width: `${tokenPct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── User ───────────────────────────────────────────────────────── */}
      <div
        className={cn("shrink-0", sidebarCollapsed ? "px-2 pb-3" : "px-3 pb-3")}
        style={{ borderTop: "0.5px solid var(--border-subtle)" }}
      >
        {sidebarCollapsed ? (
          <button
            onClick={toggleSidebarCollapsed}
            className="w-10 h-10 flex items-center justify-center rounded-xl mx-auto mt-2 hover:bg-[var(--surface-2)] transition-colors"
            title={profile?.full_name ?? user?.email ?? "User"}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: "rgba(249,115,22,0.15)" }}
              >
                <span className="text-[11px] font-bold" style={{ color: "var(--brand-primary)" }}>
                  {initials}
                </span>
              </div>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-2.5 px-1 pt-2">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(249,115,22,0.15)" }}
              >
                <span className="text-sm font-bold" style={{ color: "var(--brand-primary)" }}>
                  {initials}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {profile?.full_name ?? "Student"}
              </p>
              <p className="text-[10px] truncate" style={{ color: "var(--text-dim)" }}>
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-1.5 rounded-lg transition-colors shrink-0"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--brand-danger)"; e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-dim)"; e.currentTarget.style.background = "transparent"; }}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
