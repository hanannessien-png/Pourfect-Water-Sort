# Pourfect Android builds on Codemagic

## Project and commands

The config is **`/codemagic.yaml` at the Git repository root**, not inside the
mobile directory. The app is `artifacts/pourfect`, an Expo SDK 57 / React Native
0.86.3 Android project in a pnpm workspace. The root `pnpm-lock.yaml` is authoritative.
Dependencies are installed from the root with pnpm 10.26.1 and
`pnpm install --frozen-lockfile --prod=false`: Expo and React Native are currently
devDependencies, so production-only installation would break the build.

CI uses Linux x64 because existing workspace overrides exclude macOS native
packages. Node 22.16.0 meets React Native's >=22.13 requirement on Node 22.
Java 17 is used with the generated Gradle wrapper. Codemagic supplies Android SDK
tools. Expo generates the Android project, including native AdMob integration,
on the build machine. No Expo login, EAS build, Replit session, backend database,
or Google Play API token is required.

The root `build` and the app's `scripts/build.js` are NOT Android packaging
commands. CI uses `expo prebuild --platform android --no-install`, followed by
the generated Gradle wrapper's `:app:bundleRelease :app:assembleRelease`.
The package remains **com.apexinteractive.pourfect**.

## Two workflows

- **android-unsigned**: no signing secrets needed. Produces an unsigned release
  AAB and APK, labeled `unsigned-NOT-FOR-PLAY`. This checks compilation only.
  Neither file is ready for Google Play; the unsigned APK cannot be installed.
- **android-signed**: requires the `pourfect_upload` signing identity. Produces
  an upload-key-signed AAB and installable release APK. Missing signing inputs
  fail explicitly; this workflow never falls back to debug or unsigned signing.

Expo's generated release signing normally points to its debug keystore.
`scripts/ci/android-signing.gradle` overrides that after prebuild without
replacing the generated build file. No private key/password is stored in Git.
Signing secrets are read from the environment, not printed or written into Gradle.

## Configure real signing

1. In Codemagic **Team settings → codemagic.yaml settings → Code signing
   identities → Android keystores**, upload your existing upload keystore.
2. Enter its **Keystore password**, **Key alias**, and **Key password** in the
   secure UI. Set **Reference name** to exactly **pourfect_upload**.
3. Codemagic injects `CM_KEYSTORE_PATH`, `CM_KEYSTORE_PASSWORD`, `CM_KEY_ALIAS`,
   and `CM_KEY_PASSWORD` for `android-signed`. Do not put their values in YAML,
   chat, or source code. No separate environment-variable group is required.
4. Keep an encrypted backup: Codemagic does not let you download the uploaded key.

If the app has already been uploaded to Play, use its existing upload key
(or Google's formal upload-key reset process), not a newly invented key.
For a brand-new app only, you can generate a key locally, outside the repository:

```sh
keytool -genkeypair -v -keystore pourfect-upload.jks -storetype JKS \
  -keyalg RSA -keysize 2048 -validity 10000 -alias pourfect-upload
```

This prompts privately for passwords. Never commit the resulting keystore.
Signing alone does not mean store approval. Before each new Play upload, increase
`expo.android.versionCode` in `artifacts/pourfect/app.json` above the highest code
already uploaded (currently configured as 1). Release builds use live AdMob IDs:
do not click your own live ads during testing.

## Push and detect the config

Commit **all** CI support files together:

```sh
git add codemagic.yaml
git add scripts/ci/android-signing.gradle docs/CODEMAGIC.md .gitignore
git commit -m "Add Codemagic build workflow"
git push
```

In Codemagic:

1. Open `hanannessien-png/Pourfect-Water-Sort`.
2. Select the branch containing these files (normally **main**).
3. Click **Check for configuration file** (refresh the page first if needed).
4. Click **Start new build**, select the same branch and **android-unsigned**
   for the first build without signing credentials.
5. After setting up `pourfect_upload`, start **android-signed**.
6. Download the AAB/APK from the build's **Artifacts** section.

Artifacts originally come from:
`artifacts/pourfect/android/app/build/outputs/bundle/release/app-release.aab`
and `artifacts/pourfect/android/app/build/outputs/apk/release/*.apk`.
CI copies them to `build/codemagic/` with explicit signing labels.
Nothing is automatically uploaded to Google Play.

## Validation performed in the workspace

- Both workflows parsed, YAML merges resolved, and validated against
  `https://codemagic.io/codemagic-schema.json`.
- All embedded shell scripts passed `bash -n`.
- Frozen pnpm installation, game TypeScript, lint and all 80 tests passed.
- Android-only Expo prebuild succeeded in an isolated temporary copy; the
  generated wrapper is Gradle 9.3.1 and the application ID is unchanged.
- Android production JavaScript/Hermes export succeeded (including assets).
- Local checks used the workspace's Node 24.22.1. The configured Node 22.16.0
  satisfies the installed React Native engine range, but was not run here.
- Java and Android SDK are absent locally: Gradle native compilation, signing,
  final AAB/APK contents and a real Codemagic cloud run remain unverified.
  No claim is made that a production-ready binary has already been built.

References:
- https://docs.codemagic.io/yaml-quick-start/building-a-react-native-app/
- https://docs.codemagic.io/yaml-code-signing/signing-android/
