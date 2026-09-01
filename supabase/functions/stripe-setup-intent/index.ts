/**
 * Step 2 of origination: capture and authorize the borrower's card BEFORE the
 * loan agreement is generated, so the agreement can name the exact instrument
 * ("Visa ending 4242") that the mandate will run against.
 *
 * Returns a SetupIntent client_secret for stripe.js to confirm in the browser.
 * No card data ever touches this function or our database.
 */
import { corsHeaders, jsonResponse, preflight } from "../_shared/http.ts";
import { getAuthenticatedUser } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const { supabase, user } = await getAuthenticatedUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const loanId = body?.loan_id ? String(body.loan_id) : null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, first_name, last_name, phone")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return jsonResponse({ error: "Borrower profile not found." }, 404);
    }

    // Reuse the borrower's Stripe customer across loans so repeat borrowers
    // don't accumulate duplicate customer records.
    const { data: existing } = await supabase
      .from("stripe_payment_methods")
      .select("stripe_customer_id")
      .eq("internal_user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();

    let customerId = existing?.stripe_customer_id ?? null;

    if (!customerId) {
      const customer = await stripe().customers.create(
        {
          email: profile.email,
          name: `${profile.first_name} ${profile.last_name}`.trim(),
          phone: profile.phone ?? undefined,
          metadata: { internal_user_id: user.id },
        },
        { idempotencyKey: `customer:${user.id}` },
      );
      customerId = customer.id;
    }

    const setupIntent = await stripe().setupIntents.create({
      customer: customerId,
      // off_session is what makes later merchant-initiated charges legal and
      // gives us a mandate on the payment method.
      usage: "off_session",
      payment_method_types: ["card"],
      payment_method_options: {
        card: {
          // Force 3DS at setup. This proves the card is live before we release
          // funds and carries liability shift onto subsequent MIT charges.
          request_three_d_secure: "any",
        },
      },
      metadata: {
        internal_user_id: user.id,
        loan_id: loanId ?? "",
        purpose: "loan_repayment_mandate",
      },
    });

    return jsonResponse({
      client_secret: setupIntent.client_secret,
      setup_intent_id: setupIntent.id,
      customer_id: customerId,
      publishable_key: Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? null,
    });
  } catch (error) {
    console.error("stripe-setup-intent failed", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      500,
    );
  }
});
