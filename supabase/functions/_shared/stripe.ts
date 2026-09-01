import Stripe from "https://esm.sh/stripe@17.5.0?target=deno";
import { requireEnv } from "./http.ts";

let client: Stripe | null = null;

/**
 * Deno needs Stripe's fetch HTTP client; the default Node client uses `http`
 * and will not run in the edge runtime.
 */
export const stripe = (): Stripe => {
  if (client) return client;
  client = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return client;
};

/** Webhook signature verification must use the async (Web Crypto) variant. */
export const cryptoProvider = Stripe.createSubtleCryptoProvider();
