import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_INVOICE_DURATION_SECONDS = 24 * 60 * 60;
const DEFAULT_AMOUNT = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const xenditSecretKey = Deno.env.get("XENDIT_SECRET_KEY");
    if (!xenditSecretKey) {
      return new Response(
        JSON.stringify({ error: "Missing XENDIT_SECRET_KEY." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json().catch(() => ({}));
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
      currency: "PHP",
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
      return new Response(
        JSON.stringify({ error: data?.message ?? "Failed to create Xendit payment link.", details: data }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: data?.id,
        external_id: data?.external_id,
        invoice_url: data?.invoice_url,
        expiry_date: data?.expiry_date,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
