import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsOk, json } from "../_shared/cors.ts";

const FLW_SECRET    = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;

const FLW_OK = new Set(["successful", "completed", "complete"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsOk();

  try {
    // 1. Verify JWT
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    if (!jwt) return json({ error: "Missing authorization" }, 401);

    const anon = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: { user }, error: authErr } = await anon.auth.getUser(jwt);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // 2. Parse body
    const body = await req.json().catch(() => null);
    const { transaction_id, flutterwave_ref, user_id, expected_amount, tokens } = body ?? {};

    if (!transaction_id || !flutterwave_ref || !user_id || !expected_amount || !tokens) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (user.id !== user_id) return json({ error: "User mismatch" }, 403);

    const db = createClient(SUPABASE_URL, SERVICE_KEY);

    // 3. Idempotency — already credited for this ref?
    const { data: existing } = await db
      .from("token_transactions")
      .select("balance_after")
      .eq("user_id", user_id)
      .eq("flutterwave_ref", flutterwave_ref)
      .maybeSingle();

    if (existing) {
      return json({ success: true, new_balance: existing.balance_after });
    }

    // 4. Verify with Flutterwave
    const flwRes  = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
    );
    const flwBody = await flwRes.json().catch(() => null);

    console.log("[verify-payment] flw response:", JSON.stringify(flwBody));

    if (!flwRes.ok || !flwBody?.data) {
      return json({ error: "Could not verify payment with Flutterwave" }, 502);
    }

    const { status, amount, tx_ref } = flwBody.data;

    if (!FLW_OK.has(status?.toLowerCase())) {
      return json({ error: `Payment not confirmed (status: ${status})` }, 400);
    }
    if (tx_ref !== flutterwave_ref) {
      return json({ error: "Transaction reference mismatch" }, 400);
    }
    if (Number(amount) < expected_amount - 1) {
      return json({ error: `Amount mismatch: paid ₦${amount}, expected ₦${expected_amount}` }, 400);
    }

    // 5. Credit tokens — use add_tokens (no schema cache issues vs credit_tokens)
    //    + manually insert the flutterwave_ref into token_transactions for idempotency
    const { data: profile, error: profileErr } = await db
      .from("profiles")
      .select("study_tokens")
      .eq("id", user_id)
      .single();

    if (profileErr || !profile) {
      return json({ error: "User profile not found" }, 500);
    }

    const newBalance = (profile.study_tokens as number) + tokens;

    const { error: updateErr } = await db
      .from("profiles")
      .update({ study_tokens: newBalance, updated_at: new Date().toISOString() })
      .eq("id", user_id);

    if (updateErr) {
      console.error("[verify-payment] profile update error:", updateErr);
      return json({ error: "Failed to credit tokens" }, 500);
    }

    const { error: txErr } = await db.from("token_transactions").insert({
      user_id,
      type:           "purchase",
      amount:         tokens,
      description:    `Token purchase — ${flutterwave_ref}`,
      flutterwave_ref,
      balance_after:  newBalance,
    });

    if (txErr) {
      console.error("[verify-payment] transaction log error:", txErr);
      // Non-fatal — tokens are credited, just log it
    }

    // 6. Record payment
    await db.from("payments").upsert(
      {
        user_id,
        flutterwave_ref,
        amount_ngn:       expected_amount,
        tokens_purchased: tokens,
        status:           "success",
        metadata:         { transaction_id, flw_ref: flwBody.data.flw_ref },
      },
      { onConflict: "flutterwave_ref" }
    );

    console.log("[verify-payment] done — credited", tokens, "tokens, new balance:", newBalance);
    return json({ success: true, new_balance: newBalance });

  } catch (err) {
    console.error("[verify-payment] unhandled:", err);
    return json({ error: err instanceof Error ? err.message : "Internal error" }, 500);
  }
});
