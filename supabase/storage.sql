-- Run this in Supabase SQL Editor if photo upload fails with "Bucket not found".
-- Or create the bucket manually: Storage → New bucket → name "progress-photos" → Private.

-- Requires current_weight_user_id() from schema.sql (run schema.sql first if missing).

insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do update set public = false;

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
