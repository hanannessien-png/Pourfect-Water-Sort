# Pourfect: Water Sort Puzzle

Android-only, fully offline water-sort puzzle game (Expo + React Native + Skia), built from the owner's master spec PDF in `attached_assets/` with overrides in `BUILD_BRIEF.md`.

## Run & Operate

- Workflow `artifacts/pourfect: expo` runs Metro; test on Android with Expo Go (QR code).
- From `artifacts/pourfect`: `pnpm run typecheck`, `pnpm run lint`, `pnpm test`, `pnpm run levels:validate`, `pnpm run levels:generate`.
- The API server and mockup sandbox artifacts are scaffold leftovers; the game does not use them.

## Stack

- Expo SDK 57, React Native 0.86, strict TypeScript, Expo Router
- Rendering: @shopify/react-native-skia + Reanimated 4 / worklets
- State: Zustand + AsyncStorage (with backup copy)
- Tests: Jest (Babel transform, no jest-expo); ESLint (eslint-config-expo)

## Where things live

- `artifacts/pourfect/PROGRESS.md` — phase status, checks, next steps
- `artifacts/pourfect/README.md` — commands, where to change package name / ad IDs, decisions log
- `artifacts/pourfect/src/game` — pure engine; `src/render` — Skia board; `src/state` — save/session/shop
- `artifacts/pourfect/src/config/cosmetics.ts` — shop catalogue and prices (coins only); `src/ui/theme.ts` — "Gilded Night" palette
- `artifacts/pourfect/src/data/levels.fixed.json` — 300 generated, solver-verified levels

## Architecture decisions

- Static `app.json` only (no `app.config.*`); no EAS commands run from Replit.
- Fixed levels are generated offline by script and re-verified; never hand-edit the JSON.
- Web preview is a dev aid only: `src/boot.web.ts` loads CanvasKit from a CDN; Android stays offline.

## Product

- Campaign of 300 fixed levels (endless after), undo / hint / add-tube tokens, stars, resume, colour-blind symbols, Reduce motion, Low graphics.

## User preferences

- Owner writes in Egyptian Arabic; reply in Egyptian Arabic. Game UI is English only.
- Stop for owner review after Phase 3, Phase 5 and Phase 6; Phases 7–8 run straight through.
- No ad IDs anywhere (not even Google test IDs) until the owner supplies them at the end.

## Gotchas

- TypeScript 6 no longer auto-includes `@types/*`; tsconfig lists `"types": ["jest", "node"]`.
- `react-native-worklets` needs `@babel/generator` via `packageExtensions` in `pnpm-workspace.yaml`, or Metro fails.
- Restart the Expo workflow only after dependency or entry/config changes (HMR covers code).
