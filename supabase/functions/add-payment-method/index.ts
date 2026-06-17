import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_CARD_SETUP_AMOUNT = 50;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const cleanName = (value: unknown, fallback: string) => {
  const cleaned = String(value ?? "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 50);

  return cleaned || fallback;
};

const cleanCustomerReference = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 255);

const getReturnUrl = (origin: string | undefined, fallbackPath: string) => {
  const configuredUrl = Deno.env.get(fallbackPath);
  if (configuredUrl) return configuredUrl;
  if (origin) return `${origin.replace(/\/$/, "")}/payment-callback`;
  return undefined;
};

const getXenditRedirectUrl = (data: any) =>
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

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
};

const xenditFetch = async (path: string, init: RequestInit = {}) => {
  const xenditSecretKey = Deno.env.get("XENDIT_SECRET_KEY");
  if (!xenditSecretKey) throw new Error("Missing XENDIT_SECRET_KEY.");
  const headers = {
    Authorization: `Basic ${btoa(`${xenditSecretKey}:`)}`,
    "Content-Type": "application/json",
    ...(path.startsWith("/v3/") ? { "api-version": "2024-11-11" } : {}),
    ...(init.headers ?? {}),
  };

  return fetch(`https://api.xendit.co${path}`, {
    ...init,
    headers,
  });
};

const saveCardPaymentMethod = async (
  supabase: any,
  internalUserId: string,
  paymentRequest: any,
) => {
  const cardDetails = paymentRequest?.channel_properties?.card_details ?? {};
  const paymentTokenId = paymentRequest?.payment_token_id;

  if (!paymentTokenId) {
    throw new Error("Xendit did not return a reusable payment token yet.");
  }

  const fingerprint = cardDetails?.fingerprint ?? paymentTokenId;
  const { data: existingCard, error: existingError } = await supabase
    .from("payment_methods")
    .select("id")
    .eq("internal_user_id", internalUserId)
    .eq("provider_token_id", paymentTokenId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingCard) {
    return { id: existingCard.id, already_exists: true };
  }

  if (fingerprint) {
    const { data: duplicateCard, error: duplicateError } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("internal_user_id", internalUserId)
      .eq("fingerprint", fingerprint)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicateCard) {
      return { id: duplicateCard.id, already_exists: true };
    }
  }

  const { count, error: countError } = await supabase
    .from("payment_methods")
    .select("*", { count: "exact", head: true })
    .eq("internal_user_id", internalUserId)
    .eq("is_active", true);

  if (countError) throw countError;

  const maskedCardNumber = cardDetails?.masked_card_number ?? "";
  const insertPayload = {
    internal_user_id: internalUserId,
    provider: "xendit",
    provider_token_id: paymentTokenId,
    brand: cardDetails?.network ?? "Card",
    bank: cardDetails?.issuer ?? null,
    country: cardDetails?.country ?? null,
    card_type: cardDetails?.type ?? null,
    fingerprint,
    last4: maskedCardNumber ? maskedCardNumber.slice(-4) : null,
    exp_month: cardDetails?.expiry_month ? Number(cardDetails.expiry_month) : null,
    exp_year: cardDetails?.expiry_year ? Number(cardDetails.expiry_year) : null,
    verification_status: "VERIFIED",
    is_active: true,
    is_default: (count ?? 0) === 0,
  };

  const { data, error } = await supabase
    .from("payment_methods")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save payment method: ${error.message}`);

  return { id: data?.id, already_exists: false };
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const paymentType = String(body?.payment_type ?? "card").toLowerCase();
    const { supabase, user } = await getAuthenticatedUser(req);

    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    if (body?.payment_request_id) {
      const paymentRequestId = String(body.payment_request_id);
      const response = await xenditFetch(`/v3/payment_requests/${paymentRequestId}`, {
        method: "GET",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return jsonResponse(
          { error: data?.message ?? "Failed to verify Xendit payment request.", details: data },
          response.status,
        );
      }

      if (data?.metadata?.internal_user_id && data.metadata.internal_user_id !== user.id) {
        return jsonResponse({ error: "Payment request does not belong to this user." }, 403);
      }

      if (data?.status !== "SUCCEEDED" && data?.status !== "AUTHORIZED") {
        return jsonResponse(
          {
            error: `Card setup is not complete. Xendit status: ${data?.status ?? "UNKNOWN"}.`,
            payment_request: data,
          },
          409,
        );
      }

      const saved = await saveCardPaymentMethod(supabase, user.id, data);
      return jsonResponse({
        success: true,
        payment_method_id: saved.id,
        already_exists: saved.already_exists,
      });
    }

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

    if (paymentType === "ach") {
      const customerId = cleanCustomerReference(
        String(body?.customer_id ?? body?.customer?.reference_id ?? `customer${user.id}`),
      );
      const tokenPayload = {
        reference_id: body?.reference_id ?? `ach-token-${crypto.randomUUID()}`,
        type: "DIRECT_DEBIT",
        country: body?.country ?? "PH",
        currency: body?.currency ?? "PHP",
        reusability: body?.reusability ?? "MULTIPLE_USE",
        customer_id: customerId,
        customer: {
          reference_id: customerId,
          given_names: cleanName(body?.customer?.given_names ?? body?.first_name, "Customer"),
          surname: cleanName(body?.customer?.surname ?? body?.last_name, "NA"),
          email: body?.customer?.email ?? body?.email ?? user.email ?? undefined,
        },
        channel_code: body?.channel_code ?? "PH_BPI",
        channel_properties: {
          success_return_url: getReturnUrl(
            typeof body?.return_origin === "string" ? body.return_origin : undefined,
            "XENDIT_SUCCESS_REDIRECT_URL",
          ),
          failure_return_url: getReturnUrl(
            typeof body?.return_origin === "string" ? body.return_origin : undefined,
            "XENDIT_FAILURE_REDIRECT_URL",
          ),
        },
        metadata: body?.metadata ?? undefined,
      };

      const response = await xenditFetch("/payment_tokens", {
        method: "POST",
        body: JSON.stringify(tokenPayload),
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
    }

    const cleanNumber = String(body?.card?.number ?? "").replace(/\D/g, "");
    const expiryMonth = String(body?.card?.exp_month ?? "").padStart(2, "0");
    const expiryYear = String(body?.card?.exp_year ?? "");
    const cvn = String(body?.card?.cvn ?? "");

    if (!cleanNumber || !expiryMonth || !expiryYear || !cvn) {
      return jsonResponse({ error: "Missing card details." }, 400);
    }

    const [rawFirstName, ...lastNameParts] = String(body?.cardholder?.name ?? "").trim().split(/\s+/);
    const firstName = cleanName(body?.cardholder?.first_name ?? rawFirstName, "Cardholder");
    const lastName = cleanName(body?.cardholder?.last_name ?? lastNameParts.join(" "), "NA");
    const email = String(body?.cardholder?.email ?? user.email ?? "").trim();
    const phone = String(body?.cardholder?.phone ?? "").trim();
    const referenceId = `card-save-${user.id}-${crypto.randomUUID()}`;
    const requestAmount = Number(body?.amount) > 0
      ? Math.round(Number(body.amount))
      : Number(Deno.env.get("XENDIT_CARD_SETUP_AMOUNT") ?? DEFAULT_CARD_SETUP_AMOUNT);
    const returnOrigin = typeof body?.return_origin === "string" ? body.return_origin : undefined;

    const paymentRequestPayload = {
      reference_id: referenceId,
      customer: {
        reference_id: cleanCustomerReference(`customer${user.id}`),
        type: "INDIVIDUAL",
        individual_detail: {
          given_names: firstName,
          surname: lastName,
        },
        email,
        mobile_number: phone || undefined,
      },
      type: "PAY_AND_SAVE",
      country: body?.country ?? Deno.env.get("XENDIT_COUNTRY") ?? "PH",
      currency: body?.currency ?? Deno.env.get("XENDIT_CURRENCY") ?? "PHP",
      request_amount: requestAmount,
      capture_method: "AUTOMATIC",
      channel_code: "CARDS",
      channel_properties: {
        mid_label: body?.mid_label ?? Deno.env.get("XENDIT_CARD_MID_LABEL") ?? undefined,
        card_details: {
          cvn,
          card_number: cleanNumber,
          expiry_year: expiryYear,
          expiry_month: expiryMonth,
          cardholder_first_name: firstName,
          cardholder_last_name: lastName,
          cardholder_email: email,
          cardholder_phone_number: phone || undefined,
        },
        skip_three_ds: false,
        failure_return_url: getReturnUrl(returnOrigin, "XENDIT_FAILURE_REDIRECT_URL"),
        success_return_url: getReturnUrl(returnOrigin, "XENDIT_SUCCESS_REDIRECT_URL"),
      },
      description: "Save card for Cashew loan repayments",
      metadata: {
        internal_user_id: user.id,
        setup_type: "card_payment_method",
      },
    };

    const response = await xenditFetch("/v3/payment_requests", {
      method: "POST",
      body: JSON.stringify(paymentRequestPayload),
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return jsonResponse(
        { error: data?.message ?? "Failed to create Xendit payment request.", details: data },
        response.status,
      );
    }

    if (data?.status === "SUCCEEDED" || data?.status === "AUTHORIZED") {
      const saved = await saveCardPaymentMethod(supabase, user.id, data);
      return jsonResponse({
        id: data?.payment_request_id,
        status: data?.status,
        payment_method_id: saved.id,
        already_exists: saved.already_exists,
        payment_request: data,
      });
    }

    return jsonResponse({
      id: data?.payment_request_id,
      status: data?.status,
      action_url: getXenditRedirectUrl(data),
      payment_request: data,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
