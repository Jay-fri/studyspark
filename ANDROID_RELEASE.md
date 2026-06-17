# Releasing the StudyLM Android APK

## One-time setup (do this before your first release)

### 1. Install Android Studio + JDK

Download from https://developer.android.com/studio — it bundles JDK 17.

### 2. Create the Supabase `releases` storage bucket

Run this in the Supabase dashboard SQL editor
(https://supabase.com/dashboard/project/yguqquyvuflcmlhwdzal/sql):

Or push the migration:
```bash
supabase db push
```

The migration is already written at `supabase/migrations/20240030_releases_bucket.sql`.
It creates a public bucket that anyone can download from but only admins can upload to.

### 3. Create your signing keystore (first release only)

In Android Studio: **Build → Generate Signed Bundle / APK → Create new...**

- Choose a file path (e.g. `~/studylm-release.keystore`)
- Set a strong password
- **Back up this file and password in your password manager — forever.**
  Every future update must be signed with the same keystore or users must uninstall first.

---

## Every release

### Step 1 — Sync the web build

```bash
npm run android:sync
```

### Step 2 — Open Android Studio

```bash
npm run android:open
```

### Step 3 — Build the signed APK

**Build → Generate Signed Bundle / APK → APK → release**

Select your keystore, enter password, pick **release** build variant → Finish.

Output: `android/app/release/app-release.apk`

### Step 4 — Upload to Supabase Storage

In the Supabase dashboard → Storage → releases bucket, upload the file named:

```
studylm-v1.0.0.apk   ← increment version each release
```

Public URL (already wired into the download page):
```
https://yguqquyvuflcmlhwdzal.supabase.co/storage/v1/object/public/releases/studylm-v1.0.0.apk
```

### Step 5 — Update the download page

Edit the three constants at the top of `src/pages/GetAppPage.tsx`:

```typescript
const APK_URL     = 'https://yguqquyvuflcmlhwdzal.supabase.co/storage/v1/object/public/releases/studylm-v1.0.1.apk';
const APK_VERSION = '1.0.1';
const APK_SIZE    = '~25 MB';  // check actual file size after build
```

### Step 6 — Deploy

```bash
npm run build
```

Then deploy your hosting (Cloudflare Pages / Vercel / etc.) — the download page at `/download` now serves the new version.

---

## Live reload during development

Test on a connected Android device without building a full APK:

```bash
npx cap run android -l --external
```

Changes hot-reload inside the native shell — much faster than a full build cycle.

---

## Version bumping

Before each release update `android/app/build.gradle`:

```groovy
versionCode X        // increment by 1 each release (integer)
versionName "X.Y.Z"  // semver string shown in Settings → About
```
