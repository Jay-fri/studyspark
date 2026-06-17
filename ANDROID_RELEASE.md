# Building a signed release APK

## Prerequisites

- Android Studio installed (https://developer.android.com/studio)
- JDK 17+ on PATH
- A keystore file (create once, keep forever — see step 3)

## Steps

1. **Sync the web build into the native shell**
   ```bash
   npm run android:sync
   ```

2. **Open Android Studio**
   ```bash
   npm run android:open
   ```

3. **Generate a signed APK**

   In Android Studio: **Build > Generate Signed Bundle / APK**

   Choose **APK** (not AAB — we need direct APK for sideload distribution).

   **First release only:** Create a new keystore:
   - Build > Generate Signed Bundle/APK > Create new...
   - Choose a path, set a strong password
   - **Save this keystore file and password somewhere safe (password manager)**
   - Every future update must be signed with the SAME keystore or users cannot update without uninstalling first

   Select the **release** build variant and click Finish.

4. **Locate the output APK**

   ```
   android/app/release/app-release.apk
   ```

5. **Rename and upload**

   Rename to `studyai-v[version].apk` (e.g. `studyai-v1.0.0.apk`)

   Upload to the Supabase Storage `releases` bucket.

6. **Update the download link**

   Update the APK download URL and version label in `GetAppPage.tsx` once it exists.

## Live reload during development

For fast iteration on a connected Android device or emulator (no full APK rebuild needed):

```bash
npx cap run android -l --external
```

This runs the app pointing at the Vite dev server so changes hot-reload inside the native shell.

## Version bumping

Before each release, update `version` in `package.json` and the `android/app/build.gradle` fields:

```groovy
versionCode X       // increment by 1 each release
versionName "X.Y.Z" // semver string shown to users
```
