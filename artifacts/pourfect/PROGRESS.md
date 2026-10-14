# Pourfect — Progress

Spec: `attached_assets/Water_Sort_Puzzle_—_Replit_Master_Prompt_*.pdf`, overridden by `BUILD_BRIEF.md` (repo root).

## Done

### Phase 1 — Foundation
- Expo SDK 57 / RN 0.86 / strict TypeScript, Expo Router (Home, Game, Levels, Settings).
- Theme ("calm twilight"), Fredoka type, English string table (`src/i18n/en.ts`).
- Config: `src/config/{brand,difficulty,economy}.ts`; static `app.json` (package `com.apexinteractive.pourfect`, versionCode 1, portrait, dark UI, minimal permissions).
- Jest (ts + babel, no jest-expo), ESLint (eslint-config-expo flat config).

### Phase 2 — Engine (`src/game`)
- Compact board codec, pour rules, undo, win check, hidden layers ("?") and reveal.
- Solver (weighted A* with node budget, time-sliceable, deterministic), hint, par and stars, difficulty score.
- Generator: scramble + solver verification, difficulty bands per level, look-alike colour pairs excluded on boards of ≤ 8 colours.
- `scripts/generate-levels.ts` → `src/data/levels.fixed.json` (300 levels, deterministic); `scripts/validate-levels.ts` re-verifies every level.

### Phase 3 — Board and feel (`src/render`)
- Skia board: glass tubes, liquid bands with gradients, surface highlights, caps on finished tubes, backdrop gradient + stars.
- Pour animation: tube lifts, travels, tilts around its lip; liquid surfaces stay level; stream + droplets; target fills in sync.
- Selection lift, shake on illegal move, splash, reveal, sparkles on completed tube, confetti on win, hint arrow, Add Tube slide-in.
- Responsive layout (1–3 rows), hit-testing, accessibility labels per tube, haptics, Reduce motion, Low graphics, colour-blind symbols.
- Basic session flow so the levels are playable end to end: pause, restart, undo / hint / add-tube tokens, stuck sheet (no moves / dead end), win sheet with stars, resume of an unfinished level.

## Checks (end of Phase 3)
- `pnpm run typecheck` — 0 errors
- `pnpm run lint` — 0 problems
- `pnpm test` — 8 suites, 51 tests pass
- `pnpm run levels:validate` — 300/300 valid and solver-verified
- `pnpm dlx expo-doctor` — 21/21
- Android bundle builds; web preview renders Home, Game, Levels, Settings.
- No network calls in app code (the only URL is the web-preview-only CanvasKit CDN, see README).

## Next — Phase 4 (after owner review)
Persistence polish, economy, win/stuck flows in full, Levels screen polish, tutorial hand, daily reward, spin, daily challenge, quests, achievements, chests, clock safety.

## Owner checkpoints
1. **End of Phase 3 — now.** Play on Android via Expo Go.
2. End of Phase 5 (meta + store/skins).
3. End of Phase 6 (audio). Then Phases 7–8 straight through.
