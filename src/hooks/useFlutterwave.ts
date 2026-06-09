import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { openFlutterwaveCheckout, isSuccessful } from "@/services/flutterwave";
import type { FlutterwaveResponse } from "@/services/flutterwave";
import toast from "react-hot-toast";

export function useFlutterwave() {
  const [isLoading, setIsLoading] = useState(false);
  const profile        = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  const topUp = (amountNgn: number, tokensToAdd: number): Promise<boolean> => {
    if (!profile) return Promise.resolve(false);
    setIsLoading(true);

    return new Promise((resolve) => {
      let callbackFired = false;

      openFlutterwaveCheckout(
        profile,
        amountNgn,
        tokensToAdd,
        async (response: FlutterwaveResponse) => {
          callbackFired = true;

          if (!isSuccessful(response)) {
            toast.error(response.status === "cancelled" ? "Payment cancelled" : "Payment failed — please try again");
            setIsLoading(false);
            resolve(false);
            return;
          }

          const tid = toast.loading("Verifying payment…");
          try {
            const { data, error } = await supabase.functions.invoke("verify-payment", {
              body: {
                transaction_id:  response.transaction_id,
                flutterwave_ref: response.tx_ref,
                user_id:         profile.id,
                expected_amount: amountNgn,
                tokens:          tokensToAdd,
              },
            });

            if (error) throw error;

            const result = data as { success: boolean; new_balance: number };
            if (!result?.success) throw new Error("Verification returned no success");

            refreshProfile({ ...profile, study_tokens: result.new_balance });
            toast.success(`${tokensToAdd.toLocaleString()} tokens added!`, { id: tid });
            setIsLoading(false);
            resolve(true);
          } catch (err) {
            const msg = err instanceof Error ? err.message : "Token credit failed — contact support";
            console.error("[payment] verify failed:", err);
            toast.error(msg, { id: tid });
            setIsLoading(false);
            resolve(false);
          }
        },
        () => {
          if (!callbackFired) {
            setIsLoading(false);
            resolve(false);
          }
        },
      ).catch((err) => {
        toast.error(err instanceof Error ? err.message : "Payment failed to open");
        setIsLoading(false);
        resolve(false);
      });
    });
  };

  return { topUp, isLoading };
}
