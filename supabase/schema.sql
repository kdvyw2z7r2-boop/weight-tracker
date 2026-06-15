-- Weight Tracker — Supabase schema (run in the SQL editor before enabling cloud sync).
-- The unguessable ?id=... URL acts as the user's private key. The frontend sends it
-- as the `x-user-id` header, and every RLS policy checks it.

-- Helper: read the x-user-id header from the current request.
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

-- ============================================================
-- Tables
-- ============================================================

-- One row per weigh-in.
create table if not exists public.entries (
  id uuid primary key,
  user_id text not null,
  date date not null,
  weight numeric not null,
  note text not null default '',
  created_at bigint not null,
  updated_at timestamptz not null default now()
);

create index if not exists entries_user_id_date_idx on public.entries (user_id, date desc);

-- One settings row per user.
create table if not exists public.user_settings (
  user_id text primary key,
  settings jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- One photo per calendar day per user.
create table if not exists public.daily_photos (
  user_id text not null,
  date date not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.entries enable row level security;
alter table public.user_settings enable row level security;
alter table public.daily_photos enable row level security;

drop policy if exists "entries_by_link_id" on public.entries;
create policy "entries_by_link_id" on public.entries
  for all to anon
  using (user_id = public.current_weight_user_id())
  with check (user_id = public.current_weight_user_id());

drop policy if exists "user_settings_by_link_id" on public.user_settings;
create policy "user_settings_by_link_id" on public.user_settings
  for all to anon
  using (user_id = public.current_weight_user_id())
  with check (user_id = public.current_weight_user_id());

drop policy if exists "daily_photos_by_link_id" on public.daily_photos;
create policy "daily_photos_by_link_id" on public.daily_photos
  for all to anon
  using (user_id = public.current_weight_user_id())
  with check (user_id = public.current_weight_user_id());

-- ============================================================
-- Storage (private bucket for progress photos)
-- Create the bucket first (Dashboard → Storage → New bucket "progress-photos", private),
-- or run the insert below. Photos are stored under {user_id}/{date}.webp.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

drop policy if exists "progress_photos_by_link_id" on storage.objects;
create policy "progress_photos_by_link_id" on storage.objects
  for all to anon
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = public.current_weight_user_id()
  )
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = public.current_weight_user_id()
  );
