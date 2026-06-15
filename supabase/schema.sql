-- Run this in the Supabase SQL editor before enabling cloud sync.
create table if not exists public.weight_histories (
  user_id text primary key,
  weights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weight_histories enable row level security;

create or replace function public.current_weight_user_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json ->> 'x-user-id',
    ''
  );
$$;

drop policy if exists "Allow anonymous reads by link id" on public.weight_histories;
drop policy if exists "Allow anonymous inserts by link id" on public.weight_histories;
drop policy if exists "Allow anonymous updates by link id" on public.weight_histories;

-- The unguessable ?id=... URL acts as the private key. The frontend sends it as x-user-id.
create policy "Allow anonymous reads by link id"
  on public.weight_histories
  for select
  to anon
  using (user_id = public.current_weight_user_id());

create policy "Allow anonymous inserts by link id"
  on public.weight_histories
  for insert
  to anon
  with check (user_id = public.current_weight_user_id());

create policy "Allow anonymous updates by link id"
  on public.weight_histories
  for update
  to anon
  using (user_id = public.current_weight_user_id())
  with check (user_id = public.current_weight_user_id());
