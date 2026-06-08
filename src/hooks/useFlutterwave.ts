import { useState } from "react";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/services/supabase";
import { initializePayment } from "@/services/flutterwave";
import type { FlutterwaveResponse } from "@/services/flutterwave";
import toast from "react-hot-toast";

export function useFlutterwave() {
  const [isLoading, setIsLoading] = useState(false);
  const profile = useAuthStore((s) => s.profile);
  const { refreshProfile } = useAuthStore();

  const topUp = async (amountNgn: number, tokensToAdd: number) => {
    if (!profile) throw new Error("Not authenticated");
    setIsLoading(true);

    try {
      await initializePayment(
        profile,
        amountNgn,
        tokensToAdd,
        async (response: FlutterwaveResponse) => {
          if (response.status !== "successful") {
            toast.error("Payment was not completed");
            setIsLoading(false);
            return;
          }

          const verifyToast = toast.loading("Verifying payment…");

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

            if (error || !data?.success) {
              toast.error(
                (data as { error?: string } | null)?.error ?? "Token credit failed — contact support",
                { id: verifyToast }
              );
              setIsLoading(false);
              return;
            }

            // Refresh profile so balance updates in UI immediately
            const { data: fresh } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", profile.id)
              .single();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (fresh) refreshProfile(fresh as any);

            toast.success(`${tokensToAdd.toLocaleString()} tokens added!`, { id: verifyToast });
          } catch {
            toast.error("Token verification failed — contact support", { id: verifyToast });
          }

          setIsLoading(false);
        },
        () => setIsLoading(false)
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Payment initialisation failed");
      setIsLoading(false);
    }
  };

  return { topUp, isLoading };
}
