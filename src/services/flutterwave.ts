import type { Profile } from "@/types";

declare global {
  interface Window {
    FlutterwaveCheckout?: (config: FlutterwaveConfig) => void;
  }
}

interface FlutterwaveConfig {
  public_key:      string;
  tx_ref:          string;
  amount:          number;
  currency:        string;
  payment_options: string;
  customer:        { email: string; name: string };
  customizations:  { title: string; description: string };
  meta:            { user_id: string; tokens: number };
  callback:        (response: FlutterwaveResponse) => void;
  onclose:         () => void;
}

export interface FlutterwaveResponse {
  status:         string; // "successful" | "completed" | "complete" | "cancelled" | "failed"
  transaction_id: number;
  tx_ref:         string;
  flw_ref:        string;
  amount:         number;
  currency:       string;
}

const SUCCESS = new Set(["successful", "completed", "complete"]);
export const isSuccessful = (r: FlutterwaveResponse) => SUCCESS.has(r.status?.toLowerCase());

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) return resolve();
    const s    = document.createElement("script");
    s.src      = "https://checkout.flutterwave.com/v3.js";
    s.onload   = () => resolve();
    s.onerror  = () => reject(new Error("Failed to load Flutterwave script"));
    document.head.appendChild(s);
  });
}

export async function openFlutterwaveCheckout(
  profile:   Profile,
  amountNgn: number,
  tokens:    number,
  onSuccess: (response: FlutterwaveResponse) => void,
  onClose:   () => void,
): Promise<void> {
  await loadScript();

  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
  if (!publicKey) throw new Error("Missing VITE_FLUTTERWAVE_PUBLIC_KEY");

  const shortId = profile.id.replace(/-/g, "").slice(0, 12);
  const txRef   = `SLM-${shortId}-${Date.now()}`;

  // Store intent for redirect-based flows (3DS)
  sessionStorage.setItem(`flw_${txRef}`, JSON.stringify({ amountNgn, tokens }));

  window.FlutterwaveCheckout!({
    public_key:      publicKey,
    tx_ref:          txRef,
    amount:          amountNgn,
    currency:        "NGN",
    payment_options: "card,ussd,banktransfer",
    customer:        { email: profile.email, name: profile.full_name ?? profile.email },
    customizations:  { title: "StudyLM Tokens", description: "Purchase study tokens" },
    meta:            { user_id: profile.id, tokens },
    callback:        onSuccess,
    onclose:         onClose,
  });
}
