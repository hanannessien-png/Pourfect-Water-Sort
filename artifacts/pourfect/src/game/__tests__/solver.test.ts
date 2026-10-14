import { decodeBoard } from '../codec';
import { HintSearch, heuristicHint } from '../hint';
import { applyPour, colorTotals, isWon } from '../rules';
import { solve, solveBest } from '../solver';
import type { CompactBoard, PourRef } from '../types';

function replay(board: CompactBoard, moves: PourRef[]): CompactBoard {
  const totals = colorTotals(board);
  let cur = board;
  for (const m of moves) {
    const r = applyPour(cur, m.from, m.to, totals);
    if (!r) throw new Error(`illegal move ${m.from}->${m.to}`);
    cur = r.board;
  }
  return cur;
}

function runHint(board: CompactBoard, maxNodes = 50_000) {
  const h = new HintSearch(board, maxNodes);
  for (;;) {
    const out = h.step(1000);
    if (out) return out;
  }
}

describe('solver', () => {
  it('solves a small board optimally with weight 1', () => {
    const board = decodeBoard('4:abab,4:baba,4:,4:');
    const r = solve(board, { weight: 1 });
    expect(r.status).toBe('solved');
    expect(isWon(replay(board, r.moves!), colorTotals(board))).toBe(true);
    const fast = solve(board, { weight: 3 });
    expect(r.moves!.length).toBeLessThanOrEqual(fast.moves!.length);
  });

  it('returns a zero-move solution for a solved board', () => {
    const r = solve(decodeBoard('4:aaaa,4:bbbb,4:'));
    expect(r.status).toBe('solved');
    expect(r.moves).toEqual([]);
  });

  it('proves a dead end', () => {
    // No empty tube, every top mismatched: no legal move at all.
    const stuck = decodeBoard('3:abc,3:bca,3:cab');
    expect(solve(stuck).status).toBe('unsolvable');
    // Legal moves exist but every line of play fails.
    const trap = decodeBoard('3:abb,3:abc,3:cac,3:');
    expect(solve(trap, { maxNodes: 100_000 }).status).toBe('unsolvable');
  });

  it('respects the node limit', () => {
    const big = decodeBoard('6:abcdef,6:bcdefa,6:cdefab,6:defabc,6:efabcd,6:fabcde,6:,6:');
    const r = solve(big, { weight: 1, maxNodes: 10 });
    expect(r.status).toBe('limit');
  });

  it('solves boards with hidden layers and mixed capacities', () => {
    const board = decodeBoard('4:aBca,5:cbAbc,6:bacbac,6:,6:');
    const r = solveBest(board);
    expect(r.status).toBe('solved');
    expect(isWon(replay(board, r.moves!), colorTotals(board))).toBe(true);
  });
});

describe('hints', () => {
  it('suggests the first move of a solution', () => {
    const board = decodeBoard('4:abab,4:baba,4:,4:');
    const out = runHint(board);
    expect(out.kind).toBe('move');
    if (out.kind === 'move') {
      const totals = colorTotals(board);
      expect(applyPour(board, out.move.from, out.move.to, totals)).not.toBeNull();
      expect(out.certain).toBe(true);
    }
  });

  it('reports dead ends and no-move positions', () => {
    expect(runHint(decodeBoard('3:abc,3:bca,3:cab')).kind).toBe('no-moves');
    expect(runHint(decodeBoard('3:abb,3:abc,3:cac,3:')).kind).toBe('dead-end');
  });

  it('falls back to a heuristic move at the node limit', () => {
    const big = decodeBoard('6:abcdef,6:bcdefa,6:cdefab,6:defabc,6:efabcd,6:fabcde,6:,6:');
    const out = runHint(big, 5);
    expect(out.kind).toBe('move');
    if (out.kind === 'move') expect(out.certain).toBe(false);
    expect(heuristicHint(big)).not.toBeNull();
  });
});
