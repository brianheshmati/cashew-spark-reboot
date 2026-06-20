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

const cleanName = (value: unknown, fallback: string) => {
  const cleaned = String(value ?? "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, 50);

  return cleaned || fallback;
};

const cleanCustomerReference = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 255);

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

const saveCardPaymentMethod = async (
  supabase: any,
  internalUserId: string,
  paymentToken: any,
) => {
  const cardDetails = paymentToken?.channel_properties?.card_details ?? {};
  const paymentTokenId = paymentToken?.payment_token_id;

  if (!paymentTokenId) {
    throw new Error("Xendit did not return a reusable payment token.");
  }

  if (paymentToken?.status !== "ACTIVE") {
    throw new Error(`Payment token is not active. Xendit status: ${paymentToken?.status ?? "UNKNOWN"}.`);
  }

  const fingerprint = cardDetails?.fingerprint ?? paymentTokenId;
  const maskedCardNumber = String(cardDetails?.masked_card_number ?? "");

  const { data: existingCard, error: existingError } = await supabase
    .from("alternative_payment_methods")
    .select("id")
    .eq("internal_user_id", internalUserId)
    .eq("provider", "xendit")
    .eq("provider_token_id", paymentTokenId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingCard) {
    return { id: existingCard.id, already_exists: true };
  }

  if (fingerprint) {
    const { data: duplicateCard, error: duplicateError } = await supabase
      .from("alternative_payment_methods")
      .select("id")
      .eq("internal_user_id", internalUserId)
      .eq("provider", "xendit")
      .eq("fingerprint", fingerprint)
      .eq("is_active", true)
      .maybeSingle();

    if (duplicateError) throw duplicateError;
    if (duplicateCard) {
      return { id: duplicateCard.id, already_exists: true };
    }
  }

  const { count, error: countError } = await supabase
    .from("alternative_payment_methods")
    .select("*", { count: "exact", head: true })
    .eq("internal_user_id", internalUserId)
    .eq("is_active", true);

  if (countError) throw countError;

  const { data, error } = await supabase
    .from("alternative_payment_methods")
    .insert({
      internal_user_id: internalUserId,
      provider: "xendit",
      provider_token_id: paymentTokenId,
      provider_customer_id: paymentToken?.customer_id ?? null,
      provider_reference_id: paymentToken?.reference_id ?? null,
      payment_type: "card",
      channel_code: paymentToken?.channel_code ?? "CARDS",
      brand: cardDetails?.network ?? "Card",
      bank: cardDetails?.issuer ?? null,
      country: cardDetails?.country ?? paymentToken?.country ?? null,
      card_type: cardDetails?.type ?? null,
      fingerprint,
      last4: maskedCardNumber ? maskedCardNumber.slice(-4) : null,
      exp_month: cardDetails?.expiry_month ? Number(cardDetails.expiry_month) : null,
      exp_year: cardDetails?.expiry_year ? Number(cardDetails.expiry_year) : null,
      verification_status: "VERIFIED",
      token_status: paymentToken?.status ?? "ACTIVE",
      is_active: true,
      is_default: (count ?? 0) === 0,
      metadata: paymentToken?.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save payment method: ${error.message}`);

  return { id: data.id, already_exists: false };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

    const { supabase, user } = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));

    if (body?.payment_token_id) {
      const response = await xenditFetch(`/v3/payment_tokens/${body.payment_token_id}`, {
        method: "GET",
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return jsonResponse(
          { error: data?.message ?? "Failed to verify Xendit payment token.", details: data },
          response.status,
        );
      }

      if (data?.metadata?.internal_user_id && data.metadata.internal_user_id !== user.id) {
        return jsonResponse({ error: "Payment token does not belong to this user." }, 403);
      }

      if (data?.status !== "ACTIVE") {
        return jsonResponse(
          {
            error: `Card setup is not complete. Xendit status: ${data?.status ?? "UNKNOWN"}.`,
            action_url: getRedirectUrl(data),
            payment_token: data,
          },
          409,
        );
      }

      const saved = await saveCardPaymentMethod(supabase, user.id, data);
      return jsonResponse({
        success: true,
        payment_method_id: saved.id,
        already_exists: saved.already_exists,
        payment_token: data,
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
    const returnOrigin = typeof body?.return_origin === "string" ? body.return_origin : undefined;
    const referenceId = `card-token-${user.id}-${crypto.randomUUID()}`.slice(0, 255);

    const tokenPayload = {
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
      country: body?.country ?? Deno.env.get("XENDIT_COUNTRY") ?? "PH",
      currency: body?.currency ?? Deno.env.get("XENDIT_CURRENCY") ?? "PHP",
      channel_code: "CARDS",
      channel_properties: {
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
        setup_type: "saved_card_payment_method",
      },
    };

    const response = await xenditFetch("/v3/payment_tokens", {
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

    if (data?.status === "ACTIVE") {
      const saved = await saveCardPaymentMethod(supabase, user.id, data);
      return jsonResponse({
        id: data?.payment_token_id,
        status: data?.status,
        payment_method_id: saved.id,
        already_exists: saved.already_exists,
        payment_token: data,
      });
    }

    return jsonResponse({
      id: data?.payment_token_id,
      status: data?.status,
      action_url: getRedirectUrl(data),
      payment_token: data,
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
