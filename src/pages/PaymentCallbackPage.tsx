import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "@/lib/icons";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/authStore";
import toast from "react-hot-toast";

// Handles redirect-based Flutterwave flows (e.g. 3DS cards).
// Inline payments (card popup, USSD, bank transfer) never land here.
export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const status        = params.get("status");
    const transactionId = params.get("transaction_id");
    const txRef         = params.get("tx_ref");

    // No Flutterwave params → direct navigation
    if (!status || !transactionId || !txRef) {
      navigate("/dashboard", { replace: true });
      return;
    }

    if (status !== "successful") {
      toast.error(status === "cancelled" ? "Payment cancelled" : "Payment failed — please try again");
      navigate("/dashboard", { replace: true });
      return;
    }

    if (!profile) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Derive tokens from sessionStorage intent set before the widget opened
    const intentRaw = txRef ? sessionStorage.getItem(`flw_intent_${txRef}`) : null;
    const intent    = intentRaw ? JSON.parse(intentRaw) as { amountNgn: number; tokens: number } : null;

    if (!intent) {
      // No intent found — could be a stale redirect; go to dashboard
      navigate("/dashboard", { replace: true });
      return;
    }

    sessionStorage.removeItem(`flw_intent_${txRef}`);

    const verify = async () => {
      const verifyToast = toast.loading("Verifying payment…");
      try {
        const { data, error } = await supabase.functions.invoke("verify-payment", {
          body: {
            transaction_id:  Number(transactionId),
            flutterwave_ref: txRef,
            user_id:         profile.id,
            expected_amount: intent.amountNgn,
            tokens:          intent.tokens,
          },
        });

        const result = data as { success?: boolean; error?: string; new_balance?: number } | null;

        if (error || !result?.success) {
          toast.error(
            result?.error ?? error?.message ?? "Token credit failed — contact support",
            { id: verifyToast }
          );
          navigate("/dashboard", { replace: true });
          return;
        }

        if (result.new_balance != null) {
          refreshProfile({ ...profile, study_tokens: result.new_balance });
        } else {
          const { data: fresh } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profile.id)
            .single();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (fresh) refreshProfile(fresh as any);
        }

        toast.success(`${intent.tokens.toLocaleString()} tokens added!`, { id: verifyToast });
        navigate("/dashboard", { replace: true });
      } catch {
        toast.error("Verification failed — contact support", { id: verifyToast });
        navigate("/dashboard", { replace: true });
      }
    };

    verify();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="min-h-dvh flex items-center justify-center"
      style={{ background: "var(--surface-0)" }}
    >
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--brand-primary)" }} />
    </div>
  );
}
