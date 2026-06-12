import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AppLoaderPage } from "@/components/ui/AppLoader";
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

  useEffect(() => {
    if (user && !isLoading) {
      saveLastPath(location.pathname);
    }
  }, [location.pathname, user, isLoading]);

  // Show spinner only when loading AND no cached user yet
  // (persisted user is available immediately from localStorage, so this
  //  only fires on true first-load or after sign-out)
  if (isLoading && !user) {
    return <AppLoaderPage />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (useAuthStore.getState().profile?.is_banned) {
    return <Navigate to="/banned" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
