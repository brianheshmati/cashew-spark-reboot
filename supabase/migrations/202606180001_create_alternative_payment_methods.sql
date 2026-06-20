create table if not exists public.alternative_payment_methods (
  id uuid primary key default gen_random_uuid(),
  internal_user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'xendit',
  provider_token_id text not null,
  provider_customer_id text,
  provider_reference_id text,
  payment_type text not null default 'card'
    check (payment_type in ('card', 'ach', 'payroll')),
  channel_code text not null default 'CARDS',
  brand text,
  bank text,
  country text,
  card_type text,
  fingerprint text,
  last4 text,
  exp_month integer check (exp_month is null or exp_month between 1 and 12),
  exp_year integer,
  verification_status text not null default 'PENDING',
  token_status text not null default 'PENDING',
  is_default boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists alternative_payment_methods_provider_token_id_key
  on public.alternative_payment_methods (provider, provider_token_id);

create unique index if not exists alternative_payment_methods_active_fingerprint_key
  on public.alternative_payment_methods (internal_user_id, provider, fingerprint)
  where fingerprint is not null and is_active;

create unique index if not exists alternative_payment_methods_one_default_per_user_key
  on public.alternative_payment_methods (internal_user_id)
  where is_default and is_active;

create index if not exists alternative_payment_methods_internal_user_id_idx
  on public.alternative_payment_methods (internal_user_id, is_active, created_at desc);

alter table public.alternative_payment_methods enable row level security;

drop policy if exists "Users can read their alternative payment methods"
  on public.alternative_payment_methods;

create policy "Users can read their alternative payment methods"
  on public.alternative_payment_methods
  for select
  to authenticated
  using (internal_user_id = auth.uid());

drop policy if exists "Users can update their alternative payment methods"
  on public.alternative_payment_methods;

create policy "Users can update their alternative payment methods"
  on public.alternative_payment_methods
  for update
  to authenticated
  using (internal_user_id = auth.uid())
  with check (internal_user_id = auth.uid());

create or replace function public.set_alternative_payment_methods_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_alternative_payment_methods_updated_at on public.alternative_payment_methods;

create trigger set_alternative_payment_methods_updated_at
before update on public.alternative_payment_methods
for each row
execute function public.set_alternative_payment_methods_updated_at();

create or replace function public.prevent_alternative_payment_method_token_tampering()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    if new.internal_user_id is distinct from old.internal_user_id
      or new.provider is distinct from old.provider
      or new.provider_token_id is distinct from old.provider_token_id
      or new.provider_customer_id is distinct from old.provider_customer_id
      or new.provider_reference_id is distinct from old.provider_reference_id
      or new.payment_type is distinct from old.payment_type
      or new.channel_code is distinct from old.channel_code
      or new.brand is distinct from old.brand
      or new.bank is distinct from old.bank
      or new.country is distinct from old.country
      or new.card_type is distinct from old.card_type
      or new.fingerprint is distinct from old.fingerprint
      or new.last4 is distinct from old.last4
      or new.exp_month is distinct from old.exp_month
      or new.exp_year is distinct from old.exp_year
      or new.verification_status is distinct from old.verification_status
      or new.token_status is distinct from old.token_status
      or new.metadata is distinct from old.metadata then
      raise exception 'Payment method token fields cannot be changed from the client.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_alternative_payment_method_token_tampering on public.alternative_payment_methods;

create trigger prevent_alternative_payment_method_token_tampering
before update on public.alternative_payment_methods
for each row
execute function public.prevent_alternative_payment_method_token_tampering();
