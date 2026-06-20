import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const getReturnUrl = (origin: string | undefined, envName: string) => {
  const configuredUrl = Deno.env.get(envName);
  if (configuredUrl) return configuredUrl;
  if (origin) return `${origin.replace(/\/$/, "")}/payment-callback`;
  return undefined;
};

const getRedirectUrl = (data: any) =>
  data?.actions?.find(
    (action: any) =>
      action?.type === "REDIRECT_CUSTOMER" && action?.descriptor === "WEB_URL",
  )?.value ?? null;

const getAuthenticatedUser = async (req: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    global: {
      headers: {
        Authorization: req.headers.get("Authorization") ?? "",
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user: error ? null : user };
};

const xenditFetch = async (path: string, init: RequestInit = {}) => {
  const xenditSecretKey = Deno.env.get("XENDIT_SECRET_KEY");
  if (!xenditSecretKey) throw new Error("Missing XENDIT_SECRET_KEY.");

  return fetch(`https://api.xendit.co${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${xenditSecretKey}:`)}`,
      "Content-Type": "application/json",
      "api-version": "2024-11-11",
      ...(init.headers ?? {}),
    },
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const { supabase, user } = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const paymentMethodId = String(body?.payment_method_id ?? "");
    const amount = Number(body?.amount);

    if (!paymentMethodId) return jsonResponse({ error: "Missing payment_method_id." }, 400);
    if (!Number.isFinite(amount) || amount <= 0) {
      return jsonResponse({ error: "Amount must be greater than zero." }, 400);
    }

    const { data: paymentMethod, error: paymentMethodError } = await supabase
      .from("alternative_payment_methods")
      .select("*")
      .eq("id", paymentMethodId)
      .eq("is_active", true)
      .maybeSingle();

    if (paymentMethodError) throw paymentMethodError;
    if (!paymentMethod) return jsonResponse({ error: "Payment method not found." }, 404);
    if (paymentMethod.internal_user_id !== user.id) {
      return jsonResponse({ error: "Payment method does not belong to this user." }, 403);
    }
    if (paymentMethod.payment_type !== "card") {
      return jsonResponse({ error: "Only saved cards can be charged by this function." }, 400);
    }

    const returnOrigin = typeof body?.return_origin === "string" ? body.return_origin : undefined;
    const referenceId = String(
      body?.reference_id ?? `saved-card-charge-${paymentMethod.id}-${crypto.randomUUID()}`,
    ).slice(0, 255);
    const roundedAmount = Math.round(amount);

    const paymentRequestPayload = {
      reference_id: referenceId,
      payment_token_id: paymentMethod.provider_token_id,
      type: "PAY",
      country: body?.country ?? Deno.env.get("XENDIT_COUNTRY") ?? paymentMethod.country ?? "PH",
      currency: body?.currency ?? Deno.env.get("XENDIT_CURRENCY") ?? "PHP",
      request_amount: roundedAmount,
      capture_method: body?.capture_method ?? "AUTOMATIC",
      channel_properties: {
        mid_label: body?.mid_label ?? Deno.env.get("XENDIT_CARD_MID_LABEL") ?? undefined,
        skip_three_ds: body?.skip_three_ds ?? true,
        card_on_file_type: body?.card_on_file_type ?? "RECURRING",
        failure_return_url: getReturnUrl(returnOrigin, "XENDIT_FAILURE_REDIRECT_URL"),
        success_return_url: getReturnUrl(returnOrigin, "XENDIT_SUCCESS_REDIRECT_URL"),
      },
      description: body?.description ?? "Cashew loan repayment",
      metadata: {
        internal_user_id: user.id,
        payment_method_id: paymentMethod.id,
        loan_id: body?.loan_id ?? null,
        payment_schedule_id: body?.payment_schedule_id ?? null,
        ...(body?.metadata && typeof body.metadata === "object" ? body.metadata : {}),
      },
    };

    const response = await xenditFetch("/v3/payment_requests", {
      method: "POST",
      body: JSON.stringify(paymentRequestPayload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse(
        { error: data?.message ?? "Failed to charge saved card.", details: data },
        response.status,
      );
    }

    let recordedPayment = null;
    if (data?.status === "SUCCEEDED" && body?.loan_id) {
      const { data: paymentRow, error: paymentError } = await supabase
        .from("payments")
        .insert({
          loan_id: body.loan_id,
          payment_schedule_id: body?.payment_schedule_id ?? null,
          amount: roundedAmount,
          payment_method: "xendit_saved_card",
          transaction_id: data?.payment_request_id ?? referenceId,
        })
        .select("id")
        .single();

      if (paymentError) throw paymentError;
      recordedPayment = paymentRow;
    }

    return jsonResponse({
      success: data?.status === "SUCCEEDED",
      id: data?.payment_request_id,
      status: data?.status,
      action_url: getRedirectUrl(data),
      recorded_payment_id: recordedPayment?.id ?? null,
      payment_request: data,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
