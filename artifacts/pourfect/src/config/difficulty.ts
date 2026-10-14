import { createRng, hashString } from '@/src/game/prng';

/**
 * Difficulty ramp. Every knob for level generation lives here so it can be tuned
 * without touching engine code. `levelSpec(n)` is deterministic for a given level.
 *
 *   1–3     tutorial: 2–4 colours, capacity 4, 1–2 empty tubes
 *   4–12    5–7 colours, 2 empty
 *   13–40   7–10 colours, 2 empty
 *   41–100  9–12 colours, capacity 4–5, hidden layers from level 50
 *   101–300 11–14 colours, capacity 5–6, hidden 25–50 %, mixed-size specials
 *   (Owner asked for a steeper ramp; bands were raised accordingly.)
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
  tutorial: [0, 50],
  early: [44, 72],
  mid: [54, 82],
  late: [60, 88],
  expert: [64, 95],
  endless: [66, 100],
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

  if (level <= 3) {
    const table: Record<number, [number, number]> = { 1: [2, 1], 2: [3, 2], 3: [4, 2] };
    const [colors, empties] = table[level] ?? [3, 2];
    return {
      level,
      colorCaps: Array(colors).fill(4),
      emptyCaps: Array(empties).fill(4),
      hiddenRatio: 0,
      mixed: false,
      hard: false,
      scramble: lerp(0.6, 1, (level - 1) / 2),
      band: BANDS.tutorial,
      rejectGreedy: level === 3,
      maxAddTubes,
    };
  }

  if (level <= 12) {
    const colors = 5 + Math.floor((level - 4) / 3) + (hard ? 1 : 0);
    return {
      level,
      colorCaps: Array(colors).fill(4),
      emptyCaps: [4, 4],
      hiddenRatio: 0,
      mixed: false,
      hard,
      scramble: 1,
      band: shift(BANDS.early, hard),
      rejectGreedy: true,
      maxAddTubes,
    };
  }

  if (level <= 40) {
    const colors = Math.min(10, 7 + Math.floor((level - 13) / 7) + (hard ? 1 : 0));
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

  if (level <= 100) {
    const colors = Math.min(12, 9 + Math.floor((level - 41) / 15) + (hard ? 1 : 0));
    const cap = level >= 60 && level % 2 === 1 ? 5 : 4;
    const hiddenRatio = level >= 50 && rng.chance(0.55) ? lerp(0.15, 0.35, (level - 50) / 50) : 0;
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
    const colors = Math.min(14, 11 + Math.floor((level - 101) / 50) + (hard ? 1 : 0));
    const mixed = level % 7 === 0;
    const baseCap = level < 180 ? rng.pick([5, 5, 6]) : rng.pick([5, 6, 6]);
    const colorCaps = mixed
      ? Array.from({ length: colors }, (_, i) => [4, 5, 6][i % 3] as number)
      : Array(colors).fill(baseCap);
    const maxCap = Math.max(...colorCaps);
    const hiddenRatio = rng.chance(0.7) ? lerp(0.25, 0.5, (level - 101) / 200) : 0;
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
