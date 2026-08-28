/**
 * Scheduled collector. Runs daily; charges every installment that is due.
 *
 * This is the piece that replaces "Stripe Subscriptions". payment_schedules is
 * the source of truth; Stripe is only an executor. That keeps prepayment,
 * partial payment, restructuring and arrears in one ledger instead of two.
 *
 * Double-charge protection is layered:
 *   1. A collection_attempts row is claimed (unique on schedule+attempt_no)
 *      BEFORE any Stripe call. Losing that race means another worker has it.
 *   2. The same key is passed to Stripe as Idempotency-Key, so even a retry
 *      after a network timeout returns the original PaymentIntent.
 */
import { jsonResponse, safeEqual } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { PHP } from "../_shared/money.ts";

interface DueRow {
  payment_schedule_id: string;
  loan_id: string;
  payment_number: number;
  due_date: string;
  amount_due_centavos: number;
  attempt_count: number;
  internal_user_id: string;
  stripe_payment_method_row_id: string;
  stripe_customer_id: string;
  stripe_payment_method_id: string;
  borrower_email: string;
}

const chargeOne = async (supabase: any, row: DueRow) => {
  const attemptNo = row.attempt_count + 1;
  const idempotencyKey = `sched:${row.payment_schedule_id}:attempt:${attemptNo}`;

  // Claim the attempt first. If this insert loses, someone else owns it.
  const { data: attempt, error: claimError } = await supabase
    .from("collection_attempts")
    .insert({
      payment_schedule_id: row.payment_schedule_id,
      loan_id: row.loan_id,
      stripe_payment_method_id: row.stripe_payment_method_row_id,
      attempt_no: attemptNo,
      amount_centavos: row.amount_due_centavos,
      idempotency_key: idempotencyKey,
      status: "pending",
    })
    .select("id")
    .maybeSingle();

  if (claimError) {
    if (claimError.code === "23505") {
      return { schedule: row.payment_schedule_id, result: "already_claimed" };
    }
    throw claimError;
  }

  // Mark in-flight so a concurrent tick does not re-select this row.
  await supabase
    .from("payment_schedules")
    .update({
      collection_state: "in_flight",
      attempt_count: attemptNo,
      next_attempt_at: null,
    })
    .eq("id", row.payment_schedule_id);

  try {
    const intent = await stripe().paymentIntents.create(
      {
        amount: row.amount_due_centavos,
        currency: PHP,
        customer: row.stripe_customer_id,
        payment_method: row.stripe_payment_method_id,
        // Merchant-initiated: no borrower present to complete 3DS. The mandate
        // captured at setup time is what authorizes this.
        off_session: true,
        confirm: true,
        description: `Cashew loan repayment ${row.payment_number} (due ${row.due_date})`,
        statement_descriptor_suffix: "CASHEW LOAN",
        metadata: {
          payment_schedule_id: row.payment_schedule_id,
          loan_id: row.loan_id,
          internal_user_id: row.internal_user_id,
          payment_number: String(row.payment_number),
          attempt_no: String(attemptNo),
        },
      },
      { idempotencyKey },
    );

    await supabase
      .from("collection_attempts")
      .update({
        stripe_payment_intent_id: intent.id,
        status: intent.status === "succeeded" ? "succeeded" : "pending",
      })
      .eq("id", attempt.id);

    // Terminal bookkeeping is done by the webhook, which is the only writer of
    // payment rows. This just records that the call was made.
    return { schedule: row.payment_schedule_id, result: intent.status };
  } catch (error: any) {
    const code = error?.code ?? error?.raw?.code ?? null;
    const message = error?.message ?? "Charge failed";
    const intentId = error?.raw?.payment_intent?.id ?? null;

    await supabase
      .from("collection_attempts")
      .update({
        status: "failed",
        failure_code: code,
        failure_message: String(message).slice(0, 500),
        stripe_payment_intent_id: intentId,
        settled_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);

    // If Stripe created a PaymentIntent, the webhook will drive retry state.
    // If it never did (network/config error), release the row here so it is
    // picked up on the next tick rather than stranded in 'in_flight'.
    if (!intentId) {
      await supabase
        .from("payment_schedules")
        .update({
          collection_state: "retrying",
          next_attempt_at: new Date(Date.now() + 3600_000).toISOString(),
          last_error: String(message).slice(0, 500),
        })
        .eq("id", row.payment_schedule_id);
    }

    return { schedule: row.payment_schedule_id, result: "failed", code };
  }
};

Deno.serve(async (req) => {
  // Invoked by pg_cron / Supabase scheduler, not by browsers.
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") ?? "";

  if (!expected || !safeEqual(provided, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = serviceClient();

  const { data: due, error } = await supabase
    .from("due_collections")
    .select("*")
    .limit(200);

  if (error) return jsonResponse({ error: error.message }, 500);

  const results = [];
  for (const row of (due ?? []) as DueRow[]) {
    try {
      results.push(await chargeOne(supabase, row));
    } catch (err) {
      console.error(`Collection failed for schedule ${row.payment_schedule_id}`, err);
      results.push({
        schedule: row.payment_schedule_id,
        result: "error",
        message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return jsonResponse({ processed: results.length, results });
});
