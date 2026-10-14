import { dailySpec, levelSpec, SOLVER_LIMITS, MAX_ATTEMPTS } from '@/src/config/difficulty';
import { generateBoard, greedySolves, hasSortedTube, pickColors, RUNTIME_PASSES } from '../generator';
import { createRng, hashString } from '../prng';
import { applyPour, colorTotals, isWon } from '../rules';
import type { CompactBoard, PourRef } from '../types';
import { MAX_LAYERS, MAX_TUBES } from '../types';

function replayWins(board: CompactBoard, moves: PourRef[]): boolean {
  const totals = colorTotals(board);
  let cur = board;
  for (const m of moves) {
    const r = applyPour(cur, m.from, m.to, totals);
    if (!r) return false;
    cur = r.board;
  }
  return isWon(cur, totals);
}

const opts = { maxNodes: SOLVER_LIMITS.runtime, maxAttempts: MAX_ATTEMPTS, passes: RUNTIME_PASSES };

describe('generator', () => {
  it('is deterministic for the same spec and seed', () => {
    const a = generateBoard(levelSpec(42), 1234, opts);
    const b = generateBoard(levelSpec(42), 1234, opts);
    expect(a?.board).toEqual(b?.board);
    expect(a?.par).toBe(b?.par);
  });

  it('produces 500 seeded boards across all ranges that are solvable and inside their band', () => {
    let count = 0;
    for (let i = 1; i <= 500; i++) {
      // Spread across tutorial, fixed ranges and endless.
      const level = i <= 300 ? i : 300 + (i - 300) * 3;
      const spec = levelSpec(level);
      const r = generateBoard(spec, hashString(`test:${level}`), opts);
      expect(r).not.toBeNull();
      if (!r) continue;
      expect(r.relaxed).toBe(false);
      expect(r.difficulty).toBeGreaterThanOrEqual(spec.band[0]);
      expect(r.difficulty).toBeLessThanOrEqual(spec.band[1]);
      expect(replayWins(r.board, r.solution)).toBe(true);
      expect(r.par).toBe(r.solution.length);
      expect(hasSortedTube(r.board)).toBe(false);
      if (spec.rejectGreedy) expect(greedySolves(r.board)).toBe(false);
      expect(r.board.tubes.length).toBeLessThanOrEqual(MAX_TUBES);
      expect(r.board.tubes.reduce((s, t) => s + t.length, 0)).toBeLessThanOrEqual(MAX_LAYERS);
      count++;
    }
    expect(count).toBe(500);
  }, 240_000);

  it('builds a daily board from the date', () => {
    const spec = dailySpec('2026-10-14');
    expect(spec).toEqual(dailySpec('2026-10-14'));
    const r = generateBoard(spec, hashString('daily:2026-10-14'), opts);
    expect(r && replayWins(r.board, r.solution)).toBe(true);
  });
});

describe('pickColors', () => {
  const SIMILAR = [
    [1, 4],
    [1, 7],
    [3, 8],
    [0, 12],
  ];
  it('never pairs look-alike colours on small boards, and always returns distinct colours', () => {
    for (let count = 2; count <= 14; count++) {
      for (let seed = 0; seed < 200; seed++) {
        const cols = pickColors(count, createRng(hashString(`c${count}:${seed}`)));
        expect(cols).toHaveLength(count);
        expect(new Set(cols).size).toBe(count);
        if (count <= 8) {
          for (const [a, b] of SIMILAR) expect(cols.includes(a!) && cols.includes(b!)).toBe(false);
        }
      }
    }
  });
});
