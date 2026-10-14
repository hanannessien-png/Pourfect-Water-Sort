import { canonicalKey, codeColor } from './codec';
import { colorTotals, colorsPresent, countRuns, isTubeComplete, pourTubes, topColor, topRun } from './rules';
import type { CompactBoard, PourRef } from './types';

/**
 * Weighted A* over board states with a visited set keyed by a canonical
 * (tube-order independent) encoding.
 *
 * Heuristic: (colour runs on the board) − (colours present). A pour can reduce the run
 * count by at most one, so with weight 1 the heuristic is admissible and the solution
 * is optimal; larger weights trade optimality for speed.
 *
 * The solver is a stepper so callers can time-slice it (UI thread, ≤ ~8 ms per slice)
 * or run it to completion (scripts, tests). Decisions depend on node counts only —
 * never on wall-clock time — so results are deterministic.
 */

export type SolveStatus = 'running' | 'solved' | 'unsolvable' | 'limit';

export interface SolveOptions {
  /** A* weight (1 = optimal). Default 2. */
  weight?: number;
  /** Max node expansions before giving up with status 'limit'. Default 200 000. */
  maxNodes?: number;
}

export interface SolveResult {
  status: Exclude<SolveStatus, 'running'>;
  /** Moves from the start position to a win (only when solved). */
  moves: PourRef[] | null;
  expanded: number;
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, key: number): void {
    const ids = this.ids;
    const keys = this.keys;
    let i = ids.length;
    ids.push(id);
    keys.push(key);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if ((keys[p] as number) <= key) break;
      ids[i] = ids[p] as number;
      keys[i] = keys[p] as number;
      i = p;
    }
    ids[i] = id;
    keys[i] = key;
  }

  pop(): number {
    const ids = this.ids;
    const keys = this.keys;
    const top = ids[0] as number;
    const lastId = ids.pop() as number;
    const lastKey = keys.pop() as number;
    const n = ids.length;
    if (n > 0) {
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        if (l >= n) break;
        const r = l + 1;
        const c = r < n && (keys[r] as number) < (keys[l] as number) ? r : l;
        if ((keys[c] as number) >= lastKey) break;
        ids[i] = ids[c] as number;
        keys[i] = keys[c] as number;
        i = c;
      }
      ids[i] = lastId;
      keys[i] = lastKey;
    }
    return top;
  }
}

export class Solver {
  private readonly caps: readonly number[];
  private readonly totals: number[];
  private readonly uniformCap: boolean;
  private readonly weight: number;
  private readonly maxNodes: number;
  private readonly colorCount: number;

  private states: (readonly string[])[] = [];
  private g: number[] = [];
  private parent: number[] = [];
  private moveFrom: number[] = [];
  private moveTo: number[] = [];
  private best = new Map<string, number>();
  private open = new MinHeap();
  private seq = 0;

  status: SolveStatus = 'running';
  expanded = 0;
  private goal = -1;

  constructor(board: CompactBoard, opts: SolveOptions = {}) {
    this.caps = board.caps;
    this.totals = colorTotals(board);
    this.colorCount = colorsPresent(this.totals);
    this.uniformCap = board.caps.every((c) => c === board.caps[0]);
    this.weight = opts.weight ?? 2;
    this.maxNodes = opts.maxNodes ?? 200_000;
    this.addNode(board.tubes, 0, -1, -1, -1);
  }

  private heuristic(tubes: readonly string[]): number {
    return countRuns(tubes) - this.colorCount;
  }

  private addNode(tubes: readonly string[], g: number, parent: number, from: number, to: number): void {
    const key = canonicalKey(this.caps, tubes, this.uniformCap);
    const prev = this.best.get(key);
    if (prev !== undefined && prev <= g) return;
    this.best.set(key, g);
    const id = this.states.length;
    this.states.push(tubes);
    this.g.push(g);
    this.parent.push(parent);
    this.moveFrom.push(from);
    this.moveTo.push(to);
    const h = this.heuristic(tubes);
    // f with tie-break on lower h, then FIFO (seq) for determinism.
    const f = g + this.weight * h;
    this.open.push(id, f * 1e7 + h * 1e4 + (this.seq++ % 1e4) / 1e4);
  }

  private isGoal(tubes: readonly string[]): boolean {
    for (const t of tubes) if (t.length > 0 && !isTubeComplete(t, this.totals)) return false;
    return true;
  }

  /** Expand up to `budget` nodes. Returns the current status. */
  step(budget: number): SolveStatus {
    if (this.status !== 'running') return this.status;
    const caps = this.caps;
    const totals = this.totals;
    for (let b = 0; b < budget; b++) {
      if (this.open.size === 0) {
        this.status = 'unsolvable';
        return this.status;
      }
      if (this.expanded >= this.maxNodes) {
        this.status = 'limit';
        return this.status;
      }
      const id = this.open.pop();
      const tubes = this.states[id] as readonly string[];
      const g = this.g[id] as number;
      const key = canonicalKey(caps, tubes, this.uniformCap);
      if ((this.best.get(key) as number) < g) continue; // stale entry
      if (this.isGoal(tubes)) {
        this.goal = id;
        this.status = 'solved';
        return this.status;
      }
      this.expanded++;
      const n = tubes.length;
      for (let from = 0; from < n; from++) {
        const src = tubes[from] as string;
        if (src.length === 0 || isTubeComplete(src, totals)) continue;
        const color = topColor(src);
        const run = topRun(src);
        const singleRun = run === src.length;
        let triedEmptyCaps = 0; // bitmask of capacities already tried as empty targets
        for (let to = 0; to < n; to++) {
          if (to === from) continue;
          const tgt = tubes[to] as string;
          const cap = caps[to] as number;
          const free = cap - tgt.length;
          if (free <= 0) continue;
          if (tgt.length === 0) {
            if (singleRun) continue;
            const bit = 1 << cap;
            if (triedEmptyCaps & bit) continue;
            triedEmptyCaps |= bit;
          } else if (codeColor(tgt.charCodeAt(tgt.length - 1)) !== color) {
            continue;
          }
          const r = pourTubes(src, tgt, Math.min(run, free), totals);
          const next = tubes.slice();
          next[from] = r.src;
          next[to] = r.tgt;
          this.addNode(next, g + 1, id, from, to);
        }
      }
    }
    return this.status;
  }

  get moves(): PourRef[] | null {
    if (this.goal < 0) return null;
    const out: PourRef[] = [];
    let id = this.goal;
    while ((this.parent[id] as number) >= 0) {
      out.push({ from: this.moveFrom[id] as number, to: this.moveTo[id] as number });
      id = this.parent[id] as number;
    }
    out.reverse();
    return out;
  }

  result(): SolveResult {
    if (this.status === 'running') throw new Error('Solver still running');
    return { status: this.status, moves: this.moves, expanded: this.expanded };
  }
}

/** Run the solver to completion synchronously. */
export function solve(board: CompactBoard, opts: SolveOptions = {}): SolveResult {
  const s = new Solver(board, opts);
  while (s.step(4096) === 'running') {
    /* keep stepping */
  }
  return s.result();
}

/**
 * Best-effort shortest solution: a fast weighted pass first, then tighter passes that
 * may improve the move count within the node budget.
 */
export function solveBest(board: CompactBoard, maxNodes = 200_000): SolveResult {
  const first = solve(board, { weight: 3, maxNodes });
  if (first.status !== 'solved') return first;
  let best = first;
  for (const weight of [1.5, 1]) {
    const r = solve(board, { weight, maxNodes });
    if (r.status === 'solved' && r.moves && best.moves && r.moves.length < best.moves.length) best = r;
    if (r.status !== 'solved') break;
  }
  return { ...best, expanded: first.expanded };
}
