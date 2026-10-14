import { createRng, hashString } from '@/src/game/prng';

/**
 * Difficulty ramp. Every knob for level generation lives here so it can be tuned
 * without touching engine code. `levelSpec(n)` is deterministic for a given level.
 *
 *   1–5     tutorial: 2–3 colours, capacity 4, 1–2 empty tubes
 *   6–20    4–6 colours, 2 empty
 *   21–60   6–9 colours, 2 empty
 *   61–120  8–11 colours, capacity 4–5, hidden layers from level 80
 *   121–300 10–14 colours, capacity 5–6, hidden 20–50 %, mixed-size specials
 *   301+    endless: capacity 5–8, up to 16 colours, ≤ 100 layers, ≤ 18 tubes
 *   Every 10th level is Hard: higher band, double rewards, one extra Add Tube allowed.
 */

export const FIXED_LEVEL_COUNT = 300;

export interface LevelSpec {
  readonly level: number;
  /** Capacity of each colour's home tube; a colour has exactly that many units. */
  readonly colorCaps: readonly number[];
  /** Capacities of the tubes that start empty. */
  readonly emptyCaps: readonly number[];
  /** Fraction of non-top layers that start hidden. */
  readonly hiddenRatio: number;
  readonly mixed: boolean;
  readonly hard: boolean;
  /** 0..1 — how thoroughly the solved board is shuffled (1 = fully random). */
  readonly scramble: number;
  /** Accepted difficulty-score band (0–100). */
  readonly band: readonly [number, number];
  /** Reject boards a naive greedy player solves. */
  readonly rejectGreedy: boolean;
  /** Number of Add Tube boosters usable on this level. */
  readonly maxAddTubes: number;
}

/** Difficulty bands per range (score 0–100, see game/difficulty.ts). */
export const BANDS = {
  tutorial: [0, 45],
  early: [30, 62],
  mid: [45, 72],
  late: [52, 80],
  expert: [58, 92],
  endless: [60, 100],
} as const;

/** How much harder Hard levels are allowed/required to be. */
export const HARD_BAND_SHIFT = 6;

/** Solver node budgets. */
export const SOLVER_LIMITS = {
  /** Offline generator script. */
  offline: 250_000,
  /** On-device generation (endless/daily), time-sliced. */
  runtime: 40_000,
  /** On-device hints and dead-end detection, time-sliced. */
  hint: 25_000,
} as const;

/** Max candidate boards tried for one level before relaxing the band. */
export const MAX_ATTEMPTS = 60;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * Math.max(0, Math.min(1, t));

export function isHardLevel(level: number): boolean {
  return level >= 10 && level % 10 === 0;
}

function shift(band: readonly [number, number], hard: boolean): readonly [number, number] {
  if (!hard) return band;
  return [Math.min(band[0] + HARD_BAND_SHIFT, 95), Math.min(band[1] + HARD_BAND_SHIFT, 100)];
}

export function levelSpec(level: number): LevelSpec {
  const rng = createRng(hashString(`spec:${level}`));
  const hard = isHardLevel(level);
  const maxAddTubes = hard ? 2 : 1;

  if (level <= 5) {
    const table: Record<number, [number, number]> = { 1: [2, 1], 2: [3, 2], 3: [3, 2], 4: [3, 2], 5: [3, 1] };
    const [colors, empties] = table[level] ?? [3, 2];
    return {
      level,
      colorCaps: Array(colors).fill(4),
      emptyCaps: Array(empties).fill(4),
      hiddenRatio: 0,
      mixed: false,
      hard: false,
      scramble: lerp(0.45, 0.8, (level - 1) / 4),
      band: BANDS.tutorial,
      rejectGreedy: false,
      maxAddTubes,
    };
  }

  if (level <= 20) {
    const colors = 4 + Math.floor((level - 6) / 5);
    return {
      level,
      colorCaps: Array(colors + (hard ? 1 : 0)).fill(4),
      emptyCaps: [4, 4],
      hiddenRatio: 0,
      mixed: false,
      hard,
      scramble: lerp(0.65, 1, (level - 6) / 14),
      band: shift(BANDS.early, hard),
      rejectGreedy: true,
      maxAddTubes,
    };
  }

  if (level <= 60) {
    const colors = Math.min(9, 6 + Math.floor((level - 21) / 10) + (hard ? 1 : 0));
    return {
      level,
      colorCaps: Array(colors).fill(4),
      emptyCaps: [4, 4],
      hiddenRatio: 0,
      mixed: false,
      hard,
      scramble: 1,
      band: shift(BANDS.mid, hard),
      rejectGreedy: true,
      maxAddTubes,
    };
  }

  if (level <= 120) {
    const colors = Math.min(11, 8 + Math.floor((level - 61) / 15) + (hard ? 1 : 0));
    const cap = level >= 90 && level % 2 === 1 ? 5 : 4;
    const hiddenRatio = level >= 80 && rng.chance(0.6) ? lerp(0.1, 0.3, (level - 80) / 40) : 0;
    return {
      level,
      colorCaps: Array(colors).fill(cap),
      emptyCaps: [cap, cap],
      hiddenRatio,
      mixed: false,
      hard,
      scramble: 1,
      band: shift(BANDS.late, hard),
      rejectGreedy: true,
      maxAddTubes,
    };
  }

  if (level <= FIXED_LEVEL_COUNT) {
    const colors = Math.min(14, 10 + Math.floor((level - 121) / 45) + (hard ? 1 : 0));
    const mixed = level % 7 === 0;
    const baseCap = level < 200 ? rng.pick([5, 5, 6]) : rng.pick([5, 6, 6]);
    const colorCaps = mixed
      ? Array.from({ length: colors }, (_, i) => [4, 5, 6][i % 3] as number)
      : Array(colors).fill(baseCap);
    const maxCap = Math.max(...colorCaps);
    const hiddenRatio = rng.chance(0.7) ? lerp(0.2, 0.5, (level - 121) / 180) : 0;
    return {
      level,
      colorCaps,
      emptyCaps: [maxCap, maxCap],
      hiddenRatio,
      mixed,
      hard,
      scramble: 1,
      band: shift(BANDS.expert, hard),
      rejectGreedy: true,
      maxAddTubes,
    };
  }

  // Endless (301+): capacity 5–8, up to 16 colours, ≤ 100 layers, ≤ 18 tubes.
  const cap = rng.pick([5, 6, 6, 7, 8]);
  const maxColorsByLayers = Math.floor(100 / cap);
  const colors = Math.min(16, maxColorsByLayers, 11 + Math.floor((level - 301) / 60) + rng.int(3));
  const mixed = level % 9 === 0;
  const colorCaps = mixed
    ? Array.from({ length: colors }, (_, i) => Math.min(8, Math.max(4, cap - 1 + (i % 3))))
    : Array(colors).fill(cap);
  const maxCap = Math.max(...colorCaps);
  return {
    level,
    colorCaps,
    emptyCaps: [maxCap, maxCap],
    hiddenRatio: rng.chance(0.6) ? rng.pick([0.25, 0.35, 0.5]) : 0,
    mixed,
    hard,
    scramble: 1,
    band: shift(BANDS.endless, hard),
    rejectGreedy: true,
    maxAddTubes,
  };
}

/** Daily challenge: a mid/late difficulty board seeded by the date. */
export function dailySpec(dateKey: string): LevelSpec {
  const rng = createRng(hashString(`daily:${dateKey}`));
  const base = levelSpec(rng.range(70, 180));
  return { ...base, level: 0, hard: false, maxAddTubes: 1 };
}
