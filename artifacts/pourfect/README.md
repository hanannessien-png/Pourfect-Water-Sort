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
- **Ad IDs:** `src/config/ads.ts` (unit IDs + every pacing rule) and the `react-native-google-mobile-ads` entry in `app.json` (`androidAppId`). Keep the app ID the same in both places.
- **Timer:** `src/config/timer.ts` (time per par move, min/max, +60 s video).
- **Difficulty ramp:** `src/config/difficulty.ts`, then `pnpm run levels:generate` and `pnpm run levels:validate`.
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
10. Shop currency is coins only (wins, rewarded videos, daily gift); no real-money purchases. Prices live in `src/config/cosmetics.ts`; item ids are stored in saves and must never be renamed.
11. Rewarded videos are capped at 20 per day across all placements; a mock ad screen stands in until real ad IDs are added.
12. Shop previews are drawn with plain views (not Skia) so a screen full of cards doesn't create dozens of GPU contexts.
13. **Ads (AdMob, owner's IDs).** Debug builds request Google's test ads; release builds (EAS) use the live units, so the owner never taps their own live ads. Expo Go and the web preview have no AdMob native module, so they show labelled "TEST AD" screens and a "TEST BANNER" strip instead. Consent (UMP) runs before the SDK starts; content rating PG. Pacing: interstitial on Next from level 5, every 2nd level, ≥ 90 s apart, skipped for 3 min after a rewarded video; app-open after ≥ 60 s in the background, not in the first session or before level 4, ≥ 4 min after any other full-screen ad, never over a sheet or a pour. Banners have a reserved height; hidden on game levels 1–2. Rules are unit-tested in `src/ads/__tests__/policy.test.ts`.
14. **Countdown timer (owner request; overrides the spec's "no timers").** Limit = 25 s + 4.5 s per par move, rounded to 5 s, between 45 s and 7 min; Hard levels ×1.25. The clock pauses whenever a sheet is open, the screen is covered or the app is in the background, and is saved with the level. At 0: watch a video for +60 s, restart, or exit.
15. **Steeper difficulty (owner: "too easy").** Tutorial is now levels 1–3; 5–7 colours by level 4–12, 7–10 by 40, 9–12 with hidden layers from 50, 11–14 colours with capacity 5–6 after 100; score bands raised by ~8–10 points. Levels 1–2 are checked to have no dead-end traps.
16. **Android back in a level** opens "Leave level?" (Continue / Restart / Exit). Predictive back is disabled in `app.json` so the back press always reaches the game.

## Web preview (development only)
- Skia on the web needs CanvasKit WebAssembly. `src/boot.web.ts` loads it from the jsDelivr CDN, pinned to the exact `canvaskit-wasm` version Skia uses, then starts the router. If the browser has no WebGL, it switches CanvasKit to CPU rendering.
- This file is web-only (`.web.ts`). The Android app uses native Skia; its only network traffic is AdMob.
- Android-only APIs (back button, haptics) are no-ops on web.
