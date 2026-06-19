-- R2 Storage Admin Utilities
-- Run these queries in Supabase SQL Editor for troubleshooting and migration

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Check R2 Storage Status
-- ═══════════════════════════════════════════════════════════════════════════

-- Count documents by storage type
SELECT 
  CASE 
    WHEN file_path IS NOT NULL THEN 'r2_private'
    WHEN file_url IS NOT NULL THEN 'r2_public_url'
    WHEN content IS NOT NULL THEN 'inline_text'
    ELSE 'no_storage'
  END as storage_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users
FROM sources
GROUP BY storage_type
ORDER BY count DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Find Orphaned Documents (in DB but not in R2)
-- ═══════════════════════════════════════════════════════════════════════════

-- List documents with file_path but no corresponding chunks
SELECT 
  s.id,
  s.user_id,
  s.title,
  s.file_path,
  s.processing_status,
  s.created_at,
  COUNT(sc.id) as chunk_count
FROM sources s
LEFT JOIN source_chunks sc ON s.id = sc.source_id
WHERE s.file_path IS NOT NULL
GROUP BY s.id, s.user_id, s.title, s.file_path, s.processing_status, s.created_at
HAVING COUNT(sc.id) = 0
ORDER BY s.created_at DESC;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Storage Usage by User
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  p.email,
  p.full_name,
  COUNT(s.id) as document_count,
  SUM(s.word_count) as total_words,
  COUNT(DISTINCT s.notebook_id) as notebook_count
FROM profiles p
LEFT JOIN sources s ON p.id = s.user_id
WHERE s.file_path IS NOT NULL
GROUP BY p.id, p.email, p.full_name
ORDER BY document_count DESC
LIMIT 20;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Find Documents with Processing Errors
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  id,
  user_id,
  title,
  file_path,
  processing_status,
  error_message,
  created_at
FROM sources
WHERE processing_status = 'error'
ORDER BY created_at DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Retry Failed Processing (Admin Only)
-- ═══════════════════════════════════════════════════════════════════════════

-- Reset status to pending for manual retry
-- Replace 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' with actual UUID
-- UPDATE sources
-- SET 
--   processing_status = 'pending',
--   error_message = NULL,
--   updated_at = NOW()
-- WHERE id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Clean Up Orphaned Chunks (chunks with no source)
-- ═══════════════════════════════════════════════════════════════════════════

-- First, identify orphaned chunks
SELECT 
  sc.id,
  sc.source_id,
  sc.user_id,
  sc.created_at
FROM source_chunks sc
LEFT JOIN sources s ON sc.source_id = s.id
WHERE s.id IS NULL
LIMIT 100;

-- Delete orphaned chunks (be careful!)
-- DELETE FROM source_chunks
-- WHERE source_id IN (
--   SELECT sc.source_id
--   FROM source_chunks sc
--   LEFT JOIN sources s ON sc.source_id = s.id
--   WHERE s.id IS NULL
-- );

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Migrate Public URLs to Private Storage
-- ═══════════════════════════════════════════════════════════════════════════

-- Backfill file_path from file_url for existing documents
-- This extracts the R2 key from the public URL
-- Example: https://account.r2.cloudflarestorage.com/bucket/user-id/file.pdf
--       -> user-id/file.pdf

-- First, preview the migration
SELECT 
  id,
  file_url,
  file_path,
  REGEXP_REPLACE(
    REGEXP_REPLACE(file_url, '^https?://[^/]+/[^/]+/', ''),
    '\\?.*$', 
    ''
  ) as extracted_path
FROM sources
WHERE file_url IS NOT NULL 
  AND file_path IS NULL
LIMIT 10;

-- Then, execute the migration (uncomment to run)
-- UPDATE sources
-- SET file_path = REGEXP_REPLACE(
--   REGEXP_REPLACE(file_url, '^https?://[^/]+/[^/]+/', ''),
--   '\\?.*$', 
--   ''
-- )
-- WHERE file_url IS NOT NULL 
--   AND file_path IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Audit Document Access (Create Access Log Table)
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: Commented out by default - uncomment to create if needed
-- CREATE TABLE IF NOT EXISTS document_access_log (
--   id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
--   user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
--   action TEXT NOT NULL CHECK (action IN ('view', 'download', 'share')),
--   ip_address INET,
--   user_agent TEXT,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- CREATE INDEX IF NOT EXISTS idx_access_log_user ON document_access_log(user_id);
-- CREATE INDEX IF NOT EXISTS idx_access_log_source ON document_access_log(source_id);
-- CREATE INDEX IF NOT EXISTS idx_access_log_created ON document_access_log(created_at);

-- Enable RLS
-- ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

-- Admins can view all access logs
-- CREATE POLICY "Admins view access logs"
--   ON document_access_log FOR SELECT
--   USING (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Check R2 Function Deployment Status
-- ═══════════════════════════════════════════════════════════════════════════

-- Note: This query won't work in SQL - use CLI instead:
-- supabase functions list
-- supabase secrets list

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Performance Monitoring
-- ═══════════════════════════════════════════════════════════════════════════

-- Find slow-processing documents
SELECT 
  id,
  title,
  processing_status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_seconds
FROM sources
WHERE processing_status IN ('processing', 'ready')
  AND updated_at > created_at
ORDER BY processing_seconds DESC
LIMIT 20;

-- Documents by processing status
SELECT 
  processing_status,
  COUNT(*) as count,
  AVG(word_count) as avg_words,
  AVG(chunk_count) as avg_chunks
FROM sources
WHERE file_path IS NOT NULL
GROUP BY processing_status;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Bulk Delete User Documents (DANGEROUS)
-- ═══════════════════════════════════════════════════════════════════════════

-- Delete all documents for a specific user
-- WARNING: This only deletes DB records, not R2 files
-- You must manually delete R2 files from Cloudflare dashboard

-- First, preview what will be deleted (replace UUID below)
-- SELECT 
--   s.id,
--   s.title,
--   s.file_path,
--   s.created_at
-- FROM sources s
-- WHERE s.user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
-- ORDER BY s.created_at DESC;

-- Then delete (uncomment to execute, replace UUID)
-- DELETE FROM sources WHERE user_id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. Find Large Documents
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 
  id,
  user_id,
  title,
  word_count,
  chunk_count,
  ROUND(word_count::numeric / 250, 1) as estimated_read_minutes
FROM sources
WHERE word_count > 10000
ORDER BY word_count DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. Check RLS Policies
-- ═══════════════════════════════════════════════════════════════════════════

-- List all policies on sources table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'sources';

-- Test RLS enforcement (run as non-admin user)
-- Should only return current user's documents
SELECT COUNT(*) FROM sources;
