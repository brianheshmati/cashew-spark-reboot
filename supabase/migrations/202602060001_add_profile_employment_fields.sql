alter table public.profiles
  add column if not exists employer_name text,
  add column if not exists employer_address text,
  add column if not exists employer_phone text,
  add column if not exists position text,
  add column if not exists years_employed integer;
