import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "@/lib/icons";
import { useAuthStore } from "@/stores/authStore";

const LAST_PATH_KEY = "studylm-last-path";

export function saveLastPath(path: string) {
  if (path && path !== "/" && path !== "/auth" && !path.startsWith("/admin")) {
    localStorage.setItem(LAST_PATH_KEY, path);
  }
}

export function getLastPath(): string {
  return localStorage.getItem(LAST_PATH_KEY) ?? "/dashboard";
}

interface AuthGuardProps {
  adminOnly?: boolean;
}

export function AuthGuard({ adminOnly = false }: AuthGuardProps) {
  const { user, isLoading, isAdmin } = useAuthStore();
  const location = useLocation();

  // Persist the last visited protected path so we can restore it on return
  useEffect(() => {
    if (user && !isLoading) {
      saveLastPath(location.pathname);
    }
  }, [location.pathname, user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface-0">
        <Loader2 className="w-6 h-6 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
