import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,       // data is fresh for 1 min
      gcTime:    10 * 60_000,  // keep unused cache for 10 min (was 30, reduced so resume sees less stale data)
      retry: (failureCount, error: unknown) => {
        const e = error as { code?: string; status?: number } | null;
        if (e?.code === "PGRST301" || (e?.status !== undefined && e.status >= 400 && e.status < 500)) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      // Refetch when the window/tab is focused BUT only if the data is older than 3 minutes.
      // This prevents hammering on quick tab switches while still catching stale data after
      // a long absence (background tab, locked phone, etc.).
      refetchOnWindowFocus: (query) =>
        query.state.dataUpdatedAt < Date.now() - 3 * 60_000,
      refetchOnReconnect:  true,
      // "always" so network requests go out even when offline cache is present.
      // We want a real fetch attempt when the user comes back online.
      networkMode: "always",
    },
    mutations: {
      retry:       1,
      retryDelay:  2000,
      networkMode: "always",
    },
  },
});
