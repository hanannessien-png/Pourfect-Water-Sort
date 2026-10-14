---
name: Expo toolchain quirks (Pourfect)
description: Non-obvious build/lint/test environment fixes for the Expo SDK 57 game in this monorepo.
---

- **Worklets babel plugin needs @babel/generator.** Metro fails with "Cannot find module '@babel/generator'" unless `pnpm-workspace.yaml` has a `packageExtensions` entry adding it to react-native-worklets.
  **Why:** pnpm strict isolation; the plugin doesn't declare the dep.
  **How to apply:** keep the entry when touching workspace config or upgrading worklets.

- **eslint-plugin-react-hooks 7 imports `zod-validation-error/v4`** but its range allows v3, and pnpm dedupes to the workspace's v3 → ESLint crashes with ERR_PACKAGE_PATH_NOT_EXPORTED. Fixed with a scoped override `eslint-plugin-react-hooks>zod-validation-error: ^4.0.0`.

- **TypeScript 6 stops auto-including @types**; tsconfig must list `"types": ["jest", "node"]`.

- **jest-expo doesn't work here**; tests use plain Jest + Babel on pure modules. jest/@types/jest are in `expo.install.exclude` so `expo install --check` / expo-doctor stay clean.

- **Skia web preview:** needs CanvasKit wasm loaded before expo-router starts (`index.js` → `src/boot(.web).ts`). The screenshot browser has no WebGL; boot.web swaps `MakeWebGLCanvasSurface` → `MakeSWCanvasSurface` and unsets `OffscreenCanvas` so canvases render. `JsiSkFont.measureText` throws on web — use `getTextWidth`.

- **Metro serves from the workspace root:** fetch native bundles at `/artifacts/pourfect/index.bundle?platform=android` to check the Android build.

- **Never build Skia textures/offscreen surfaces per render.** `useTexture` with an inline size object made a new GPU surface on every render; it leaked WebGL contexts and white-screened the game after a few moves. Build sprite sheets once (CPU raster surface, module-level cache).
  **How to apply:** for lists of previews (shop cards) draw with plain Views, not one Skia Canvas per item — web caps live WebGL contexts at ~16.

- **Platform files need the same extension as the default file.** Metro tries `.android/.native/plain` per extension in order (ts before tsx), so `admob.ts` beat `admob.native.tsx` and the native AdMob code silently never bundled. Keep pairs as `x.tsx` + `x.native.tsx`.
  **How to apply:** after adding a `.native`/`.web` file, grep the Android bundle for its path.

- **AdMob native module (react-native-google-mobile-ads) uses `TurboModuleRegistry.getEnforcing` at import** → importing it in Expo Go crashes. It is only `require`d lazily inside the native provider, never when `Constants.executionEnvironment === StoreClient` (Expo Go → mock ads). The plugin's "No iosAppId" warnings at `expo start` are harmless (Android only).
