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
