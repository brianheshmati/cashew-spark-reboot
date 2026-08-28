# Stripe collections — deployment & flow

Replaces the Xendit integration. `payment_schedules` remains the single source
of truth for what is owed; Stripe only executes charges against it.

## Why not Stripe Subscriptions

Recorded here because it will be asked again:

- **Wrong failure semantics.** Subscriptions go `past_due → canceled`. A loan
  does not get cancelled when a payment fails — the debt persists and accrues
  late charges. `collection_state` models arrears properly.
- **Schedules are not fixed.** Prepayment collapses remaining installments;
  partial payments split across periods. Subscriptions want price × interval.
- **The cadence isn't expressible.** Cashew bills semi-monthly (e.g. the 14th
  and 29th). Stripe intervals are day/week/month/year; `interval_count: 15`
  drifts (14 → 29 → 13 → 28).
- **Two sources of truth.** A Subscription would duplicate the ledger and
  diverge from it.

## Origination flow

```
1. Approve → generate schedule (amount_due_centavos frozen here)
2. POST stripe-setup-intent          → client_secret
   StripeCardSetup (Elements + 3DS)  → borrower authorizes
3. stripe-webhook: setup_intent.succeeded
   → stripe_payment_methods row (status='authorized'), loan linked
   → email: mandate_authorized
4. Generate esignatures contract, merging {{card_brand}} / {{card_last4}}
   → insert loan_agreements row with esign_contract_id
5. esignatures-webhook: contract-signed
   → agreement status='signed' + audit trail captured
   → loans.status='active'  (DB trigger verifies signature AND mandate)
   → email: agreement_signed (with full schedule)
6. Disburse funds
```

**Card capture must precede contract generation.** The agreement names the exact
card it authorizes; a mandate the borrower never saw in the signed document is
not enforceable and loses chargebacks.

## Collection flow

`collect-due-payments` runs daily:

1. Reads `due_collections` (due today or earlier, mandate authorized, loan active).
2. Claims a `collection_attempts` row — unique on `(payment_schedule_id, attempt_no)`.
   Losing this race means another worker owns the charge.
3. Creates a PaymentIntent with `off_session: true, confirm: true` and the same
   claim key as `Idempotency-Key`.
4. `stripe-webhook` does all terminal bookkeeping. It is the only writer of
   `payments` rows.

Retry ladder: due date, +1 day, +2 days, then `arrears` + final notice. This
lands inside the 5-day window before the agreement's default clause bites.

`send-pre-debit-notices` runs daily and emails borrowers 3 days ahead. This is
the cheapest reduction in failed charges — the borrower funds the account
instead of being surprised.

## Deploy

```bash
supabase db push

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_PUBLISHABLE_KEY=pk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  ESIGNATURES_WEBHOOK_SECRET=$(openssl rand -hex 32) \
  CRON_SECRET=$(openssl rand -hex 32) \
  RESEND_API_KEY=re_...

supabase functions deploy stripe-setup-intent
supabase functions deploy stripe-webhook        --no-verify-jwt
supabase functions deploy esignatures-webhook   --no-verify-jwt
supabase functions deploy collect-due-payments  --no-verify-jwt
supabase functions deploy send-pre-debit-notices --no-verify-jwt
```

`--no-verify-jwt` is required for the webhooks and crons: they authenticate with
a signature or shared secret, not a Supabase JWT.

### Stripe dashboard

Add an endpoint at `https://<project>.supabase.co/functions/v1/stripe-webhook`
subscribed to:

- `setup_intent.succeeded`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.dispute.created`

### esignatures.com

Set the webhook to `https://<project>.supabase.co/functions/v1/esignatures-webhook`
with the `ESIGNATURES_WEBHOOK_SECRET` value as `secret_token`.

### Schedule the crons

```sql
select cron.schedule(
  'collect-due-payments', '0 2 * * *',
  $$ select net.http_post(
       url     := 'https://<project>.supabase.co/functions/v1/collect-due-payments',
       headers := '{"x-cron-secret":"<CRON_SECRET>"}'::jsonb
     ) $$
);

select cron.schedule(
  'send-pre-debit-notices', '0 1 * * *',
  $$ select net.http_post(
       url     := 'https://<project>.supabase.co/functions/v1/send-pre-debit-notices',
       headers := '{"x-cron-secret":"<CRON_SECRET>"}'::jsonb
     ) $$
);
```

Charges run at 02:00 UTC (10:00 Manila), notices an hour earlier.

## Regenerate types

`src/integrations/supabase/types.ts` still describes the old schema. After
`db push`:

```bash
supabase gen types typescript --project-id fklaxhpublxhgxcajuyu > src/integrations/supabase/types.ts
```
