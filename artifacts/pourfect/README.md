# Pourfect: Water Sort Puzzle

Android-only, fully offline water-sort puzzle. Expo SDK 57 · React Native 0.86 · strict TypeScript · Skia · Reanimated · Zustand · AsyncStorage. English UI.

Developer: Apex Interactive · hanannessien@gmail.com

## Run
- The Replit workflow `artifacts/pourfect: expo` starts Metro. Scan the QR code from Replit's **Preview on your phone** with Expo Go (Android).
- The browser preview in Replit is a development aid only (see "Web preview" below).

## Test and check
All commands run from `artifacts/pourfect`:

| Command | What it does |
| --- | --- |
| `pnpm run typecheck` | `tsc --noEmit` (strict) |
| `pnpm run lint` | ESLint (eslint-config-expo) |
| `pnpm test` | Jest unit tests (engine, generator, solver, render maths, state) |
| `pnpm run levels:generate` | Regenerates `src/data/levels.fixed.json` (deterministic, ~4 min) |
| `pnpm run levels:validate` | Re-verifies all 300 fixed levels with the solver |
| `pnpm dlx expo-doctor` | Expo project health |

## Where to change things
- **Package name / app name / version:** `app.json` (`expo.android.package`, `expo.name`, `expo.version`, `expo.android.versionCode`) and `src/config/brand.ts`. The package name cannot change after the first Play upload.
- **Ad IDs:** none are in the project yet, by owner decision. Phase 7 adds `src/config/ads.ts` with empty fields marked `// PASTE YOUR ID HERE`.
- **Difficulty curve:** `src/config/difficulty.ts`, then `pnpm run levels:generate` and `pnpm run levels:validate`.
- **Starting tokens / rewards:** `src/config/economy.ts`.
- **Text:** `src/i18n/en.ts`.

## Layout
```
app/            screens (Expo Router): index, game, levels, settings
src/game/       pure engine: codec, rules, session, solver, hint, stars, generator
src/render/     Skia board, tubes, pour animation, particles, layout maths
src/state/      save data, persistence (with backup), progress, resume, game hook
src/ui/         theme, buttons, sheets, chips
src/data/       fixed levels JSON + loader
scripts/        level generator and validator
```

## Decisions log
Decisions taken without asking, as the spec requires. Where `BUILD_BRIEF.md` differs from the PDF, the brief wins.

1. **Static `app.json`, not `app.config.ts`.** Replit's Expo tooling requires a static config, so the spec's `app.config.ts` is replaced by `app.json`. Consequence: the brief's "fail the build early while the AdMob app id is empty" guard cannot live in a dynamic config; Phase 7 will put it in a build-time check script instead.
2. **No EAS commands from Replit.** Building the release AAB is done by the owner outside this workspace (exact steps will be in `docs/PUBLISHING_CHECKLIST.md` in Phase 8). `eas.json` will still be provided.
3. **Level generator: scramble + verify instead of reverse pours.** Boards are built by shuffling layers from the solved state, then kept only if the solver proves them solvable within the difficulty band. Reverse pours from the solved state tend to give shallow boards; shuffling plus solver verification gives direct control over difficulty. Every fixed level is solver-verified.
4. **Distinct colours on small boards.** Boards with ≤ 8 colours never contain look-alike pairs (blue/violet, blue/cyan, green/lime, green/teal, red/raspberry, …). Larger boards necessarily use the whole palette; colour-blind symbols cover them.
5. **Stuck detection.** No legal pour → "No moves left". Legal pours exist but the solver proves none can win → "Dead end" (with "Keep looking" to dismiss).
6. **Hints** spend a token only when a move is actually found.
7. **Resume:** one slot. A campaign resume is discarded if the saved board no longer matches the fixed level; endless levels resume from the save without regenerating.
8. **Jest without jest-expo.** jest-expo did not work with this SDK setup; tests cover the pure modules with a Babel transform. `jest` 30 is excluded from Expo's version check (`expo.install.exclude`) because the app does not use jest-expo.
9. **Deferred to Phase 4+:** tutorial hand, booster tooltips, skip-level via rewarded ad, banner space, audio toggles.

## Web preview (development only)
- Skia on the web needs CanvasKit WebAssembly. `src/boot.web.ts` loads it from the jsDelivr CDN, pinned to the exact `canvaskit-wasm` version Skia uses, then starts the router. If the browser has no WebGL, it switches CanvasKit to CPU rendering.
- This file is web-only (`.web.ts`). The Android app uses native Skia and makes **no** network calls (ads come in Phase 7).
- Android-only APIs (back button, haptics) are no-ops on web.
