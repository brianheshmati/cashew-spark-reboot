/**
 * Stripe webhook. The ONLY place payment rows are written.
 *
 * Never record a payment from a client callback -- the browser can lie, and a
 * borrower who closes the tab mid-3DS would otherwise desync the ledger.
 */
import { jsonResponse } from "../_shared/http.ts";
import {
  claimWebhookEvent,
  markWebhookProcessed,
  serviceClient,
} from "../_shared/supabase.ts";
import { cryptoProvider, stripe } from "../_shared/stripe.ts";
import { sendNotification } from "../_shared/email.ts";
import { fromCentavos } from "../_shared/money.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Retry ladder in days after the first failure, then arrears. */
const RETRY_OFFSETS_DAYS = [1, 2];

const addDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};

const loadBorrower = async (supabase: SupabaseClient, loanId: string) => {
  const { data } = await supabase
    .from("loans")
    .select("id, user_id, term_months, profiles:user_id (email, first_name)")
    .eq("id", loanId)
    .maybeSingle();
  return data as any;
};

const handleSetupIntentSucceeded = async (
  supabase: SupabaseClient,
  setupIntent: any,
) => {
  const internalUserId = setupIntent.metadata?.internal_user_id;
  if (!internalUserId) {
    console.warn("setup_intent.succeeded without internal_user_id", setupIntent.id);
    return;
  }

  const paymentMethod = await stripe().paymentMethods.retrieve(
    setupIntent.payment_method as string,
  );
  const card = paymentMethod.card;

  const { data: anyExisting } = await supabase
    .from("stripe_payment_methods")
    .select("id")
    .eq("internal_user_id", internalUserId)
    .limit(1)
    .maybeSingle();

  const { data: saved, error } = await supabase
    .from("stripe_payment_methods")
    .upsert(
      {
        internal_user_id: internalUserId,
        stripe_customer_id: String(setupIntent.customer),
        stripe_payment_method_id: paymentMethod.id,
        stripe_setup_intent_id: setupIntent.id,
        mandate_id: typeof setupIntent.mandate === "string" ? setupIntent.mandate : null,
        three_d_secure_status:
          card?.three_d_secure_usage?.supported ? "supported" : null,
        brand: card?.brand ?? null,
        last4: card?.last4 ?? null,
        exp_month: card?.exp_month ?? null,
        exp_year: card?.exp_year ?? null,
        funding: card?.funding ?? null,
        country: card?.country ?? null,
        fingerprint: card?.fingerprint ?? null,
        status: "authorized",
        is_default: !anyExisting,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_payment_method_id" },
    )
    .select("id, brand, last4")
    .single();

  if (error) throw error;

  // Attach to the loan so the disbursement gate and collection queue can see it.
  const loanId = setupIntent.metadata?.loan_id;
  if (loanId) {
    await supabase
      .from("loans")
      .update({ stripe_payment_method_id: saved.id })
      .eq("id", loanId);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", internalUserId)
    .maybeSingle();

  if (profile?.email) {
    await sendNotification(supabase, {
      kind: "mandate_authorized",
      recipient: profile.email,
      dedupeKey: `mandate_authorized:${setupIntent.id}`,
      internalUserId,
      loanId: loanId || null,
      vars: { firstName: profile.first_name, brand: saved.brand, last4: saved.last4 },
    });
  }
};

const handlePaymentIntentSucceeded = async (
  supabase: SupabaseClient,
  intent: any,
) => {
  const scheduleId = intent.metadata?.payment_schedule_id;
  const loanId = intent.metadata?.loan_id;
  if (!scheduleId || !loanId) return;

  const amountCentavos = intent.amount_received ?? intent.amount;
  const chargeId =
    intent.latest_charge && typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : intent.latest_charge?.id ?? null;

  // Unique index on stripe_payment_intent_id makes this replay-safe.
  const { error: paymentError } = await supabase.from("payments").insert({
    loan_id: loanId,
    payment_schedule_id: scheduleId,
    amount: fromCentavos(amountCentavos),
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: "stripe_card",
    transaction_id: intent.id,
    stripe_payment_intent_id: intent.id,
    stripe_charge_id: chargeId,
  });

  if (paymentError && paymentError.code !== "23505") throw paymentError;

  const { data: schedule } = await supabase
    .from("payment_schedules")
    .select("id, amount_due, payment_number")
    .eq("id", scheduleId)
    .single();

  await supabase
    .from("payment_schedules")
    .update({
      paid_amount: schedule?.amount_due ?? fromCentavos(amountCentavos),
      paid_date: new Date().toISOString().slice(0, 10),
      status: "paid",
      collection_state: "collected",
      next_attempt_at: null,
      last_error: null,
    })
    .eq("id", scheduleId);

  await supabase
    .from("collection_attempts")
    .update({ status: "succeeded", settled_at: new Date().toISOString() })
    .eq("stripe_payment_intent_id", intent.id);

  // Remaining balance across the whole loan.
  const { data: remaining } = await supabase
    .from("payment_schedules")
    .select("amount_due_centavos, paid_amount, amount_due")
    .eq("loan_id", loanId);

  const outstanding = (remaining ?? []).reduce(
    (sum: number, r: any) =>
      sum + Math.max(0, r.amount_due_centavos - Math.round((r.paid_amount ?? 0) * 100)),
    0,
  );

  const loan = await loadBorrower(supabase, loanId);
  const email = loan?.profiles?.email;

  if (email) {
    await sendNotification(supabase, {
      kind: "payment_succeeded",
      recipient: email,
      dedupeKey: `payment_succeeded:${intent.id}`,
      internalUserId: loan.user_id,
      loanId,
      paymentScheduleId: scheduleId,
      vars: {
        firstName: loan.profiles?.first_name,
        amountCentavos,
        paymentNumber: schedule?.payment_number,
        totalPayments: (remaining ?? []).length,
        balanceCentavos: outstanding,
      },
    });
  }

  if (outstanding === 0) {
    await supabase.from("loans").update({ status: "paid_off" }).eq("id", loanId);
    if (email) {
      await sendNotification(supabase, {
        kind: "loan_paid_off",
        recipient: email,
        dedupeKey: `loan_paid_off:${loanId}`,
        internalUserId: loan.user_id,
        loanId,
        vars: { firstName: loan.profiles?.first_name },
      });
    }
  }
};

const handlePaymentIntentFailed = async (supabase: SupabaseClient, intent: any) => {
  const scheduleId = intent.metadata?.payment_schedule_id;
  const loanId = intent.metadata?.loan_id;
  if (!scheduleId || !loanId) return;

  const reason =
    intent.last_payment_error?.message ?? "The card was declined.";
  const code = intent.last_payment_error?.code ?? null;

  await supabase
    .from("collection_attempts")
    .update({
      status: "failed",
      failure_code: code,
      failure_message: reason.slice(0, 500),
      settled_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intent.id);

  const { data: schedule } = await supabase
    .from("payment_schedules")
    .select("attempt_count, payment_number, amount_due_centavos, due_date")
    .eq("id", scheduleId)
    .single();

  const attempts = schedule?.attempt_count ?? 1;
  const nextOffset = RETRY_OFFSETS_DAYS[attempts - 1];
  const exhausted = nextOffset === undefined;

  await supabase
    .from("payment_schedules")
    .update({
      // Arrears, not "cancelled". The debt survives a failed charge -- this is
      // exactly the semantic Stripe Subscriptions gets wrong for lending.
      collection_state: exhausted ? "arrears" : "retrying",
      status: exhausted ? "overdue" : "pending",
      next_attempt_at: exhausted ? null : addDays(nextOffset).toISOString(),
      last_error: reason.slice(0, 500),
    })
    .eq("id", scheduleId);

  const loan = await loadBorrower(supabase, loanId);
  const email = loan?.profiles?.email;
  if (!email) return;

  await sendNotification(supabase, {
    kind: exhausted ? "final_notice" : "payment_failed",
    recipient: email,
    dedupeKey: `${exhausted ? "final_notice" : "payment_failed"}:${intent.id}`,
    internalUserId: loan.user_id,
    loanId,
    paymentScheduleId: scheduleId,
    vars: {
      firstName: loan.profiles?.first_name,
      amountCentavos: schedule?.amount_due_centavos,
      reason,
      attempts,
      dueDate: schedule?.due_date,
      nextRetry: exhausted ? null : addDays(nextOffset).toISOString().slice(0, 10),
    },
  });
};

const handleDispute = async (supabase: SupabaseClient, dispute: any) => {
  // Freeze automated collection the moment a dispute lands. Continuing to
  // charge a disputing cardholder escalates it into a regulatory problem.
  const intentId = dispute.payment_intent;
  if (!intentId) return;

  const { data: payment } = await supabase
    .from("payments")
    .select("loan_id")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();

  if (!payment?.loan_id) return;

  await supabase
    .from("payment_schedules")
    .update({ collection_state: "manual", last_error: `Dispute ${dispute.id}` })
    .eq("loan_id", payment.loan_id)
    .in("collection_state", ["scheduled", "retrying"]);

  console.warn(`Dispute ${dispute.id} on loan ${payment.loan_id}: collection paused.`);
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !secret) {
    return jsonResponse({ error: "Missing signature or webhook secret." }, 400);
  }

  const raw = await req.text();
  let event: any;

  try {
    event = await stripe().webhooks.constructEventAsync(
      raw,
      signature,
      secret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error("Stripe signature verification failed", error);
    return jsonResponse({ error: "Invalid signature" }, 400);
  }

  const supabase = serviceClient();
  const { isNew, rowId } = await claimWebhookEvent(
    supabase,
    "stripe",
    event.id,
    event.type,
    event,
  );

  // Already handled. Ack so Stripe stops retrying.
  if (!isNew) return jsonResponse({ received: true, duplicate: true });

  try {
    switch (event.type) {
      case "setup_intent.succeeded":
        await handleSetupIntentSucceeded(supabase, event.data.object);
        break;
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(supabase, event.data.object);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(supabase, event.data.object);
        break;
      case "charge.dispute.created":
        await handleDispute(supabase, event.data.object);
        break;
      default:
        break;
    }

    await markWebhookProcessed(supabase, rowId);
    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`stripe-webhook ${event.type} failed`, error);
    await markWebhookProcessed(supabase, rowId, message);
    // 500 makes Stripe retry. The claim row is already marked with the error.
    return jsonResponse({ error: message }, 500);
  }
});
