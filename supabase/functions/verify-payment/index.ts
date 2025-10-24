// index.ts (Deno)
// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🧩 Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FLW_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY")!;
const FLW_PUBLIC_KEY = import.meta.env.VITE_FLW_PUBLIC_KEY;


if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !FLW_SECRET_KEY) {
  console.error("❌ Missing environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ✅ Helper to add CORS headers
function withCorsHeaders(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return new Response(res.body, { ...res, headers });
}

serve(async (req) => {
  // ✅ Handle preflight CORS requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return withCorsHeaders(
        new Response(JSON.stringify({ error: "Only POST allowed" }), { status: 405 })
      );
    }

    const body = await req.json();
    const { tx_ref, transaction_id, user_id } = body;

    if (!tx_ref || !transaction_id || !user_id) {
      return withCorsHeaders(
        new Response(JSON.stringify({ error: "tx_ref, transaction_id and user_id required" }), {
          status: 400,
        })
      );
    }

    // 1️⃣ Verify with Flutterwave
    const fwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const fwJson = await fwRes.json();

    if (fwJson.status !== "success" || !fwJson.data) {
      await supabase.from("transactions").upsert(
        {
          tx_ref,
          flutterwave_tx_id: transaction_id,
          user_id,
          amount: fwJson?.data?.amount ?? 0,
          currency: fwJson?.data?.currency ?? "NGN",
          status: "failed",
          metadata: fwJson,
        },
        { onConflict: ["tx_ref"] }
      );

      return withCorsHeaders(
        new Response(
          JSON.stringify({
            verified: false,
            reason: "flutterwave_verification_failed",
            fwJson,
          }),
          { status: 400 }
        )
      );
    }

    const fwData = fwJson.data;
    const fwStatus = fwData.status;
    const fwTxRef = fwData.tx_ref;
    const fwAmount = parseFloat(fwData.amount);
    const fwCurrency = fwData.currency || "NGN";
    const fwCustomerEmail = fwData.customer?.email?.toLowerCase() || null;

    if (fwStatus !== "successful") {
      await supabase.from("transactions").upsert(
        {
          tx_ref,
          flutterwave_tx_id: transaction_id,
          user_id,
          amount: fwAmount,
          currency: fwCurrency,
          status: "failed",
          metadata: fwJson,
        },
        { onConflict: ["tx_ref"] }
      );

      return withCorsHeaders(
        new Response(
          JSON.stringify({ verified: false, reason: "payment_not_successful", fwData }),
          { status: 400 }
        )
      );
    }

    if (fwTxRef !== tx_ref) {
      await supabase.from("transactions").upsert(
        {
          tx_ref,
          flutterwave_tx_id: transaction_id,
          user_id,
          amount: fwAmount,
          currency: fwCurrency,
          status: "failed",
          metadata: fwJson,
        },
        { onConflict: ["tx_ref"] }
      );

      return withCorsHeaders(
        new Response(JSON.stringify({ verified: false, reason: "tx_ref_mismatch", fwData }), {
          status: 400,
        })
      );
    }

    // 2️⃣ Load user
    const { data: userRows, error: userError } = await supabase
      .from("users")
      .select("id, email, earn_rate")
      .eq("id", user_id)
      .limit(1)
      .maybeSingle();

    if (userError) {
      return withCorsHeaders(
        new Response(
          JSON.stringify({ error: "db_user_lookup_failed", details: userError.message }),
          { status: 500 }
        )
      );
    }
    if (!userRows) {
      return withCorsHeaders(new Response(JSON.stringify({ error: "user_not_found" }), { status: 404 }));
    }

    const userEmail = (userRows.email || "").toLowerCase();

    // ✅ FIX: Skip email check in test mode
    const isTestMode = fwTxRef.startsWith("ctoe_") || fwCustomerEmail?.includes("ravesb_");
    const cleanFwEmail = fwCustomerEmail?.replace(/^ravesb_[^_]+_/, "").toLowerCase();

    console.log("Email check:", { fwCustomerEmail, cleanFwEmail, userEmail, isTestMode });

    if (!isTestMode && cleanFwEmail !== userEmail) {
      await supabase.from("transactions").upsert(
        {
          tx_ref,
          flutterwave_tx_id: transaction_id,
          user_id,
          amount: fwAmount,
          currency: fwCurrency,
          status: "failed",
          metadata: fwJson,
        },
        { onConflict: ["tx_ref"] }
      );

      return withCorsHeaders(
        new Response(
          JSON.stringify({
            verified: false,
            reason: "customer_email_mismatch",
            fwCustomerEmail,
            cleanFwEmail,
            userEmail,
          }),
          { status: 400 }
        )
      );
    }

    // 3️⃣ Record successful transaction
    const { error: insertError } = await supabase.from("transactions").upsert(
      {
        tx_ref,
        flutterwave_tx_id: transaction_id,
        user_id,
        amount: fwAmount,
        currency: fwCurrency,
        status: "success",
        metadata: fwJson,
      },
      { onConflict: ["tx_ref"] }
    );

    if (insertError) {
      return withCorsHeaders(
        new Response(
          JSON.stringify({ error: "insert_transaction_failed", details: insertError.message }),
          { status: 500 }
        )
      );
    }

    // 4️⃣ Update user's earn_rate by +35%
    const currentEarn = parseFloat(userRows.earn_rate ?? "0");
    const newEarn = Number((currentEarn * 1.35).toFixed(2));

    const { error: updateError } = await supabase
      .from("users")
      .update({ earn_rate: newEarn })
      .eq("id", user_id);

    if (updateError) {
      return withCorsHeaders(
        new Response(
          JSON.stringify({
            verified: true,
            warning: "transaction_recorded_but_failed_update_user",
            updateError: updateError.message,
          }),
          { status: 200 }
        )
      );
    }

    // ✅ Final success response
    return withCorsHeaders(
      new Response(
        JSON.stringify({
          verified: true,
          newEarnRate: newEarn,
          emailCheck: isTestMode ? "skipped (test mode)" : "passed",
        }),
        { status: 200 }
      )
    );
  } catch (err: any) {
    console.error("verify-payment error", err);
    return withCorsHeaders(
      new Response(
        JSON.stringify({ error: "internal_error", details: err.message ?? err.toString() }),
        { status: 500 }
      )
    );
  }
});
