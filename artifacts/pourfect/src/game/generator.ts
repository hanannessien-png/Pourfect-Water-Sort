import { layerChar } from './codec';
import { scoreDifficulty } from './difficulty';
import { createRng, type Rng } from './prng';
import { applyPour, colorTotals, isSingleColor, isWon, topRun, usefulPours } from './rules';
import { Solver } from './solver';
import type { CompactBoard, PourRef } from './types';
import { MAX_COLORS } from './types';

/**
 * Level generator pipeline:
 *   solved board → scramble → reject trivial boards (already-sorted tubes, greedy-solvable)
 *   → verify with the forward solver (the solution doubles as a certificate) → score
 *   → accept only boards inside the target band.
 *
 * Scrambling swaps units between tubes (scramble < 1) or deals them fully at random
 * (scramble = 1). Swaps keep the classic layout — every colour tube full, the extra
 * tubes empty — which random reverse-pour walks almost never land on. Solvability comes
 * from the solver: nothing is ever returned without a verified solution.
 *
 * Deterministic: the same spec + seed always yields the same board.
 */

export interface GenSpec {
  readonly colorCaps: readonly number[];
  readonly emptyCaps: readonly number[];
  readonly hiddenRatio: number;
  readonly scramble: number;
  readonly band: readonly [number, number];
  readonly rejectGreedy: boolean;
}

export interface SolvePass {
  weight: number;
}

export interface GenOptions {
  maxNodes: number;
  maxAttempts: number;
  /** Solver passes; the first must solve, later ones may shorten the solution. */
  passes: readonly SolvePass[];
}

export interface GeneratedBoard {
  board: CompactBoard;
  par: number;
  difficulty: number;
  solution: PourRef[];
  attempts: number;
  /** True when no candidate hit the band and the closest verified one was used. */
  relaxed: boolean;
  seed: number;
}

export const OFFLINE_PASSES: readonly SolvePass[] = [{ weight: 3 }, { weight: 1.5 }, { weight: 1 }];
export const RUNTIME_PASSES: readonly SolvePass[] = [{ weight: 2.5 }];

/** Palette index pairs that read as too similar side by side (blue/violet, green/lime, …). */
const CONFUSABLE: readonly (readonly [number, number])[] = [
  [1, 4],
  [1, 7],
  [1, 13],
  [4, 13],
  [7, 11],
  [3, 8],
  [3, 11],
  [0, 12],
  [6, 12],
  [2, 15],
  [9, 15],
  [10, 14],
];
/** Boards up to this many colours never contain a confusable pair. */
const DISTINCT_UP_TO = 8;

const confusable = (a: number, b: number): boolean => CONFUSABLE.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export function pickColors(count: number, rng: Rng): number[] {
  // Low palette indices are the most distinct colours; small boards draw from those.
  const poolSize = Math.min(MAX_COLORS, count + 3);
  const pool = rng.shuffle(Array.from({ length: poolSize }, (_, i) => i));
  const strict = count <= DISTINCT_UP_TO;
  const out: number[] = [];
  const skipped: number[] = [];
  const consider = (c: number) => {
    if (out.length >= count) return;
    if (strict && out.some((o) => confusable(o, c))) skipped.push(c);
    else out.push(c);
  };
  pool.forEach(consider);
  for (let c = poolSize; c < MAX_COLORS && out.length < count; c++) consider(c);
  for (const c of skipped) if (out.length < count && !out.includes(c)) out.push(c);
  return out;
}

/** Build one scrambled candidate (not yet verified). */
export function buildCandidate(spec: GenSpec, rng: Rng): CompactBoard {
  const colors = pickColors(spec.colorCaps.length, rng);
  const homeCaps = rng.shuffle(spec.colorCaps.slice());
  // Solved arrangement: tube i holds homeCaps[i] units of colors[i].
  const cells: number[][] = homeCaps.map((cap, i) => Array(cap).fill(colors[i] as number));

  if (spec.scramble >= 1) {
    const all = rng.shuffle(cells.flat());
    let p = 0;
    for (const tube of cells) for (let k = 0; k < tube.length; k++) tube[k] = all[p++] as number;
  } else {
    const units = cells.reduce((s, t) => s + t.length, 0);
    const swaps = Math.max(2, Math.round(spec.scramble * units));
    for (let s = 0; s < swaps; s++) {
      const a = rng.int(cells.length);
      let b = rng.int(cells.length - 1);
      if (b >= a) b++;
      const ta = cells[a] as number[];
      const tb = cells[b] as number[];
      const ia = rng.int(ta.length);
      const ib = rng.int(tb.length);
      const tmp = ta[ia] as number;
      ta[ia] = tb[ib] as number;
      tb[ib] = tmp;
    }
  }

  const tubes = cells.map((tube) =>
    tube
      .map((color, k) => layerChar(color, k < tube.length - 1 && spec.hiddenRatio > 0 && rng.chance(spec.hiddenRatio)))
      .join(''),
  );
  return {
    caps: [...homeCaps, ...spec.emptyCaps],
    tubes: [...tubes, ...spec.emptyCaps.map(() => '')],
  };
}

/** No tube may start already sorted (single colour). */
export function hasSortedTube(board: CompactBoard): boolean {
  return board.tubes.some((t) => isSingleColor(t));
}

/**
 * A naive player: always merges a whole run onto a matching colour if possible,
 * otherwise any matching pour, otherwise the first move into an empty tube.
 * No lookahead; gives up on a repeated position.
 */
export function greedySolves(board: CompactBoard, maxSteps = 500): boolean {
  const totals = colorTotals(board);
  let cur = board;
  const seen = new Set<string>();
  for (let step = 0; step < maxSteps; step++) {
    if (isWon(cur, totals)) return true;
    const key = cur.tubes.join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    const moves = usefulPours(cur, totals);
    if (moves.length === 0) return false;
    const merges = moves.filter((m) => (cur.tubes[m.to] as string).length > 0);
    const full = merges.find((m) => {
      const src = cur.tubes[m.from] as string;
      const free = (cur.caps[m.to] as number) - (cur.tubes[m.to] as string).length;
      return topRun(src) <= free;
    });
    const choice = full ?? merges[0] ?? (moves[0] as PourRef);
    const next = applyPour(cur, choice.from, choice.to, totals);
    if (!next) return false;
    cur = next.board;
  }
  return false;
}

type GenStatus = 'running' | 'done' | 'failed';

interface Verified {
  board: CompactBoard;
  par: number;
  difficulty: number;
  solution: PourRef[];
}

/**
 * Time-sliceable generator. `step(budget)` spends at most ~`budget` solver expansions
 * (plus cheap candidate building) and returns the status.
 */
export class LevelGenerator {
  private readonly rng: Rng;
  private attempts = 0;
  private candidate: CompactBoard | null = null;
  private solver: Solver | null = null;
  private passIndex = 0;
  private bestSolution: PourRef[] | null = null;
  private firstExpanded = 0;
  private closest: { v: Verified; distance: number } | null = null;
  status: GenStatus = 'running';
  result: GeneratedBoard | null = null;

  constructor(
    private readonly spec: GenSpec,
    private readonly seed: number,
    private readonly opts: GenOptions,
  ) {
    this.rng = createRng(seed);
  }

  private finish(v: Verified, relaxed: boolean): void {
    this.result = { ...v, attempts: this.attempts, relaxed, seed: this.seed };
    this.status = 'done';
  }

  private nextCandidate(): void {
    this.solver = null;
    this.candidate = null;
    if (this.attempts >= this.opts.maxAttempts) {
      if (this.closest) this.finish(this.closest.v, true);
      else this.status = 'failed';
      return;
    }
    this.attempts++;
    const board = buildCandidate(this.spec, this.rng);
    if (hasSortedTube(board)) return;
    if (this.spec.rejectGreedy && greedySolves(board)) return;
    this.candidate = board;
    this.passIndex = 0;
    this.bestSolution = null;
    this.solver = new Solver(board, { weight: this.opts.passes[0]?.weight ?? 2, maxNodes: this.opts.maxNodes });
  }

  private evaluate(board: CompactBoard, solution: PourRef[]): void {
    const par = solution.length;
    const { score } = scoreDifficulty({ board, par, expanded: this.firstExpanded });
    const v: Verified = { board, par, difficulty: score, solution };
    const [lo, hi] = this.spec.band;
    if (score >= lo && score <= hi) {
      this.finish(v, false);
      return;
    }
    const distance = score < lo ? lo - score : score - hi;
    if (!this.closest || distance < this.closest.distance) this.closest = { v, distance };
  }

  step(budget: number): GenStatus {
    let remaining = budget;
    while (this.status === 'running' && remaining > 0) {
      if (!this.solver || !this.candidate) {
        this.nextCandidate();
        remaining -= 50; // candidate building has a small cost
        continue;
      }
      const before = this.solver.expanded;
      const st = this.solver.step(Math.min(remaining, 2048));
      remaining -= Math.max(1, this.solver.expanded - before);
      if (st === 'running') continue;
      if (this.passIndex === 0) {
        if (st !== 'solved') {
          this.solver = null; // unsolvable or too hard to verify → reject
          continue;
        }
        this.firstExpanded = this.solver.expanded;
      }
      if (st === 'solved') {
        const moves = this.solver.moves as PourRef[];
        if (!this.bestSolution || moves.length < this.bestSolution.length) this.bestSolution = moves;
      }
      this.passIndex++;
      const pass = this.opts.passes[this.passIndex];
      if (pass && st === 'solved') {
        this.solver = new Solver(this.candidate, { weight: pass.weight, maxNodes: this.opts.maxNodes });
        continue;
      }
      const board = this.candidate;
      const solution = this.bestSolution as PourRef[];
      this.solver = null;
      this.candidate = null;
      this.evaluate(board, solution);
    }
    return this.status;
  }
}

/** Run generation to completion synchronously (scripts and tests). */
export function generateBoard(spec: GenSpec, seed: number, opts: GenOptions): GeneratedBoard | null {
  const gen = new LevelGenerator(spec, seed, opts);
  while (gen.step(8192) === 'running') {
    /* keep going */
  }
  return gen.result;
}
