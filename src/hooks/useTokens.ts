import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { deductTokens, supabase } from "@/services/supabase";
import { getCost, canAfford, type OperationType } from "@/lib/tokenCounter";
import { useTokenCosts } from "./useTokenCosts";

export function useTokens() {
  const { profile, refreshProfile } = useAuthStore();
  const setPaymentModalOpen = useUIStore((s) => s.setPaymentModalOpen);
  const liveCosts = useTokenCosts();

  const balance = profile?.study_tokens ?? 0;

  const spend = useCallback(
    async (op: OperationType, description?: string): Promise<number> => {
      if (!profile) throw new Error("Not authenticated");
      const cost = getCost(op, liveCosts);
      if (!canAfford(balance, op, liveCosts)) {
        throw new Error(`Insufficient tokens. Need ${cost}, have ${balance}.`);
      }
      const newBalance = await deductTokens(
        profile.id,
        cost,
        description ?? `AI ${op}`
      );
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      if (data) refreshProfile(data);
      return newBalance;
    },
    [profile, balance, liveCosts, refreshProfile]
  );

  const canUse = useCallback(
    (op: OperationType) => canAfford(balance, op, liveCosts),
    [balance, liveCosts]
  );

  const requireTokens = useCallback(
    (amount: number): boolean => {
      if (balance >= amount) return true;
      setPaymentModalOpen(true);
      return false;
    },
    [balance, setPaymentModalOpen]
  );

  const getCostLive = useCallback(
    (op: OperationType) => getCost(op, liveCosts),
    [liveCosts]
  );

  return { balance, spend, canUse, requireTokens, getCost: getCostLive, liveCosts };
}
