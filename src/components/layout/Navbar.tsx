import { useState, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Menu,
  Search,
  Sun,
  Moon,
  Monitor,
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
} from "lucide-react";
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
        label = nb ? `${nb.emoji ? nb.emoji + " " : ""}${nb.title}` : "Notebook";
      } else {
        label = seg.charAt(0).toUpperCase() + seg.slice(1);
      }
    }

    return { label, href };
  });
}

const MOBILE_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/notebooks", icon: BookMarked,       label: "Notebooks"  },
  { to: "/library",   icon: Library,           label: "Library"   },
  { to: "/settings",  icon: Settings,          label: "Settings"  },
];

export function Navbar() {
  const { theme, setTheme, mobileDrawerOpen, setMobileDrawerOpen, setCommandPaletteOpen, setPaymentModalOpen } = useUIStore();
  const { user, profile, signOut: storeSignOut } = useAuthStore();
  const navigate   = useNavigate();
  const breadcrumb = useBreadcrumb();

  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [bellOpen, setBellOpen]           = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const bellRef     = useRef<HTMLDivElement>(null);

  const { announcements, readIds, unreadCount, markRead, markAllRead } = useAnnouncements();

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await supabase.auth.signOut();
    storeSignOut();
    navigate("/");
  };

  const cycleTheme = () => {
    const next = theme === "light" ? "dark" : theme === "dark" ? "system" : "light";
    setTheme(next);
  };

  const ThemeIcon =
    theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

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
        {/* Hamburger (mobile — kept for drawer access even though bottom nav is primary) */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-2 -ml-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

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

          {/* Theme toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon className="w-4 h-4" />
          </button>

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((v) => !v)}
              className="relative p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--brand-primary)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {bellOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-80 bg-surface-0 border border-border rounded-xl shadow-lg overflow-hidden"
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
                      return (
                        <button
                          key={ann.id}
                          onClick={() => { if (!isRead) markRead.mutate(ann.id); }}
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
                              <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-2">{ann.message}</p>
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
              )}
            </AnimatePresence>
          </div>

          {/* User avatar + dropdown */}
          <div ref={userMenuRef} className="relative ml-1">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
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

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 mt-2 w-56 bg-surface-0 border border-border rounded-xl shadow-lg py-1 overflow-hidden"
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
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileDrawerOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.aside
              className="absolute left-0 top-0 bottom-0 w-72 bg-surface-0 border-r border-border flex flex-col shadow-2xl"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/logo.jpg"
                    alt="StudyLM"
                    className="w-8 h-8 rounded-xl object-cover bg-white"
                  />
                  <span className="font-display text-lg text-text-primary">StudyLM</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer nav */}
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-1 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Drawer token section */}
              <div className="px-4 py-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between bg-surface-1 rounded-xl p-3">
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      {(profile?.study_tokens ?? 0).toLocaleString()} tokens
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">Available balance</p>
                  </div>
                  <button
                    onClick={() => { setMobileDrawerOpen(false); setPaymentModalOpen(true); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-brand text-white text-xs font-semibold"
                  >
                    Top Up
                  </button>
                </div>

                {/* User row */}
                <div className="flex items-center gap-3 px-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(56,224,195,0.2)", border: "1px solid rgba(56,224,195,0.3)" }}
                  >
                    <span className="text-xs font-bold" style={{ color: "var(--brand-primary)" }}>{initials}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {profile?.full_name ?? "Student"}
                    </p>
                    <p className="text-[10px] text-text-muted truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 rounded-lg text-text-muted hover:text-brand-danger hover:bg-brand-danger/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
