import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            60_000,       // 1 min — don't re-fetch on every navigation
      gcTime:               30 * 60_000,  // keep cache 30 min so returning to a tab is instant
      retry: (failureCount, error: unknown) => {
        const e = error as { code?: string; status?: number } | null;
        // Never retry auth or explicit client errors
        if (e?.code === "PGRST301" || (e?.status !== undefined && e.status >= 400 && e.status < 500)) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), // 1 s → 2 s → 4 s cap
      refetchOnWindowFocus:      false,   // avoid hammering on tab-switch over slow connections
      refetchOnReconnect:        true,    // but do re-sync when back online
      networkMode:               "offlineFirst", // serve cache immediately; fetch in background
    },
    mutations: {
      retry:       1,
      retryDelay:  2000,
      networkMode: "offlineFirst",
    },
  },
});
