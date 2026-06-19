# CORS Error Troubleshooting

You're seeing this error:
```
Access to fetch at 'https://...supabase.co/functions/v1/get-document-url' 
has been blocked by CORS policy: Response to preflight request doesn't pass 
access control check: It does not have HTTP ok status.
```

## Root Cause

The Edge Function `get-document-url` was not deployed yet, so the OPTIONS preflight request fails.

## Solution

### ✅ Step 1: Verify Function is Deployed

```bash
supabase functions list
```

You should see `get-document-url` in the list.

### ✅ Step 2: Check Secrets are Set

```bash
supabase secrets list
```

Verify these exist:
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

### ✅ Step 3: Test the Function

```bash
# Get your JWT token from browser DevTools > Application > Local Storage > supabase.auth.token
# Or log it in console: (await supabase.auth.getSession()).data.session.access_token

curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "apikey: YOUR_SUPABASE_ANON_KEY" \
     "https://yguqquyvuflcmlhwdzal.supabase.co/functions/v1/get-document-url?sourceId=4b6d49ad-1df2-4007-8468-edb159c3e2db"
```

Expected response:
```json
{
  "url": "https://...r2.cloudflarestorage.com/...?X-Amz-Signature=..."
}
```

### ✅ Step 4: Check Function Logs

Visit: https://supabase.com/dashboard/project/yguqquyvuflcmlhwdzal/functions/get-document-url

Look for errors in the logs when you try to view a document.

---

## Common Issues

### Issue: "Document not found" (404)

**Cause:** The document doesn't have a `file_path` set, or user doesn't own it.

**Fix:**
```sql
-- Check if document exists and has file_path
SELECT id, user_id, file_path 
FROM sources 
WHERE id = '4b6d49ad-1df2-4007-8468-edb159c3e2db';
```

If `file_path` is `NULL`, the document is text-only or legacy. It won't work with signed URLs.

### Issue: "R2 not configured" (500)

**Cause:** Missing R2 secrets.

**Fix:**
```bash
supabase secrets set R2_ACCOUNT_ID=your-account-id
supabase secrets set R2_BUCKET_NAME=studylm-documents
supabase secrets set R2_ACCESS_KEY_ID=your-access-key-id
supabase secrets set R2_SECRET_ACCESS_KEY=your-secret-access-key
```

### Issue: Function works in curl but not in browser

**Cause:** Browser is caching the failed CORS response.

**Fix:**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Or use Incognito mode

### Issue: "Failed to generate document URL" (500)

**Cause:** R2 credentials are invalid or bucket doesn't exist.

**Fix:**
1. Verify R2 bucket exists in Cloudflare dashboard
2. Verify API tokens have read/write permissions
3. Check function logs for specific error

---

## Test in Browser Console

Paste this in browser DevTools console:

```javascript
// Get current session
const { data: { session } } = await supabase.auth.getSession();

// Test the function
const res = await fetch(
  'https://yguqquyvuflcmlhwdzal.supabase.co/functions/v1/get-document-url?sourceId=4b6d49ad-1df2-4007-8468-edb159c3e2db',
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': 'YOUR_ANON_KEY'
    }
  }
);

console.log('Status:', res.status);
console.log('Response:', await res.json());
```

---

## Next Steps

After deploying the function:

1. **Refresh browser** (hard refresh)
2. **Clear browser cache** if needed
3. **Test document viewing** - should work now
4. **Check that signed URL has signature** - look for `X-Amz-Signature` in URL
5. **Verify ownership check** - try accessing another user's document (should fail)

---

## Quick Fix Commands

```bash
# Redeploy function
supabase functions deploy get-document-url

# Check deployment
supabase functions list

# View logs
supabase functions logs get-document-url --limit 50
```

---

## Still Not Working?

1. Check that document has `file_path`:
   ```sql
   SELECT * FROM sources WHERE id = 'YOUR_SOURCE_ID';
   ```

2. Check function logs in Supabase dashboard

3. Verify R2 bucket is private (direct URLs should return 403)

4. Test with a fresh upload (not a legacy document)
