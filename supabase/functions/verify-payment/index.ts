import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsOk, json } from "../_shared/cors.ts";

const FLW_SECRET           = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY    = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const jwt        = authHeader.replace("Bearer ", "").trim();
  if (!jwt) return json({ error: "Missing authorization" }, 401);

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authErr } = await anonClient.auth.getUser(jwt);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  // ── Parse body ──────────────────────────────────────────────────────────────
  let transaction_id: number, flutterwave_ref: string,
      user_id: string, expected_amount: number, tokens: number;
  try {
    const body = await req.json() as {
      transaction_id:  number;
      flutterwave_ref: string;
      user_id:         string;
      expected_amount: number;
      tokens:          number;
    };
    ({ transaction_id, flutterwave_ref, user_id, expected_amount, tokens } = body);
  } catch {
    return json({ error: "Invalid request body" }, 400);
  }

  // Ensure the JWT user matches the claimed user_id
  if (user.id !== user_id) return json({ error: "User mismatch" }, 403);

  // ── Verify with Flutterwave ─────────────────────────────────────────────────
  const flwRes  = await fetch(
    `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
    { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
  );
  const flwData = await flwRes.json() as {
    status: string;
    data:   { status: string; amount: number; flw_ref: string } | null;
  };

  if (flwData.status !== "success" || flwData.data?.status !== "successful") {
    return json({ error: "Payment not confirmed by Flutterwave" }, 400);
  }

  if (Number(flwData.data.amount) < expected_amount) {
    return json({ error: "Amount paid is less than expected" }, 400);
  }

  // ── Credit tokens (service role to bypass RLS) ──────────────────────────────
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: newBalance, error: rpcError } = await adminClient.rpc("credit_tokens", {
    p_user_id:     user_id,
    p_amount:      tokens,
    p_description: `Token purchase — ${flutterwave_ref}`,
    p_flw_ref:     flutterwave_ref,
  });
  if (rpcError) throw new Error(rpcError.message);

  // ── Upsert payment record ───────────────────────────────────────────────────
  await adminClient.from("payments").upsert(
    {
      user_id,
      flutterwave_ref,
      amount_ngn:       expected_amount,
      tokens_purchased: tokens,
      status:           "success",
      metadata:         { transaction_id, flw_tx_ref: flwData.data?.flw_ref },
    },
    { onConflict: "flutterwave_ref" }
  );

  return json({ success: true, tokens_added: tokens, new_balance: newBalance });
});
