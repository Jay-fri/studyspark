import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/services/supabase";
import { DEFAULT_TOKEN_COSTS, type TokenCosts } from "@/lib/tokenCounter";

export function useTokenCosts(): TokenCosts {
  const { data } = useQuery<TokenCosts | null>({
    queryKey: ["app-settings", "token_costs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("id", "token_costs")
        .single();
      return (data?.value as TokenCosts) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  // Merge so any missing keys fall back to defaults
  return data ? { ...DEFAULT_TOKEN_COSTS, ...data } : { ...DEFAULT_TOKEN_COSTS };
}
