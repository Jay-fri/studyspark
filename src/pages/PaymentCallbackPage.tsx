import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

// This page exists as a fallback for redirect-based Flutterwave flows (e.g. 3DS cards).
// Standard inline payments (card, USSD, bank transfer) are handled entirely by the
// callback in useFlutterwave — they never land here.
// If someone navigates here directly (no params), silently redirect to dashboard.
export default function PaymentCallbackPage() {
  const [params] = useSearchParams();
  const navigate  = useNavigate();

  const status        = params.get("status");
  const transactionId = params.get("transaction_id");
  const txRef         = params.get("tx_ref");

  useEffect(() => {
    // No Flutterwave params → direct navigation; go to dashboard
    if (!status || !transactionId || !txRef) {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Params present → redirect to dashboard with a query flag so the app
    // can show a toast once the user arrives (handled in DashboardPage).
    if (status === "successful") {
      navigate(`/dashboard?payment=success`, { replace: true });
    } else {
      navigate(`/dashboard?payment=${status}`, { replace: true });
    }
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
