import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, Link, NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Search,
  Bell,
  ChevronRight,
  User,
  Settings,
  LogOut,
  X,
  LayoutDashboard,
  BookMarked,
  Library,
  CheckCheck,
  Dna,
  Shield,
  MessageSquare,
  Coffee,
} from "@/lib/icons";
import { AnimatedHamburger } from "@/components/ui/AnimatedHamburger";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useNotebookStore } from "@/stores/notebookStore";
import { supabase } from "@/services/supabase";
import { useAnnouncements } from "@/hooks/useAnnouncements";

// Map pathnames to breadcrumb labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  notebooks: "Notebooks",
  library:   "Library",
  settings:  "Settings",
  anatomy:   "Anatomy 3D",
  upload:    "Upload",
  chat:      "Chat",
  flashcards:"Flashcards",
  quiz:      "Quiz",
  progress:  "Progress",
  admin:     "Admin",
};

function useBreadcrumb() {
  const { pathname }     = useLocation();
  const segments         = pathname.split("/").filter(Boolean);
  const activeNotebook   = useNotebookStore((s) => s.activeNotebook);
  const notebooks        = useNotebookStore((s) => s.notebooks);

  return segments.map((seg, i) => {
    const href = "/" + segments.slice(0, i + 1).join("/");
    let label  = ROUTE_LABELS[seg];

    if (!label) {
      // Resolve notebook ID to its title
      if (i > 0 && segments[i - 1] === "notebooks") {
        const nb = (activeNotebook?.id === seg ? activeNotebook : null)
          ?? notebooks.find((n) => n.id === seg);
        label = nb ? nb.title : "Notebook";
      } else {
        label = seg.charAt(0).toUpperCase() + seg.slice(1);
      }
    }

    return { label, href };
  });
}

const MOBILE_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard"  },
  { to: "/notebooks", icon: BookMarked,       label: "Notebooks"  },
  { to: "/library",   icon: Library,          label: "Library"    },
  { to: "/anatomy",   icon: Dna,              label: "Anatomy 3D" },
  { to: "/break",     icon: Coffee,           label: "Break Room" },
  { to: "/feedback",  icon: MessageSquare,    label: "Feedback"   },
  { to: "/settings",  icon: Settings,         label: "Settings"   },
];

export function Navbar() {
  const { mobileDrawerOpen, setMobileDrawerOpen, setCommandPaletteOpen, setPaymentModalOpen } = useUIStore();
  const { user, profile, isAdmin, signOut: storeSignOut } = useAuthStore();
  const navigate   = useNavigate();
  const breadcrumb = useBreadcrumb();

  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [bellOpen, setBellOpen]           = useState(false);
  const [bellPos, setBellPos]             = useState<{ top: number; right: number } | null>(null);
  const [userMenuPos, setUserMenuPos]     = useState<{ top: number; right: number } | null>(null);
  const [expandedNotifId, setExpandedNotifId] = useState<string | null>(null);
  const userMenuRef    = useRef<HTMLDivElement>(null);
  const bellRef        = useRef<HTMLDivElement>(null);
  const bellBtnRef     = useRef<HTMLButtonElement>(null);
  const userMenuBtnRef = useRef<HTMLButtonElement>(null);

  const { announcements, readIds, unreadCount, markRead, markAllRead } = useAnnouncements();

  // Outside-click handling is done by the fixed inset-0 overlay in portals.

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    storeSignOut();
    navigate("/");
  };

  const initials = (profile?.full_name ?? user?.email ?? "S")[0].toUpperCase();

  return (
    <>
      {/* Top Bar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b border-border"
        style={{
          background: "var(--surface-0)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Hamburger (mobile) — animates to × when drawer is open */}
        <div className="md:hidden -ml-1">
          <AnimatedHamburger
            active={mobileDrawerOpen}
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            size={36}
          />
        </div>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 flex-1 min-w-0">
          {breadcrumb.map((crumb, i) => (
            <div key={crumb.href} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />}
              <span
                className={cn(
                  "text-xs truncate",
                  i === breadcrumb.length - 1
                    ? "font-medium text-text-primary"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {crumb.label}
              </span>
            </div>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Search (⌘K) */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className={cn(
              "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg",
              "bg-surface-1 border border-border text-text-muted text-xs",
              "hover:border-[rgba(56,224,195,0.4)] hover:text-text-secondary transition-colors"
            )}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
            <span className="ml-1 px-1.5 py-0.5 rounded border border-border bg-surface-0 font-mono text-[10px]">
              ⌘K
            </span>
          </button>

          {/* Search icon on mobile */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="sm:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              ref={bellBtnRef}
              onClick={() => {
                if (!bellOpen && bellBtnRef.current) {
                  const r = bellBtnRef.current.getBoundingClientRect();
                  const mobile = window.innerWidth < 640;
                  setBellPos({
                    top: r.bottom + 8,
                    right: mobile ? 8 : Math.max(8, window.innerWidth - r.right),
                  });
                }
                setBellOpen((v) => !v);
                if (bellOpen) setExpandedNotifId(null);
              }}
              className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--brand-primary)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Bell dropdown — portaled to body to escape overflow-hidden parents */}
          {createPortal(
            <AnimatePresence>
              {bellOpen && bellPos && (
                <>
                  <div className="fixed inset-0 z-[190]" onClick={() => setBellOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: "fixed",
                      top: bellPos.top,
                      right: bellPos.right,
                      left: window.innerWidth < 640 ? 8 : undefined,
                      width: window.innerWidth < 640 ? undefined : Math.min(320, window.innerWidth - 16),
                      zIndex: 200,
                    }}
                    className="bg-[#0c1b2e] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text-primary">Announcements</p>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => markAllRead.mutate()}
                          className="flex items-center gap-1 text-[10px] text-[var(--brand-primary)] hover:underline"
                        >
                          <CheckCheck className="w-3 h-3" />
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {announcements.length === 0 && (
                        <p className="text-center text-xs text-text-muted py-8">No announcements</p>
                      )}
                      {announcements.map((ann) => {
                        const isRead = readIds.includes(ann.id);
                        const isExpanded = expandedNotifId === ann.id;
                        return (
                          <button
                            key={ann.id}
                            onClick={() => {
                              if (!isRead) markRead.mutate(ann.id);
                              setExpandedNotifId(isExpanded ? null : ann.id);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-surface-1 transition-colors",
                              !isRead && "bg-[var(--brand-primary)]/4"
                            )}
                          >
                            <div className="flex items-start gap-2">
                              {!isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-primary)] mt-1.5 shrink-0" />
                              )}
                              <div className={cn("flex-1", isRead && "pl-3.5")}>
                                <p className="text-xs font-semibold text-text-primary">{ann.title}</p>
                                <p className={cn("text-[11px] text-text-secondary mt-0.5", !isExpanded && "line-clamp-2")}>
                                  {ann.message}
                                </p>
                                {!isExpanded && ann.message.length > 80 && (
                                  <p className="text-[10px] text-[var(--brand-primary)] mt-0.5">Tap to read more</p>
                                )}
                                <p className="text-[10px] text-text-muted mt-1">
                                  {format(new Date(ann.created_at), "MMM d, yyyy")}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}

          {/* User avatar + dropdown */}
          <div ref={userMenuRef} className="relative ml-1">
            <button
              ref={userMenuBtnRef}
              onClick={() => {
                if (!userMenuOpen && userMenuBtnRef.current) {
                  const r = userMenuBtnRef.current.getBoundingClientRect();
                  setUserMenuPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
                }
                setUserMenuOpen((v) => !v);
              }}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-surface-1 transition-colors"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name ?? "avatar"}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(56,224,195,0.2)",
                    border: "1px solid rgba(56,224,195,0.3)",
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: "var(--brand-primary)" }}>
                    {initials}
                  </span>
                </div>
              )}
            </button>
          </div>

          {/* User menu dropdown — portaled to body to escape overflow-hidden parents */}
          {createPortal(
            <AnimatePresence>
              {userMenuOpen && userMenuPos && (
                <>
                  <div className="fixed inset-0 z-[190]" onClick={() => setUserMenuOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -8 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: "fixed",
                      top: userMenuPos.top,
                      right: userMenuPos.right,
                      width: Math.min(224, window.innerWidth - 16),
                      zIndex: 200,
                    }}
                    className="bg-[#0c1b2e] border border-[rgba(255,255,255,0.1)] rounded-xl shadow-2xl py-1 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-text-primary truncate">
                        {profile?.full_name ?? "Student"}
                      </p>
                      <p className="text-xs text-text-muted truncate">{user?.email}</p>
                    </div>

                    {/* Menu items */}
                    {[
                      { icon: User,     label: "Profile",  href: "/settings" },
                      { icon: Settings, label: "Settings", href: "/settings" },
                    ].map((item) => (
                      <Link
                        key={item.href + item.label}
                        to={item.href}
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}

                    <div className="border-t border-border mt-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-brand-danger hover:bg-brand-danger/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
      </header>

      {/* Mobile Drawer — portaled to body to escape the z-1 stacking context in AppShell.
           The backdrop starts at top:56px so the topbar hamburger stays clickable above it. */}
      {createPortal(
        <AnimatePresence>
          {mobileDrawerOpen && (
            <>
              {/* Backdrop — sits below the 56px header, tapping dismisses */}
              <motion.div
                key="mob-drawer-backdrop"
                className="fixed left-0 right-0 bottom-0 z-[150]"
                style={{
                  top: "56px",
                  background: "rgba(4,10,20,0.55)",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMobileDrawerOpen(false)}
              />

              {/* Floating frosted glass panel */}
              <motion.aside
                key="mob-drawer-panel"
                className="fixed z-[151] flex flex-col overflow-hidden"
                style={{
                  top: "60px",
                  left: "12px",
                  bottom: "12px",
                  width: "268px",
                  borderRadius: "16px",
                  background: "rgba(8,16,32,0.88)",
                  backdropFilter: "blur(32px) saturate(160%)",
                  WebkitBackdropFilter: "blur(32px) saturate(160%)",
                  border: "0.5px solid rgba(255,255,255,0.11)",
                }}
                initial={{ x: "-120%", opacity: 0.8 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "-120%", opacity: 0.8 }}
                transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.85 }}
              >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 h-14 shrink-0"
                style={{ borderBottom: "0.5px solid rgba(255,255,255,0.07)" }}
              >
                <div className="flex items-center gap-2.5">
                  <img src="/logo.jpg" alt="StudyLM" className="w-7 h-7 rounded-lg object-cover" />
                  <span className="font-display text-[15px]" style={{ color: "rgba(255,255,255,0.9)" }}>StudyLM</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg transition-colors duration-150"
                  style={{ color: "rgba(255,255,255,0.35)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Nav links with active state */}
              <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="block"
                  >
                    {({ isActive }) => (
                      <div
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
                        style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.52)" }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.85)"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = "rgba(255,255,255,0.52)"; }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="drawer-active-pill"
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.18)" }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Icon className="w-[15px] h-[15px] relative z-10 shrink-0" style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.38)" }} />
                        <span className="relative z-10">{label}</span>
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full relative z-10 shrink-0" style={{ background: "#38E0C3" }} />
                        )}
                      </div>
                    )}
                  </NavLink>
                ))}
                {isAdmin && (
                  <NavLink to="/admin" onClick={() => setMobileDrawerOpen(false)} className="block">
                    {({ isActive }) => (
                      <div
                        className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150"
                        style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.52)" }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="drawer-active-pill"
                            className="absolute inset-0 rounded-xl pointer-events-none"
                            style={{ background: "rgba(56,224,195,0.07)", border: "0.5px solid rgba(56,224,195,0.18)" }}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                        <Shield className="w-[15px] h-[15px] relative z-10" style={{ color: isActive ? "#38E0C3" : "rgba(255,255,255,0.38)" }} />
                        <span className="relative z-10">Admin Panel</span>
                        {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full relative z-10" style={{ background: "#38E0C3" }} />}
                      </div>
                    )}
                  </NavLink>
                )}
              </nav>

              {/* Token + user footer */}
              <div className="shrink-0 px-4 py-4 space-y-3" style={{ borderTop: "0.5px solid rgba(255,255,255,0.07)" }}>
                {/* Token row */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                  style={{ background: "rgba(56,224,195,0.05)", border: "0.5px solid rgba(56,224,195,0.14)" }}
                >
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                      {(profile?.study_tokens ?? 0).toLocaleString()} tokens
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Available balance</p>
                  </div>
                  <button
                    onClick={() => { setMobileDrawerOpen(false); setPaymentModalOpen(true); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{ background: "rgba(56,224,195,0.1)", border: "0.5px solid rgba(56,224,195,0.28)", color: "#38E0C3" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(56,224,195,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(56,224,195,0.1)"}
                  >
                    Top up
                  </button>
                </div>

                {/* User row */}
                <div className="flex items-center gap-3 px-1">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "rgba(56,224,195,0.14)", color: "#38E0C3" }}>
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.88)" }}>{profile?.full_name ?? "Student"}</p>
                    <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-lg transition-all duration-150 shrink-0"
                    style={{ color: "rgba(255,255,255,0.35)" }}
                    onMouseEnter={e => { e.currentTarget.style.color = "rgba(239,68,68,0.8)"; e.currentTarget.style.background = "rgba(239,68,68,0.07)"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.35)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
