# Testing Signed URL Document Storage

This guide provides step-by-step testing procedures for the secure document storage system.

---

## Prerequisites

- R2 bucket configured (see R2_SETUP.md)
- Edge Functions deployed
- Supabase secrets set
- Local dev server running (`npm run dev`)

---

## Test Suite

### 1. Upload Flow

**Test: Successful PDF Upload**
1. Log in to the app
2. Navigate to a notebook
3. Click "Upload" or drag-and-drop a PDF file
4. Expected behavior:
   - Progress indicator shows: extracting → uploading → saving → processing → done
   - Success toast appears
   - Document appears in sources list
5. Verify in database:
   ```sql
   SELECT id, user_id, title, file_path, processing_status 
   FROM sources 
   WHERE user_id = 'your-user-id' 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
   - `file_path` should be populated: `{user_id}/{uuid}.pdf`
   - `processing_status` should be `ready`
6. Verify in R2 dashboard:
   - File exists at the `file_path` location
   - File size matches original

**Test: DOCX Upload**
- Repeat above with .docx file
- Verify Office Online viewer works

**Test: Large File (>10MB)**
- Upload a large PDF
- Verify upload completes successfully
- Check R2 storage usage increases

---

### 2. Document Viewing

**Test: Owner Can View Document**
1. Log in as the user who uploaded the document
2. Navigate to the document
3. Click "Open Document"
4. Expected behavior:
   - Loading spinner appears briefly
   - Document loads in iframe
   - Document is readable and navigable
5. Check browser DevTools Network tab:
   - Request to `/functions/v1/get-document-url?sourceId=...`
   - Response contains signed URL with `X-Amz-Signature` parameter
   - iframe src uses the signed URL

**Test: PDF Navigation**
- Open a multi-page PDF
- Verify page navigation works
- Verify zoom controls work (if available)

**Test: DOCX Display**
- Open a DOCX file
- Verify formatting is preserved
- Verify images display correctly
- Verify tables render properly

---

### 3. Security Tests

**Test: Ownership Verification**
1. User A uploads document → note the sourceId
2. Log out
3. Log in as User B
4. Try to access User A's document:
   ```
   /notebooks/{notebook-id}/sources/{source-id}
   ```
5. Expected behavior:
   - Document not found error OR
   - Access denied message
6. Check browser DevTools:
   - Request to `get-document-url` returns 404 or 403

**Test: Direct R2 URL Access**
1. Get a signed URL from a successful document load
2. Extract the base URL (without signature params)
3. Try to access: `https://{account}.r2.cloudflarestorage.com/{bucket}/{key}`
4. Expected behavior:
   - 403 Forbidden error
   - Cannot access without signature

**Test: Expired Signature**
1. Get a signed URL
2. Wait 61+ minutes (or modify `expiresIn` to 10 seconds for faster testing)
3. Try to load the document using expired URL
4. Expected behavior:
   - Document fails to load
   - Clicking retry generates new signed URL
   - Document loads successfully

**Test: Invalid sourceId**
1. Try to load document with random UUID:
   ```
   /functions/v1/get-document-url?sourceId=00000000-0000-0000-0000-000000000000
   ```
2. Expected behavior:
   - 404 Document not found error

**Test: Unauthenticated Access**
1. Log out
2. Try to access document URL directly
3. Expected behavior:
   - Redirect to login page OR
   - 401 Unauthorized error

---

### 4. Error Handling

**Test: Network Failure During Upload**
1. Start uploading a file
2. Disable network (or use browser DevTools to throttle to offline)
3. Expected behavior:
   - Upload fails gracefully
   - Error message shown
   - Can retry after network restored

**Test: Missing file_path**
1. Manually set `file_path` to NULL in database:
   ```sql
   UPDATE sources SET file_path = NULL WHERE id = 'some-source-id';
   ```
2. Try to open the document
3. Expected behavior:
   - "No file associated with this document" error

**Test: R2 Credentials Missing**
1. Temporarily remove R2 secrets:
   ```bash
   supabase secrets unset R2_ACCOUNT_ID
   ```
2. Try to upload a file
3. Expected behavior:
   - "Upload service unavailable" error
4. Restore secrets:
   ```bash
   supabase secrets set R2_ACCOUNT_ID=your-account-id
   ```

---

### 5. Performance Tests

**Test: Concurrent Uploads**
1. Select 5 files
2. Upload all simultaneously
3. Expected behavior:
   - All progress indicators update independently
   - All uploads complete successfully
   - No race conditions or conflicts

**Test: Signed URL Caching**
1. Open a document
2. Note the network request time
3. Navigate away and back to same document
4. Expected behavior:
   - Document loads faster (from cache)
   - No new request to `get-document-url` for 50+ minutes
   - Check React Query DevTools to verify cache hit

**Test: Large File Viewing**
1. Upload and view a 50MB+ PDF
2. Expected behavior:
   - Signed URL generation is fast (<500ms)
   - Document streams properly in iframe
   - No timeout errors

---

### 6. Edge Cases

**Test: Special Characters in Filename**
- Upload file with name: `Test Document (2024) [Final] #1.pdf`
- Verify upload succeeds
- Verify viewing works

**Test: Duplicate Filenames**
1. Upload `notes.pdf`
2. Upload another `notes.pdf` to same notebook
3. Expected behavior:
   - Both files stored with unique keys (UUIDs)
   - Both accessible independently

**Test: Delete Document**
1. Upload document
2. Delete from app
3. Expected behavior:
   - Database row removed
   - File still exists in R2 (manual cleanup needed)
4. Try to access deleted document
5. Expected: 404 error

---

### 7. AI Processing Integration

**Test: AI Can Access Documents**
1. Upload a document
2. Generate summary or flashcards
3. Expected behavior:
   - AI processing succeeds
   - Generated content reflects document content
4. Check `source_chunks` table:
   ```sql
   SELECT COUNT(*) FROM source_chunks WHERE source_id = 'your-source-id';
   ```
   - Should have multiple chunks

**Test: Text Extraction**
1. Upload PDF with tables and images
2. View "Text" mode
3. Expected behavior:
   - Extracted text is readable
   - Structure preserved (headings, lists)
   - No garbled text

---

## Automated Testing

### Unit Test: Presigned URL Generation
```typescript
import { presignR2Get } from '../functions/get-document-url';

test('generates valid presigned URL', async () => {
  const url = await presignR2Get(
    'account-id',
    'bucket',
    'access-key',
    'secret-key',
    'user-id/doc.pdf',
    60
  );
  
  expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
  expect(url).toContain('X-Amz-Signature=');
  expect(url).toContain('X-Amz-Expires=60');
});
```

### Integration Test: Ownership Check
```typescript
test('blocks cross-user document access', async () => {
  // User A uploads document
  const sourceId = await uploadAsUser('user-a', 'test.pdf');
  
  // User B tries to access
  const response = await fetchSignedUrl(sourceId, 'user-b-token');
  
  expect(response.status).toBe(404);
});
```

---

## Monitoring in Production

### Key Metrics to Track

1. **Upload Success Rate**
   - Target: >99%
   - Alert if <95%

2. **Signed URL Generation Time**
   - Target: <200ms p95
   - Alert if >500ms

3. **R2 API Errors**
   - Monitor 403/404/500 responses
   - Alert on sustained errors

4. **Storage Usage**
   - Track total GB in R2
   - Project growth rate
   - Set billing alerts

### Logging to Add

```typescript
// In get-document-url function
console.log({
  event: 'signed_url_generated',
  userId: user.id,
  sourceId,
  duration: Date.now() - startTime,
});

// In generate-upload-url function
console.log({
  event: 'upload_url_generated',
  userId: user.id,
  filename: file.name,
  size: file.size,
});
```

---

## Troubleshooting Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "R2 not configured" | Missing secrets | Run `supabase secrets list` and set missing values |
| Upload stuck at "uploading" | CORS issue | Verify R2 allows PUT from origin |
| Document won't display | Expired URL | Click retry to generate new URL |
| 403 from R2 | Incorrect credentials | Verify access key and secret in secrets |
| RLS violation | User trying to access other's doc | Expected behavior - verify user_id matches |

---

## Test Checklist

Before deploying to production:

- [ ] Upload works for PDF, DOCX, TXT
- [ ] Owner can view their documents
- [ ] Non-owners get 404/403
- [ ] Direct R2 URLs return 403
- [ ] Expired URLs trigger retry
- [ ] Signed URL caches for 50 minutes
- [ ] Text extraction works
- [ ] AI processing accesses chunks correctly
- [ ] Error messages are user-friendly
- [ ] Loading states display properly
- [ ] R2 usage appears in dashboard
- [ ] All secrets configured in production
- [ ] Edge Functions deployed
