-- ============================================================
--  StudyLM — Storage Bucket Setup
--  Run AFTER the schema migration.
-- ============================================================

-- Create the sources bucket (private — files served via signed URLs)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sources',
  'sources',
  false,
  26214400,   -- 25 MB in bytes
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their own folder (userId/notebookId/filename)
create policy "Users upload own sources"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own files
create policy "Users read own sources"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to delete their own files
create policy "Users delete own sources"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'sources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
