-- Photo storage setup — run entirely in Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / ON CONFLICT).

-- 1. Helper: read x-user-id header sent by the app
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

-- 2. Table for photo metadata (one photo per day per user)
create table if not exists public.daily_photos (
  user_id text not null,
  date date not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.daily_photos enable row level security;

drop policy if exists "daily_photos_by_link_id" on public.daily_photos;
create policy "daily_photos_by_link_id" on public.daily_photos
  for all to anon
  using (user_id = public.current_weight_user_id())
  with check (user_id = public.current_weight_user_id());

-- 3. Private Storage bucket
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;

-- 4. Storage RLS (files under {user_id}/{date}.webp)
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
