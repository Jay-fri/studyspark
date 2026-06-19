# Cloudflare R2 Private Storage Setup

This guide covers setting up secure, private document storage using Cloudflare R2 with signed URLs.

---

## Why R2 Private Storage?

- **Security**: Documents are never publicly accessible
- **Cost**: No egress fees (unlike S3)
- **Performance**: Global CDN distribution
- **Control**: Temporary signed URLs with configurable expiration

---

## Setup Steps

### 1. Create R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Name: `studylm-documents` (or your preferred name)
5. Location: **Automatic** (recommended)
6. **Important**: Do NOT enable public access
7. Click **Create bucket**

### 2. Generate API Tokens

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Token name: `studylm-backend`
4. Permissions: **Object Read & Write**
5. Specify bucket (optional): Select `studylm-documents`
6. TTL: Leave blank (no expiration)
7. Click **Create API token**

You'll receive:
```
Access Key ID: abc123...
Secret Access Key: xyz789...
```

**Save these immediately** - the secret key won't be shown again.

### 3. Get Account ID

From the R2 dashboard sidebar, copy your **Account ID**.

### 4. Configure Supabase Edge Functions

Set the R2 credentials as Supabase secrets:

```bash
supabase secrets set R2_ACCOUNT_ID=your-account-id
supabase secrets set R2_BUCKET_NAME=studylm-documents
supabase secrets set R2_ACCESS_KEY_ID=your-access-key-id
supabase secrets set R2_SECRET_ACCESS_KEY=your-secret-access-key
```

### 5. Verify Configuration

Test upload:
```bash
# Deploy the functions first
supabase functions deploy generate-upload-url
supabase functions deploy get-document-url
supabase functions deploy process-source

# Upload a test file through your app
# Check R2 dashboard to verify the file appears
```

---

## Security Model

### Upload Flow
```
User selects file
    ↓
Client requests presigned PUT URL from generate-upload-url
    ↓
Edge Function validates JWT + generates signed URL
    ↓
Client uploads file directly to R2 (no server proxy)
    ↓
Client saves metadata to database (file_path, user_id)
```

### View Flow
```
User opens document
    ↓
Client requests signed GET URL from get-document-url
    ↓
Edge Function validates JWT + checks ownership via RLS
    ↓
If authorized, generate signed URL (1hr expiry)
    ↓
Client displays document using signed URL
```

### Key Security Features

1. **No public bucket**: R2 bucket is private - direct URLs return 403
2. **Ownership verification**: RLS policies ensure users can only access their documents
3. **Temporary URLs**: Signed URLs expire after 1 hour
4. **Server-side signing**: R2 credentials never touch the client
5. **JWT validation**: All requests require valid Supabase auth token

---

## File Structure in R2

Documents are stored with this key pattern:
```
{user_id}/{uuid}.{extension}

Examples:
abc-123-def/8f7e6d5c-4b3a-2f1e.pdf
abc-123-def/1a2b3c4d-5e6f-7890.docx
```

This ensures:
- Unique filenames (no collisions)
- User isolation (easy to query/delete by user)
- Extension preservation (for MIME type detection)

---

## Troubleshooting

### "R2 not configured" error
- Verify all 4 secrets are set in Supabase
- Check secret names match exactly (case-sensitive)
- Redeploy Edge Functions after setting secrets

### "Failed to get document URL" error
- Check user owns the document (query sources table)
- Verify `file_path` column is populated
- Check R2 bucket name matches

### "Document not found" error
- File may have been deleted from R2
- Verify file exists in R2 dashboard
- Check `file_path` in database matches R2 key

### Document won't display
- Signed URL may have expired (>1hr old)
- Browser may block iframe (check console)
- For Office docs, ensure publicly accessible for Office Online viewer

---

## Cost Estimation

Cloudflare R2 pricing (as of 2024):

| Operation | Cost |
|---|---|
| Storage | $0.015/GB/month |
| Class A (writes) | $4.50/million |
| Class B (reads) | $0.36/million |
| **Egress** | **FREE** |

Example: 1,000 students, 10 documents each (5MB avg)
- Storage: 50GB = $0.75/month
- Uploads: 10,000 = $0.045
- Views: 100,000 = $0.036
- **Total: ~$1/month** (vs S3 ~$40/month with egress)

---

## Migration from Public URLs

If you currently use public R2 URLs:

1. **Do NOT delete existing files**
2. Deploy new Edge Functions
3. Set R2 secrets
4. New uploads will use signed URLs automatically
5. Old documents will continue working via `file_url`
6. Gradually migrate by:
   - Updating `DocumentViewer` to try signed URL first
   - Fallback to `file_url` if `file_path` is null
   - Backfill `file_path` from `file_url` parsing

---

## Production Checklist

- [ ] R2 bucket created (private)
- [ ] API tokens generated
- [ ] Supabase secrets configured
- [ ] Edge Functions deployed
- [ ] Test upload succeeds
- [ ] Test document viewing works
- [ ] Verify expired URL returns error
- [ ] Verify cross-user access blocked
- [ ] Monitor R2 usage in Cloudflare dashboard
- [ ] Set up billing alerts

---

## Additional Resources

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
