# R2 Private Storage - Quick Reference

> Copy-paste commands and code snippets for common operations

---

## Setup (One-Time)

```bash
# 1. Set Supabase secrets
supabase secrets set R2_ACCOUNT_ID=your-account-id
supabase secrets set R2_BUCKET_NAME=studylm-documents
supabase secrets set R2_ACCESS_KEY_ID=your-access-key-id
supabase secrets set R2_SECRET_ACCESS_KEY=your-secret-access-key

# 2. Deploy Edge Functions
supabase functions deploy get-document-url
supabase functions deploy generate-upload-url
supabase functions deploy process-source

# 3. Verify
supabase secrets list
supabase functions list
```

---

## Upload a Document (Frontend)

```typescript
import { useUploadSource } from '@/hooks/useUploadSource';

function UploadButton() {
  const { uploadFile, progress } = useUploadSource(notebookId);
  
  const handleUpload = async (file: File) => {
    const source = await uploadFile(file);
    if (source) {
      console.log('Uploaded:', source.id);
    }
  };
  
  return (
    <input 
      type="file" 
      onChange={(e) => handleUpload(e.target.files[0])}
    />
  );
}
```

---

## View a Document (Frontend)

```typescript
import { DocumentViewer } from '@/components/viewer/DocumentViewer';

function DocumentPage() {
  return (
    <DocumentViewer 
      sourceId="abc-123-def"
      fileType="pdf"
      title="My Notes"
    />
  );
}
```

---

## Get Signed URL Programmatically

```typescript
import { useDocumentUrl } from '@/hooks/useDocumentUrl';

function MyComponent() {
  const { data: url, isLoading, error } = useDocumentUrl(sourceId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <a href={url} download>Download</a>;
}
```

---

## Edge Function: Generate Signed URL

```bash
# Endpoint
GET /functions/v1/get-document-url?sourceId={id}

# Headers
Authorization: Bearer {jwt}
apikey: {supabase-anon-key}

# Response
{
  "url": "https://account.r2.cloudflarestorage.com/bucket/key?X-Amz-Signature=..."
}

# Errors
401 Unauthorized      - Invalid JWT
404 Document not found - Source doesn't exist or user doesn't own it
500 R2 not configured - Missing secrets
```

---

## Database Queries

### Find user's documents
```sql
SELECT id, title, file_path, processing_status, created_at
FROM sources
WHERE user_id = 'user-id'
  AND file_path IS NOT NULL
ORDER BY created_at DESC;
```

### Check document ownership
```sql
SELECT id, user_id, title
FROM sources
WHERE id = 'source-id';
```

### Reset failed processing
```sql
UPDATE sources
SET processing_status = 'pending',
    error_message = NULL,
    updated_at = NOW()
WHERE id = 'source-id';
```

### Storage usage by user
```sql
SELECT 
  user_id,
  COUNT(*) as doc_count,
  SUM(word_count) as total_words
FROM sources
WHERE file_path IS NOT NULL
GROUP BY user_id
ORDER BY doc_count DESC;
```

---

## Test Commands

### Upload test
```bash
# In browser console
const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
// Use upload UI or call uploadFile(file)
```

### Check signed URL
```bash
# Get signed URL
curl -H "Authorization: Bearer {jwt}" \
     -H "apikey: {anon-key}" \
     "https://your-project.supabase.co/functions/v1/get-document-url?sourceId={id}"

# Should return
{"url": "https://...?X-Amz-Signature=..."}
```

### Test direct R2 access (should fail)
```bash
# Extract base URL from signed URL (remove query params)
curl "https://account.r2.cloudflarestorage.com/bucket/user-id/file.pdf"

# Should return 403 Forbidden
```

---

## Common Issues & Fixes

### "R2 not configured"
```bash
# Check secrets
supabase secrets list

# Set missing ones
supabase secrets set R2_ACCOUNT_ID=xxx
```

### "Document not found"
```sql
-- Verify ownership
SELECT id, user_id FROM sources WHERE id = 'source-id';
-- Compare user_id with authenticated user
```

### Document won't display
```typescript
// Click retry button in DocumentViewer
// Or manually refetch
const { refetch } = useDocumentUrl(sourceId);
refetch();
```

### Upload stuck
```typescript
// Check browser DevTools > Network tab
// Look for failed requests to:
// - /functions/v1/generate-upload-url
// - R2 PUT request

// Common causes:
// - Expired session (refresh page)
// - R2 CORS (check bucket settings)
// - File too large (check R2 limits)
```

---

## Security Checklist

- [x] R2 bucket is private (not public)
- [x] No R2 credentials in client code
- [x] All requests authenticated (JWT)
- [x] Ownership verified via RLS
- [x] Signed URLs expire (1hr)
- [x] Direct R2 URLs return 403

---

## Cost Calculator

```python
# Python script to estimate R2 costs

users = 1000
docs_per_user = 10
avg_file_size_mb = 5
views_per_doc_per_month = 10

# Storage
storage_gb = users * docs_per_user * avg_file_size_mb / 1024
storage_cost = storage_gb * 0.015

# Reads (Class B)
total_reads = users * docs_per_user * views_per_doc_per_month
read_cost = (total_reads / 1_000_000) * 0.36

# Writes (Class A)  
total_writes = users * docs_per_user
write_cost = (total_writes / 1_000_000) * 4.50

total = storage_cost + read_cost + write_cost
print(f"Monthly cost: ${total:.2f}")
# Expected: <$5 for 1000 users
```

---

## Monitoring Queries

### Recent uploads
```sql
SELECT 
  title, 
  processing_status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at)) as seconds_ago
FROM sources
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Error rate
```sql
SELECT 
  processing_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM sources
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY processing_status;
```

### Slow processing
```sql
SELECT 
  id, 
  title,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_seconds
FROM sources
WHERE processing_status = 'ready'
  AND updated_at > created_at
ORDER BY processing_seconds DESC
LIMIT 10;
```

---

## Useful Links

- [R2 Dashboard](https://dash.cloudflare.com/r2)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Edge Functions Logs](https://supabase.com/dashboard/project/_/functions)
- [R2 Docs](https://developers.cloudflare.com/r2/)

---

## Emergency Rollback

```bash
# 1. Revert DocumentViewer.tsx
git checkout main -- src/components/viewer/DocumentViewer.tsx

# 2. Rebuild and deploy
npm run build

# 3. Users can still access via file_url (no data loss)
```

---

## Contact & Support

- Issues: Check `IMPLEMENTATION_SUMMARY.md`
- Testing: See `TESTING_R2.md`
- Setup: See `R2_SETUP.md`
- Admin: See `supabase/migrations/admin_r2_utilities.sql`
