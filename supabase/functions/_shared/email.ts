import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { formatPHP } from "./money.ts";

const FROM = Deno.env.get("NOTIFICATION_FROM_EMAIL") ?? "Cashew Solutions <noreply@cashew.ph>";
const SUPPORT = Deno.env.get("SUPPORT_EMAIL") ?? "support@cashew.ph";

export type NotificationKind =
  | "mandate_authorized"
  | "agreement_signed"
  | "pre_debit_notice"
  | "payment_succeeded"
  | "payment_failed"
  | "final_notice"
  | "loan_paid_off";

export interface NotificationInput {
  kind: NotificationKind;
  recipient: string;
  /** Natural key for send-once semantics, e.g. `pre_debit:<schedule_id>`. */
  dedupeKey: string;
  internalUserId?: string | null;
  loanId?: string | null;
  paymentScheduleId?: string | null;
  vars: Record<string, unknown>;
}

const shell = (title: string, body: string) => `
<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <h2 style="margin:0 0 16px;font-size:18px">${title}</h2>
  ${body}
  <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0">
  <p style="font-size:12px;color:#666;margin:0">
    Questions about this charge? Reply to this email or contact ${SUPPORT}.<br>
    Cashew Solutions
  </p>
</div>`;

const row = (label: string, value: string) =>
  `<tr><td style="padding:6px 16px 6px 0;color:#666">${label}</td>
       <td style="padding:6px 0;font-weight:600">${value}</td></tr>`;

const table = (rows: string) =>
  `<table style="border-collapse:collapse;font-size:14px;margin:8px 0 16px">${rows}</table>`;

const render = (kind: NotificationKind, v: Record<string, any>): { subject: string; html: string } => {
  const amount = typeof v.amountCentavos === "number" ? formatPHP(v.amountCentavos) : "";
  const card = v.brand && v.last4 ? `${v.brand} ending ${v.last4}` : "your card on file";

  switch (kind) {
    case "mandate_authorized":
      return {
        subject: "Your card is authorized for your Cashew loan",
        html: shell(
          `Card authorized`,
          `<p>Hi ${v.firstName ?? "there"}, we've verified ${card}. It will be charged
           automatically on the dates in your loan agreement. No charge has been made yet.</p>`,
        ),
      };

    case "agreement_signed":
      return {
        subject: `Your Cashew loan agreement is signed (${v.agreementNumber ?? ""})`,
        html: shell(
          "Loan agreement signed",
          `<p>Hi ${v.firstName ?? "there"}, thanks for signing. Here is your repayment schedule.
            We'll charge ${card} automatically on each date below, and email you 3 days beforehand.</p>
           ${v.scheduleHtml ?? ""}
           <p style="font-size:13px;color:#666">A signed copy is attached to your account dashboard.</p>`,
        ),
      };

    case "pre_debit_notice":
      return {
        subject: `Reminder: ${amount} will be charged on ${v.dueDate}`,
        html: shell(
          "Upcoming payment",
          `<p>Hi ${v.firstName ?? "there"}, this is a courtesy reminder before we charge your card.</p>
           ${table(
             row("Amount", amount) +
               row("Charge date", String(v.dueDate ?? "")) +
               row("Card", card) +
               row("Payment", `${v.paymentNumber} of ${v.totalPayments}`),
           )}
           <p>Please make sure funds are available. If you need to change your payment method,
              update it in your dashboard before ${v.dueDate}.</p>`,
        ),
      };

    case "payment_succeeded":
      return {
        subject: `Payment received: ${amount}`,
        html: shell(
          "Payment received",
          `<p>Thanks ${v.firstName ?? ""} -- we've received your payment.</p>
           ${table(
             row("Amount", amount) +
               row("Card", card) +
               row("Payment", `${v.paymentNumber} of ${v.totalPayments}`) +
               row("Remaining balance", v.balanceCentavos != null ? formatPHP(v.balanceCentavos) : "--"),
           )}`,
        ),
      };

    case "payment_failed":
      return {
        subject: `Action needed: your ${amount} payment did not go through`,
        html: shell(
          "Payment failed",
          `<p>Hi ${v.firstName ?? "there"}, we tried to charge ${card} for ${amount} and it was declined.</p>
           ${table(row("Reason", String(v.reason ?? "The card was declined.")) + row("Next retry", String(v.nextRetry ?? "--")))}
           <p>Please make funds available or update your card in your dashboard.
              Late fees under your loan agreement begin accruing after the due date.</p>`,
        ),
      };

    case "final_notice":
      return {
        subject: "Final notice before collection: your Cashew loan is past due",
        html: shell(
          "Your loan is past due",
          `<p>Hi ${v.firstName ?? "there"}, we've been unable to collect ${amount} due on ${v.dueDate}
              after ${v.attempts ?? "several"} attempts.</p>
           <p>Please contact us at ${SUPPORT} to arrange payment. Late charges are accruing
              as set out in your signed loan agreement.</p>`,
        ),
      };

    case "loan_paid_off":
      return {
        subject: "Your Cashew loan is fully paid",
        html: shell(
          "Loan fully repaid",
          `<p>Congratulations ${v.firstName ?? ""} -- your loan is paid in full and your card
              will not be charged again. Your authorization is now closed.</p>`,
        ),
      };
  }
};

/**
 * Sends a notification at most once, keyed on `dedupeKey`.
 *
 * The log row is claimed before the provider call, so a retried cron tick or a
 * replayed webhook cannot email the borrower twice about the same event.
 */
export const sendNotification = async (
  supabase: SupabaseClient,
  input: NotificationInput,
): Promise<"sent" | "duplicate" | "failed"> => {
  const { data: claimed, error: claimError } = await supabase
    .from("notification_log")
    .insert({
      internal_user_id: input.internalUserId ?? null,
      loan_id: input.loanId ?? null,
      payment_schedule_id: input.paymentScheduleId ?? null,
      kind: input.kind,
      channel: "email",
      recipient: input.recipient,
      dedupe_key: input.dedupeKey,
      status: "queued",
      payload: input.vars,
    })
    .select("id")
    .maybeSingle();

  if (claimError) {
    if (claimError.code === "23505") return "duplicate";
    throw claimError;
  }

  const logId = claimed?.id;
  const apiKey = Deno.env.get("RESEND_API_KEY");

  if (!apiKey) {
    await supabase
      .from("notification_log")
      .update({ status: "skipped", error: "RESEND_API_KEY not configured" })
      .eq("id", logId);
    return "failed";
  }

  const { subject, html } = render(input.kind, input.vars);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to: [input.recipient], subject, html }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok) {
      await supabase
        .from("notification_log")
        .update({ status: "failed", error: JSON.stringify(body).slice(0, 500) })
        .eq("id", logId);
      return "failed";
    }

    await supabase
      .from("notification_log")
      .update({
        status: "sent",
        provider_message_id: body?.id ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logId);

    return "sent";
  } catch (error) {
    await supabase
      .from("notification_log")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      })
      .eq("id", logId);
    return "failed";
  }
};

/** Renders the schedule table embedded in the agreement-signed email. */
export const scheduleTableHtml = (
  rows: Array<{ payment_number: number; due_date: string; amount_due_centavos: number }>,
): string =>
  `<table style="border-collapse:collapse;font-size:14px;margin:12px 0;width:100%">
     <tr style="text-align:left;border-bottom:1px solid #ddd">
       <th style="padding:6px 0">#</th><th style="padding:6px 0">Date</th>
       <th style="padding:6px 0;text-align:right">Amount</th>
     </tr>
     ${rows
       .map(
         (r) =>
           `<tr style="border-bottom:1px solid #f0f0f0">
              <td style="padding:6px 0">${r.payment_number}</td>
              <td style="padding:6px 0">${r.due_date}</td>
              <td style="padding:6px 0;text-align:right;font-weight:600">${formatPHP(r.amount_due_centavos)}</td>
            </tr>`,
       )
       .join("")}
   </table>`;
