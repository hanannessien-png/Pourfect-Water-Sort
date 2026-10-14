import { codeHidden } from './codec';
import { colorTotals, colorsPresent, countRuns } from './rules';
import type { CompactBoard } from './types';

/**
 * Difficulty score 0–100 combining:
 *  - fragmentation: how broken-up the colours are (runs vs. the solved minimum)
 *  - par ratio: solver moves per colour
 *  - hidden share: fraction of layers that start hidden
 *  - tightness: how little spare room the empty tubes give
 *  - effort: how hard the solver had to search
 */
export interface DifficultyInput {
  board: CompactBoard;
  par: number;
  expanded: number;
}

export interface DifficultyBreakdown {
  score: number;
  fragmentation: number;
  parRatio: number;
  hidden: number;
  tightness: number;
  effort: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

export function scoreDifficulty({ board, par, expanded }: DifficultyInput): DifficultyBreakdown {
  const totals = colorTotals(board);
  const colors = Math.max(1, colorsPresent(totals));
  let units = 0;
  let hiddenCount = 0;
  let emptyCap = 0;
  board.tubes.forEach((t, i) => {
    units += t.length;
    for (let k = 0; k < t.length; k++) if (codeHidden(t.charCodeAt(k))) hiddenCount++;
    emptyCap += (board.caps[i] as number) - t.length;
  });
  const runs = countRuns(board.tubes);
  const fragmentation = units > colors ? clamp01((runs - colors) / (units - colors)) : 0;
  const parRatio = clamp01((par / colors - 1) / 2.5);
  const hidden = units > 0 ? clamp01(hiddenCount / units / 0.5) : 0;
  const tightness = units > 0 ? clamp01(1 - (2 * emptyCap) / units) : 0;
  const effort = clamp01(Math.log10(expanded + 1) / 5);
  const score =
    100 * (0.3 * fragmentation + 0.2 * parRatio + 0.15 * hidden + 0.2 * tightness + 0.15 * effort);
  return { score: Math.round(score * 10) / 10, fragmentation, parRatio, hidden, tightness, effort };
}
