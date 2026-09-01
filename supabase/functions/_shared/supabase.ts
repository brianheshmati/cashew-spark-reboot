import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireEnv } from "./http.ts";

/** Service-role client. Bypasses RLS -- never hand this to a browser. */
export const serviceClient = (): SupabaseClient =>
  createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });

/** Resolves the caller from their bearer token. Returns null when anonymous. */
export const getAuthenticatedUser = async (req: Request) => {
  const supabase = serviceClient();
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  if (!token) return { supabase, user: null };

  const { data, error } = await supabase.auth.getUser(token);
  return { supabase, user: error ? null : data.user };
};

/**
 * Records a webhook event and reports whether this handler should process it.
 *
 * Providers retry aggressively, so handlers must be replay-safe. But a claim
 * alone is not enough: if a handler crashes after claiming, the retry would be
 * dismissed as a duplicate and the event lost. So a row that exists but was
 * never marked processed is handed back as claimable.
 */
export const claimWebhookEvent = async (
  supabase: SupabaseClient,
  source: "stripe" | "esignatures",
  eventId: string,
  eventType: string,
  payload: unknown,
): Promise<{ isNew: boolean; rowId: string | null }> => {
  const { data, error } = await supabase
    .from("webhook_events")
    .insert({ source, event_id: eventId, event_type: eventType, payload })
    .select("id")
    .maybeSingle();

  if (!error) return { isNew: true, rowId: data?.id ?? null };

  // 23505 = unique violation: we have seen this event id before.
  if (error.code !== "23505") throw error;

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id, processed_at")
    .eq("source", source)
    .eq("event_id", eventId)
    .maybeSingle();

  // Completed successfully -- genuine duplicate, skip.
  if (existing?.processed_at) return { isNew: false, rowId: existing.id };

  // Previously claimed but never completed. Let the retry run it again;
  // downstream writes are individually idempotent.
  return { isNew: true, rowId: existing?.id ?? null };
};

export const markWebhookProcessed = async (
  supabase: SupabaseClient,
  rowId: string | null,
  error?: string,
) => {
  if (!rowId) return;
  await supabase
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString(), error: error ?? null })
    .eq("id", rowId);
};
