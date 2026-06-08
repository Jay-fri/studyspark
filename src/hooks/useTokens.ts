import { useCallback } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { deductTokens, supabase } from "@/services/supabase";
import { getCost, canAfford, type OperationType } from "@/lib/tokenCounter";

export function useTokens() {
  const { profile, refreshProfile } = useAuthStore();
  const setPaymentModalOpen = useUIStore((s) => s.setPaymentModalOpen);

  const balance = profile?.study_tokens ?? 0;

  const spend = useCallback(
    async (op: OperationType, description?: string): Promise<number> => {
      if (!profile) throw new Error("Not authenticated");
      const cost = getCost(op);
      if (!canAfford(balance, op)) {
        throw new Error(`Insufficient tokens. Need ${cost}, have ${balance}.`);
      }
      const newBalance = await deductTokens(
        profile.id,
        cost,
        description ?? `AI ${op}`
      );
      // Refresh profile so the UI balance is up-to-date
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", profile.id)
        .single();
      if (data) refreshProfile(data);
      return newBalance;
    },
    [profile, balance, refreshProfile]
  );

  const canUse = useCallback(
    (op: OperationType) => canAfford(balance, op),
    [balance]
  );

  /** Returns true if the user has enough tokens; otherwise opens the payment modal and returns false. */
  const requireTokens = useCallback(
    (amount: number): boolean => {
      if (balance >= amount) return true;
      setPaymentModalOpen(true);
      return false;
    },
    [balance, setPaymentModalOpen]
  );

  return { balance, spend, canUse, requireTokens, getCost };
}
