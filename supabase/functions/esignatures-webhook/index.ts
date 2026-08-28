/**
 * esignatures.com webhook. Signing the agreement is what activates the loan.
 *
 * The signed document is the authorization for every later card charge, so the
 * audit trail esignatures provides (verified email, signer IP, timestamps) is
 * captured verbatim here -- it is the evidence submitted in a chargeback.
 */
import { jsonResponse, safeEqual } from "../_shared/http.ts";
import {
  claimWebhookEvent,
  markWebhookProcessed,
  serviceClient,
} from "../_shared/supabase.ts";
import { scheduleTableHtml, sendNotification } from "../_shared/email.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const firstSigner = (contract: any) =>
  contract?.signers?.[0] ?? contract?.signatories?.[0] ?? {};

const handleContractSigned = async (supabase: SupabaseClient, contract: any) => {
  const contractId = String(contract?.id ?? "");
  if (!contractId) throw new Error("Webhook payload has no contract id.");

  const signer = firstSigner(contract);

  const { data: agreement, error: agreementError } = await supabase
    .from("loan_agreements")
    .select("id, loan_id, internal_user_id, stripe_payment_method_id, status")
    .eq("esign_contract_id", contractId)
    .maybeSingle();

  if (agreementError) throw agreementError;

  if (!agreement) {
    // A contract we never issued, or issued outside this system. Log and stop
    // rather than guessing which loan it belongs to.
    console.warn(`No loan_agreement row for esignatures contract ${contractId}`);
    return;
  }

  const signedAt = signer?.signed_at ?? contract?.finalized_at ?? new Date().toISOString();

  await supabase
    .from("loan_agreements")
    .update({
      status: "signed",
      signer_name: signer?.name ?? null,
      signer_email: signer?.email ?? null,
      // Postgres inet rejects malformed input; null out anything unexpected.
      signer_ip: /^[0-9a-fA-F.:]+$/.test(String(signer?.signed_ip_address ?? ""))
        ? signer.signed_ip_address
        : null,
      signed_at: signedAt,
      agreement_pdf_url: contract?.contract_pdf_url ?? null,
      audit_trail: contract?.events ?? contract?.audit_trail ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq("id", agreement.id);

  // Bind the loan to this agreement + the exact card named in it, then let the
  // DB trigger decide whether disbursement prerequisites are actually met.
  const { error: activateError } = await supabase
    .from("loans")
    .update({
      agreement_id: agreement.id,
      stripe_payment_method_id: agreement.stripe_payment_method_id,
      status: "active",
    })
    .eq("id", agreement.loan_id);

  if (activateError) {
    // The gate refused -- most likely the mandate is missing or unauthorized.
    // Leave the loan un-disbursed and surface it loudly.
    console.error(
      `Loan ${agreement.loan_id} signed but not activated: ${activateError.message}`,
    );
    throw activateError;
  }

  const { data: schedule } = await supabase
    .from("payment_schedules")
    .select("payment_number, due_date, amount_due_centavos")
    .eq("loan_id", agreement.loan_id)
    .order("payment_number");

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, first_name")
    .eq("id", agreement.internal_user_id)
    .maybeSingle();

  const { data: card } = await supabase
    .from("stripe_payment_methods")
    .select("brand, last4")
    .eq("id", agreement.stripe_payment_method_id)
    .maybeSingle();

  if (profile?.email) {
    await sendNotification(supabase, {
      kind: "agreement_signed",
      recipient: profile.email,
      dedupeKey: `agreement_signed:${contractId}`,
      internalUserId: agreement.internal_user_id,
      loanId: agreement.loan_id,
      vars: {
        firstName: profile.first_name,
        brand: card?.brand,
        last4: card?.last4,
        agreementNumber: contract?.metadata?.loan_agreement_number ?? "",
        scheduleHtml: scheduleTableHtml(schedule ?? []),
      },
    });
  }
};

const handleContractDeclined = async (supabase: SupabaseClient, contract: any) => {
  const contractId = String(contract?.id ?? "");
  await supabase
    .from("loan_agreements")
    .update({ status: "declined", updated_at: new Date().toISOString() })
    .eq("esign_contract_id", contractId);
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("ESIGNATURES_WEBHOOK_SECRET");
  if (!expected) return jsonResponse({ error: "Webhook secret not configured." }, 500);

  const payload = await req.json().catch(() => null);
  if (!payload) return jsonResponse({ error: "Invalid JSON body." }, 400);

  // esignatures.com authenticates with a shared secret_token in the payload.
  // Without this check anyone who learns the URL can mark loans as signed.
  const provided = String(
    payload?.secret_token ??
      new URL(req.url).searchParams.get("secret_token") ??
      "",
  );

  if (!safeEqual(provided, expected)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const eventType = String(payload?.status ?? payload?.event ?? "unknown");
  const contract = payload?.data?.contract ?? payload?.contract ?? {};
  const eventId = String(
    payload?.event_id ?? `${contract?.id ?? "unknown"}:${eventType}`,
  );

  const supabase = serviceClient();
  const { isNew, rowId } = await claimWebhookEvent(
    supabase,
    "esignatures",
    eventId,
    eventType,
    payload,
  );

  if (!isNew) return jsonResponse({ received: true, duplicate: true });

  try {
    switch (eventType) {
      case "contract-signed":
      case "contract-all-signed":
        await handleContractSigned(supabase, contract);
        break;
      case "contract-declined":
      case "contract-withdrawn":
        await handleContractDeclined(supabase, contract);
        break;
      default:
        break;
    }

    await markWebhookProcessed(supabase, rowId);
    return jsonResponse({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    console.error(`esignatures-webhook ${eventType} failed`, error);
    await markWebhookProcessed(supabase, rowId, message);
    return jsonResponse({ error: message }, 500);
  }
});
