-- Public storage bucket for APK releases
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'releases',
  'releases',
  true,
  104857600,  -- 100 MB limit
  array['application/vnd.android.package-archive', 'application/octet-stream']
)
on conflict (id) do nothing;

-- Allow anyone to download files from this bucket
create policy "Public read releases"
  on storage.objects for select
  using (bucket_id = 'releases');

-- Only service role / authenticated admins can upload
create policy "Admin upload releases"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'releases'
    and public.is_admin()
  );
