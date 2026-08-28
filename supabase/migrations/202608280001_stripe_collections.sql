-- Stripe-backed collections for Cashew loans.
--
-- Design notes:
--   * Money that will ever be sent to Stripe is stored as bigint centavos.
--     PHP is a 2-decimal currency; numeric -> float rounding at charge time is
--     how you double-charge or short-charge a borrower. Amounts are frozen at
--     schedule-generation time and never recomputed.
--   * public.payment_schedules stays the single source of truth for what is
--     owed. Stripe is only an executor of charges.
--   * A loan cannot be disbursed until (a) the borrower signed the agreement
--     and (b) a usable off-session mandate exists. Enforced by trigger, not UI.

-- ---------------------------------------------------------------------------
-- Stripe payment methods (mandates)
-- ---------------------------------------------------------------------------

create table if not exists public.stripe_payment_methods (
  id uuid primary key default gen_random_uuid(),
  internal_user_id uuid not null references public.profiles(id) on delete cascade,

  stripe_customer_id text not null,
  stripe_payment_method_id text not null,
  stripe_setup_intent_id text,

  -- Mandate evidence. Populated from setup_intent.succeeded.
  mandate_id text,
  three_d_secure_status text,

  brand text,
  last4 text,
  exp_month integer check (exp_month is null or exp_month between 1 and 12),
  exp_year integer,
  funding text,
  country text,
  fingerprint text,

  status text not null default 'pending'
    check (status in ('pending', 'authorized', 'failed', 'revoked', 'expired')),
  is_default boolean not null default false,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists stripe_payment_methods_pm_key
  on public.stripe_payment_methods (stripe_payment_method_id);

create index if not exists stripe_payment_methods_user_idx
  on public.stripe_payment_methods (internal_user_id, status);

-- At most one default card per borrower.
create unique index if not exists stripe_payment_methods_one_default
  on public.stripe_payment_methods (internal_user_id)
  where is_default;

-- ---------------------------------------------------------------------------
-- Loan agreements (esignatures.com)
-- ---------------------------------------------------------------------------

create table if not exists public.loan_agreements (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  internal_user_id uuid not null references public.profiles(id) on delete cascade,

  -- The card named in the signed document. The mandate is only valid for the
  -- instrument the borrower actually saw and signed against.
  stripe_payment_method_id uuid
    references public.stripe_payment_methods(id) on delete restrict,

  esign_contract_id text not null,
  esign_template_id text,
  template_version text not null default 'v1',

  status text not null default 'sent'
    check (status in ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired')),

  -- Dispute evidence. Snapshot of exactly what was rendered to the borrower --
  -- reconstructing this after the fact is worthless in a chargeback.
  schedule_snapshot jsonb,
  agreement_pdf_url text,

  signer_name text,
  signer_email text,
  signer_ip inet,
  signed_at timestamptz,
  audit_trail jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists loan_agreements_esign_contract_id_key
  on public.loan_agreements (esign_contract_id);

create index if not exists loan_agreements_loan_idx
  on public.loan_agreements (loan_id, status);

-- ---------------------------------------------------------------------------
-- Schedule: frozen charge amounts + retry state
-- ---------------------------------------------------------------------------

alter table public.payment_schedules
  add column if not exists amount_due_centavos bigint,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists last_error text,
  add column if not exists collection_state text not null default 'scheduled'
    check (collection_state in ('scheduled', 'in_flight', 'collected', 'retrying', 'arrears', 'manual', 'waived'));

-- Backfill from the existing numeric column, then make it required.
update public.payment_schedules
   set amount_due_centavos = round(amount_due * 100)::bigint
 where amount_due_centavos is null;

alter table public.payment_schedules
  alter column amount_due_centavos set not null;

alter table public.payment_schedules
  drop constraint if exists payment_schedules_amount_due_centavos_positive;
alter table public.payment_schedules
  add constraint payment_schedules_amount_due_centavos_positive
  check (amount_due_centavos > 0);

create index if not exists payment_schedules_due_collection_idx
  on public.payment_schedules (due_date, collection_state)
  where collection_state in ('scheduled', 'retrying');

alter table public.payments
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_charge_id text;

create unique index if not exists payments_stripe_payment_intent_key
  on public.payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- Collection attempts -- the idempotency ledger
-- ---------------------------------------------------------------------------

create table if not exists public.collection_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_schedule_id uuid not null
    references public.payment_schedules(id) on delete cascade,
  loan_id uuid not null references public.loans(id) on delete cascade,
  stripe_payment_method_id uuid
    references public.stripe_payment_methods(id) on delete set null,

  attempt_no integer not null check (attempt_no > 0),
  amount_centavos bigint not null check (amount_centavos > 0),

  -- Deterministic. Reused verbatim as the Stripe Idempotency-Key so a
  -- double-fired cron cannot produce a second charge.
  idempotency_key text not null,

  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'requires_action', 'canceled')),

  stripe_payment_intent_id text,
  failure_code text,
  failure_message text,

  attempted_at timestamptz not null default now(),
  settled_at timestamptz
);

-- One attempt row per (installment, attempt). This unique index is the actual
-- double-charge guard: the insert must win before any Stripe call is made.
create unique index if not exists collection_attempts_schedule_attempt_key
  on public.collection_attempts (payment_schedule_id, attempt_no);

create unique index if not exists collection_attempts_idempotency_key
  on public.collection_attempts (idempotency_key);

-- ---------------------------------------------------------------------------
-- Notification log -- send-once semantics for borrower email
-- ---------------------------------------------------------------------------

create table if not exists public.notification_log (
  id uuid primary key default gen_random_uuid(),
  internal_user_id uuid references public.profiles(id) on delete cascade,
  loan_id uuid references public.loans(id) on delete cascade,
  payment_schedule_id uuid references public.payment_schedules(id) on delete cascade,

  kind text not null check (kind in (
    'mandate_authorized',
    'agreement_signed',
    'pre_debit_notice',
    'payment_succeeded',
    'payment_failed',
    'final_notice',
    'loan_paid_off'
  )),
  channel text not null default 'email' check (channel in ('email', 'sms')),
  recipient text not null,

  -- Natural key for "send this exactly once".
  dedupe_key text not null,

  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  payload jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create unique index if not exists notification_log_dedupe_key
  on public.notification_log (dedupe_key);

-- ---------------------------------------------------------------------------
-- Raw webhook events -- replay protection + forensics
-- ---------------------------------------------------------------------------

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('stripe', 'esignatures')),
  event_id text not null,
  event_type text,
  payload jsonb not null,
  processed_at timestamptz,
  error text,
  received_at timestamptz not null default now()
);

create unique index if not exists webhook_events_source_event_key
  on public.webhook_events (source, event_id);

-- ---------------------------------------------------------------------------
-- Disbursement gate
-- ---------------------------------------------------------------------------

alter table public.loans
  add column if not exists agreement_id uuid
    references public.loan_agreements(id) on delete set null,
  add column if not exists stripe_payment_method_id uuid
    references public.stripe_payment_methods(id) on delete restrict,
  add column if not exists disbursed_at timestamptz;

create or replace function public.enforce_disbursement_prerequisites()
returns trigger
language plpgsql
as $$
declare
  agreement_ok boolean;
  mandate_ok boolean;
begin
  -- Only guard the transition into a funded state.
  if new.status is distinct from 'active'::public.loan_status then
    return new;
  end if;

  if old.status is not distinct from 'active'::public.loan_status then
    return new;
  end if;

  select exists (
    select 1
      from public.loan_agreements la
     where la.loan_id = new.id
       and la.status = 'signed'
       and la.signed_at is not null
  ) into agreement_ok;

  if not agreement_ok then
    raise exception
      'Loan % cannot be disbursed: no signed loan agreement on file.', new.id
      using errcode = 'check_violation';
  end if;

  select exists (
    select 1
      from public.stripe_payment_methods spm
     where spm.id = new.stripe_payment_method_id
       and spm.status = 'authorized'
  ) into mandate_ok;

  if not mandate_ok then
    raise exception
      'Loan % cannot be disbursed: no authorized Stripe mandate on file.', new.id
      using errcode = 'check_violation';
  end if;

  if new.disbursed_at is null then
    new.disbursed_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists loans_enforce_disbursement_prerequisites on public.loans;
create trigger loans_enforce_disbursement_prerequisites
  before update on public.loans
  for each row
  execute function public.enforce_disbursement_prerequisites();

-- ---------------------------------------------------------------------------
-- Collection queue
-- ---------------------------------------------------------------------------

create or replace view public.due_collections as
select
  ps.id                       as payment_schedule_id,
  ps.loan_id,
  ps.payment_number,
  ps.due_date,
  ps.amount_due_centavos,
  ps.attempt_count,
  ps.collection_state,
  l.user_id                   as internal_user_id,
  spm.id                      as stripe_payment_method_row_id,
  spm.stripe_customer_id,
  spm.stripe_payment_method_id,
  p.email                     as borrower_email,
  p.first_name,
  p.last_name
from public.payment_schedules ps
join public.loans l
  on l.id = ps.loan_id
join public.stripe_payment_methods spm
  on spm.id = l.stripe_payment_method_id
 and spm.status = 'authorized'
join public.profiles p
  on p.id = l.user_id
where l.status = 'active'
  and l.disbursed_at is not null
  and ps.collection_state in ('scheduled', 'retrying')
  and coalesce(ps.paid_amount, 0) < ps.amount_due
  and ps.due_date <= current_date
  and (ps.next_attempt_at is null or ps.next_attempt_at <= now());

-- Borrowers who should get a pre-debit notice. Fires 3 days ahead: enough time
-- to fund the account, which is the cheapest way to prevent a failed charge.
create or replace view public.upcoming_debits as
select
  ps.id                       as payment_schedule_id,
  ps.loan_id,
  ps.payment_number,
  ps.due_date,
  ps.amount_due_centavos,
  l.user_id                   as internal_user_id,
  spm.brand,
  spm.last4,
  p.email                     as borrower_email,
  p.first_name
from public.payment_schedules ps
join public.loans l
  on l.id = ps.loan_id
join public.stripe_payment_methods spm
  on spm.id = l.stripe_payment_method_id
join public.profiles p
  on p.id = l.user_id
where l.status = 'active'
  and ps.collection_state = 'scheduled'
  and coalesce(ps.paid_amount, 0) < ps.amount_due
  and ps.due_date = current_date + 3;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.stripe_payment_methods enable row level security;
alter table public.loan_agreements        enable row level security;
alter table public.collection_attempts    enable row level security;
alter table public.notification_log       enable row level security;
alter table public.webhook_events         enable row level security;

drop policy if exists "Borrowers read own cards" on public.stripe_payment_methods;
create policy "Borrowers read own cards"
  on public.stripe_payment_methods
  for select to authenticated
  using (internal_user_id = auth.uid());

drop policy if exists "Borrowers read own agreements" on public.loan_agreements;
create policy "Borrowers read own agreements"
  on public.loan_agreements
  for select to authenticated
  using (internal_user_id = auth.uid());

drop policy if exists "Borrowers read own attempts" on public.collection_attempts;
create policy "Borrowers read own attempts"
  on public.collection_attempts
  for select to authenticated
  using (
    exists (
      select 1 from public.loans l
       where l.id = collection_attempts.loan_id
         and l.user_id = auth.uid()
    )
  );

-- notification_log and webhook_events are service-role only: no policies, RLS
-- on. Writes happen exclusively from edge functions.
