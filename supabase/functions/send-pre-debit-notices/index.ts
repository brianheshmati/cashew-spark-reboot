/**
 * Daily pre-debit notice, 3 days ahead of each due date.
 *
 * This is the cheapest possible reduction in failed charges and disputes: the
 * borrower funds the account instead of being surprised by a debit.
 */
import { jsonResponse, safeEqual } from "../_shared/http.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sendNotification } from "../_shared/email.ts";

Deno.serve(async (req) => {
  const expected = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret") ?? "";

  if (!expected || !safeEqual(provided, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = serviceClient();

  const { data: upcoming, error } = await supabase
    .from("upcoming_debits")
    .select("*")
    .limit(500);

  if (error) return jsonResponse({ error: error.message }, 500);

  let sent = 0;
  let skipped = 0;

  for (const row of upcoming ?? []) {
    const { count } = await supabase
      .from("payment_schedules")
      .select("*", { count: "exact", head: true })
      .eq("loan_id", row.loan_id);

    const outcome = await sendNotification(supabase, {
      kind: "pre_debit_notice",
      recipient: row.borrower_email,
      dedupeKey: `pre_debit:${row.payment_schedule_id}`,
      internalUserId: row.internal_user_id,
      loanId: row.loan_id,
      paymentScheduleId: row.payment_schedule_id,
      vars: {
        firstName: row.first_name,
        amountCentavos: row.amount_due_centavos,
        dueDate: row.due_date,
        brand: row.brand,
        last4: row.last4,
        paymentNumber: row.payment_number,
        totalPayments: count ?? 0,
      },
    });

    if (outcome === "sent") sent++;
    else skipped++;
  }

  return jsonResponse({ candidates: (upcoming ?? []).length, sent, skipped });
});
