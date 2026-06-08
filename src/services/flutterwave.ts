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
  customer: {
    email: string;
    name:  string;
  };
  customizations: {
    title:       string;
    description: string;
    logo:        string;
  };
  meta: {
    user_id: string;
    tokens:  number;
  };
  callback:      (response: FlutterwaveResponse) => void;
  onclose:       () => void;
}

export interface FlutterwaveResponse {
  status:         "successful" | "cancelled" | "failed";
  transaction_id: number;
  tx_ref:         string;
  flw_ref:        string;
  amount:         number;
  currency:       string;
}

export function loadFlutterwaveScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.FlutterwaveCheckout) { resolve(); return; }
    const script   = document.createElement("script");
    script.src     = "https://checkout.flutterwave.com/v3.js";
    script.onload  = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Flutterwave script"));
    document.head.appendChild(script);
  });
}

export async function initializePayment(
  profile: Profile,
  amountNgn: number,
  tokens: number,
  onSuccess: (response: FlutterwaveResponse) => void,
  onClose: () => void
): Promise<void> {
  await loadFlutterwaveScript();

  const publicKey = import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY;
  if (!publicKey) throw new Error("Missing VITE_FLUTTERWAVE_PUBLIC_KEY");

  const txRef = `STUDYLM-${profile.id}-${Date.now()}`;

  window.FlutterwaveCheckout!({
    public_key:      publicKey,
    tx_ref:          txRef,
    amount:          amountNgn,
    currency:        "NGN",
    payment_options: "card,ussd,banktransfer",
    customer: {
      email: profile.email,
      name:  profile.full_name ?? profile.email,
    },
    customizations: {
      title:       "StudyLM Token Top-up",
      description: "Purchase study tokens",
      logo:        `${window.location.origin}/logo.jpg`,
    },
    meta:     { user_id: profile.id, tokens },
    callback: onSuccess,
    onclose:  onClose,
  });
}
