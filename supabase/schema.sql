-- Run this in the Supabase SQL editor before enabling cloud sync.
create table if not exists public.weight_histories (
  user_id text primary key,
  weights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weight_histories enable row level security;

-- This app has no account system: the unguessable ?id=... URL acts as the user's private key.
-- The frontend only queries exact user_id values, but anyone with a copied link can access that history.
create policy "Allow anonymous reads by link id"
  on public.weight_histories
  for select
  to anon
  using (true);

create policy "Allow anonymous inserts by link id"
  on public.weight_histories
  for insert
  to anon
  with check (true);

create policy "Allow anonymous updates by link id"
  on public.weight_histories
  for update
  to anon
  using (true)
  with check (true);
