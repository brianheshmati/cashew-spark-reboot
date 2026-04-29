import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_INVOICE_DURATION_SECONDS = 24 * 60 * 60;
const DEFAULT_AMOUNT = 100;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const xenditSecretKey = Deno.env.get("XENDIT_SECRET_KEY");
    if (!xenditSecretKey) {
      return jsonResponse({ error: "Missing XENDIT_SECRET_KEY." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const paymentType = String(body?.payment_type ?? "invoice").toLowerCase();

    if (paymentType === "card") {
      const customerId = body?.customer_id ?? body?.customer?.reference_id ?? undefined;
      const customerGivenNames =
        body?.customer?.given_names ?? body?.customer?.first_name ?? body?.first_name ?? undefined;
      const customerSurname =
        body?.customer?.surname ?? body?.customer?.last_name ?? body?.last_name ?? undefined;
      const customerEmail = body?.customer?.email ?? body?.email ?? undefined;

      const tokenPayload = {
        reference_id: body?.reference_id ?? `card-token-${crypto.randomUUID()}`,
        type: "CARD",
        country: body?.country ?? "PH",
        currency: body?.currency ?? "PHP",
        reusability: body?.reusability ?? "MULTIPLE_USE",
        customer_id: customerId,
        customer: {
          reference_id: customerId,
          given_names: customerGivenNames,
          surname: customerSurname,
          email: customerEmail,
        },
        channel_properties: {
          success_return_url: body?.success_return_url ?? Deno.env.get("XENDIT_SUCCESS_REDIRECT_URL") ?? undefined,
          failure_return_url: body?.failure_return_url ?? Deno.env.get("XENDIT_FAILURE_REDIRECT_URL") ?? undefined,
          skip_three_ds: body?.skip_three_ds ?? false,
        },
      };

      const tokenResponse = await fetch("https://api.xendit.co/payment_tokens", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(`${xenditSecretKey}:`)}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tokenPayload),
      });

      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok) {
        return jsonResponse(
          { error: tokenData?.message ?? "Failed to create Xendit card payment token.", details: tokenData },
          tokenResponse.status,
        );
      }

      return jsonResponse({
        id: tokenData?.id,
        status: tokenData?.status,
        payment_token: tokenData,
        action_url: tokenData?.actions?.authentication_url ?? tokenData?.authentications?.[0]?.url,
      });
    }

    const amount = Number(body?.amount) > 0 ? Math.round(Number(body.amount)) : DEFAULT_AMOUNT;
    const now = Date.now();
    const dueDateMillis = new Date(body?.dueDate ?? "").getTime();
    const invoiceDuration = Number.isFinite(dueDateMillis) && dueDateMillis > now
      ? Math.max(60, Math.floor((dueDateMillis - now) / 1000))
      : DEFAULT_INVOICE_DURATION_SECONDS;

    const description = body?.description ?? "Loan repayment";
    const externalId = body?.externalId ??
      `loan-${body?.loanId ?? "unknown"}-${body?.paymentNumber ?? 1}-${crypto.randomUUID()}`;

    const payload = {
      external_id: externalId,
      amount,
      description,
      currency: body?.currency ?? "PHP",
      invoice_duration: invoiceDuration,
      success_redirect_url: Deno.env.get("XENDIT_SUCCESS_REDIRECT_URL") ?? undefined,
      failure_redirect_url: Deno.env.get("XENDIT_FAILURE_REDIRECT_URL") ?? undefined,
      customer: body?.customer
        ? {
          given_names: body.customer.given_names ?? undefined,
          surname: body.customer.surname ?? undefined,
          email: body.customer.email ?? undefined,
          mobile_number: body.customer.mobile_number ?? undefined,
        }
        : undefined,
    };

    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${xenditSecretKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse(
        { error: data?.message ?? "Failed to create Xendit payment link.", details: data },
        response.status,
      );
    }

    return jsonResponse({
      id: data?.id,
      external_id: data?.external_id,
      invoice_url: data?.invoice_url,
      expiry_date: data?.expiry_date,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
