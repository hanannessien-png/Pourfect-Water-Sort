import { encodeBoard } from './codec';
import { applyPour, colorTotals, isWon, legalPours } from './rules';
import type { CompactBoard } from './types';

/**
 * True if some position reachable from `board` can no longer be solved (a "trap").
 * Exhaustive, so only use it on tiny tutorial boards. Returns true (unsafe) if the
 * state space exceeds `maxStates`.
 */
export function hasTrap(board: CompactBoard, maxStates = 20_000): boolean {
  const totals = colorTotals(board);
  const index = new Map<string, number>();
  const boards: CompactBoard[] = [];
  const edges: number[][] = [];
  const won: boolean[] = [];

  const add = (b: CompactBoard): number => {
    const key = encodeBoard(b);
    const known = index.get(key);
    if (known !== undefined) return known;
    const id = boards.length;
    index.set(key, id);
    boards.push(b);
    edges.push([]);
    won.push(isWon(b, totals));
    return id;
  };

  add(board);
  for (let i = 0; i < boards.length; i++) {
    if (boards.length > maxStates) return true;
    const b = boards[i] as CompactBoard;
    if (won[i]) continue;
    for (const p of legalPours(b, totals)) {
      const r = applyPour(b, p.from, p.to, totals);
      if (r) (edges[i] as number[]).push(add(r.board));
    }
  }

  // Backward pass: which states can still reach a solved board?
  const good = won.slice();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < boards.length; i++) {
      if (!good[i] && (edges[i] as number[]).some((j) => good[j])) {
        good[i] = true;
        changed = true;
      }
    }
  }
  return good.some((g) => !g);
}
