create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text not null,
  cta_label text,
  cta_view text,
  active boolean not null default true,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists promotions_active_published_at_idx
  on public.promotions (active, published_at desc);

alter table public.promotions enable row level security;

drop policy if exists "Authenticated users can read active promotions"
  on public.promotions;

create policy "Authenticated users can read active promotions"
  on public.promotions
  for select
  to authenticated
  using (
    active
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

create or replace function public.set_promotions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_promotions_updated_at on public.promotions;

create trigger set_promotions_updated_at
before update on public.promotions
for each row
execute function public.set_promotions_updated_at();

insert into public.promotions (
  slug,
  title,
  subtitle,
  body,
  cta_label,
  cta_view,
  active,
  published_at
)
values (
  'emergency-loans',
  'Emergency loans when timing matters',
  'Fast support for unexpected expenses.',
  'Apply for a Cashew emergency loan to help cover urgent bills, repairs, medical needs, or other short-term gaps. Start an application from your dashboard and we will guide you through the next steps.',
  'Apply for emergency loan',
  'apply',
  true,
  now()
)
on conflict (slug) do update
set
  title = excluded.title,
  subtitle = excluded.subtitle,
  body = excluded.body,
  cta_label = excluded.cta_label,
  cta_view = excluded.cta_view,
  active = excluded.active,
  published_at = excluded.published_at;
