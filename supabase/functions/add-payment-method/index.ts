import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const xenditSecretKey = Deno.env.get("XENDIT_SECRET_KEY");
    if (!xenditSecretKey) return jsonResponse({ error: "Missing XENDIT_SECRET_KEY." }, 500);

    const body = await req.json().catch(() => ({}));
    const paymentType = String(body?.payment_type ?? "card").toLowerCase();

    if (paymentType !== "card" && paymentType !== "ach" && paymentType !== "payroll") {
      return jsonResponse({ error: `Unsupported payment_type: ${paymentType}` }, 400);
    }

    if (paymentType === "payroll") {
      return jsonResponse({
        id: `payroll-${crypto.randomUUID()}`,
        type: "payroll",
        status: "ACTIVE",
        is_default: Boolean(body?.is_default),
      });
    }

    const customerId = body?.customer_id ?? body?.customer?.reference_id ?? body?.internal_user_id ?? undefined;
    const customerGivenNames =
      body?.customer?.given_names ?? body?.customer?.first_name ?? body?.first_name ?? undefined;
    const customerSurname =
      body?.customer?.surname ?? body?.customer?.last_name ?? body?.last_name ?? undefined;
    const customerEmail = body?.customer?.email ?? body?.email ?? undefined;

    const payload = {
      reference_id: body?.reference_id ?? `${paymentType}-token-${crypto.randomUUID()}`,
      type: paymentType === "card" ? "CARD" : "DIRECT_DEBIT",
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
      channel_code: paymentType === "ach" ? (body?.channel_code ?? "PH_BPI") : undefined,
      channel_properties: {
        success_return_url: body?.success_return_url ?? Deno.env.get("XENDIT_SUCCESS_REDIRECT_URL") ?? undefined,
        failure_return_url: body?.failure_return_url ?? Deno.env.get("XENDIT_FAILURE_REDIRECT_URL") ?? undefined,
        skip_three_ds: body?.skip_three_ds ?? false,
      },
      metadata: body?.metadata ?? undefined,
    };

    const response = await fetch("https://api.xendit.co/payment_tokens", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${xenditSecretKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return jsonResponse(
        { error: data?.message ?? "Failed to create Xendit payment token.", details: data },
        response.status,
      );
    }

    return jsonResponse({
      id: data?.id,
      status: data?.status,
      payment_type: paymentType,
      action_url: data?.actions?.authentication_url ?? data?.authentications?.[0]?.url ?? null,
      data,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
