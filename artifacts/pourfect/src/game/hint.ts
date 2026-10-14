import { colorTotals, countRuns, isTubeComplete, pourTubes, topRun, usefulPours } from './rules';
import { Solver } from './solver';
import type { CompactBoard, PourRef } from './types';

/**
 * Hints and dead-end detection.
 *
 * `HintSearch` wraps the solver as a stepper so the UI can time-slice it. If the solver
 * finds a solution, its first move is the hint. If it exhausts the search space the
 * position is a proven dead end. If it hits its node limit, `heuristicHint` supplies a
 * sensible move instead so a hint is always available when any legal move exists.
 */

export type HintOutcome =
  | { kind: 'move'; move: PourRef; certain: boolean; solutionLength: number | null }
  | { kind: 'dead-end' }
  | { kind: 'no-moves' };

export class HintSearch {
  private readonly solver: Solver | null;
  readonly immediate: HintOutcome | null;

  constructor(
    private readonly board: CompactBoard,
    maxNodes: number,
  ) {
    const totals = colorTotals(board);
    if (usefulPours(board, totals).length === 0) {
      this.immediate = { kind: 'no-moves' };
      this.solver = null;
    } else {
      this.immediate = null;
      this.solver = new Solver(board, { weight: 2.5, maxNodes });
    }
  }

  /** Returns an outcome when finished, or null while still searching. */
  step(budget: number): HintOutcome | null {
    if (this.immediate) return this.immediate;
    const solver = this.solver as Solver;
    const st = solver.step(budget);
    if (st === 'running') return null;
    if (st === 'solved') {
      const moves = solver.moves as PourRef[];
      const first = moves[0];
      // Already won (no moves needed) — nothing to hint.
      if (!first) return { kind: 'no-moves' };
      return { kind: 'move', move: first, certain: true, solutionLength: moves.length };
    }
    if (st === 'unsolvable') return { kind: 'dead-end' };
    const fallback = heuristicHint(this.board);
    return fallback ? { kind: 'move', move: fallback, certain: false, solutionLength: null } : { kind: 'no-moves' };
  }
}

/** Pick a move that reduces colour runs most, preferring completions and avoiding empties. */
export function heuristicHint(board: CompactBoard): PourRef | null {
  const totals = colorTotals(board);
  const moves = usefulPours(board, totals);
  let best: PourRef | null = null;
  let bestScore = -Infinity;
  for (const m of moves) {
    const src = board.tubes[m.from] as string;
    const tgt = board.tubes[m.to] as string;
    const free = (board.caps[m.to] as number) - tgt.length;
    const count = Math.min(topRun(src), free);
    const r = pourTubes(src, tgt, count, totals);
    const next = board.tubes.slice();
    next[m.from] = r.src;
    next[m.to] = r.tgt;
    let score = -countRuns(next) * 10;
    if (isTubeComplete(r.tgt, totals)) score += 25;
    if (tgt.length === 0) score -= 6;
    if (count < topRun(src)) score -= 4;
    if (score > bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}
