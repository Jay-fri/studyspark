import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,             // 30 s — short so navigating back sees fresh data
      gcTime:    10 * 60_000,        // keep cache 10 min for instant background refetch
      retry: 2,
      refetchOnWindowFocus: true,    // re-validate when user returns to the tab
    },
    mutations: {
      retry: 1,
    },
  },
});
