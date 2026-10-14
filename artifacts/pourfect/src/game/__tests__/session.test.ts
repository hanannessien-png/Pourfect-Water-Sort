import { decodeBoard, encodeBoard } from '../codec';
import { addTube, canAddTube, commitPour, newSession, resolveTap, restartSession, undoLast, type SessionState } from '../session';
import type { LevelDef } from '../types';

const def = (text: string, maxAddTubes = 1): LevelDef => ({
  id: 't:1',
  board: decodeBoard(text),
  par: 3,
  difficulty: 0,
  hard: false,
  maxAddTubes,
});

/** Apply a tap sequence, committing pours; returns the final state. */
function play(s: SessionState, taps: number[]): SessionState {
  let sel: number | null = null;
  for (const i of taps) {
    const out = resolveTap(s, sel, i);
    if (out.kind === 'pour') {
      s = commitPour(s, out.move, out.board);
      sel = null;
    } else if (out.kind === 'select' || out.kind === 'reselect') {
      sel = out.index;
    } else if (out.kind === 'deselect') {
      sel = null;
    }
  }
  return s;
}

describe('session taps', () => {
  const base = def('4:aabb,4:bbaa,4:,4:');

  it('selects, deselects and rejects empty tubes', () => {
    const s = newSession(base);
    expect(resolveTap(s, null, 0)).toEqual({ kind: 'select', index: 0 });
    expect(resolveTap(s, 0, 0)).toEqual({ kind: 'deselect', index: 0 });
    expect(resolveTap(s, null, 2)).toEqual({ kind: 'invalid', index: 2 });
  });

  it('moves the selection to another tube when the pour is illegal', () => {
    const s = newSession(def('4:aabb,4:bbaa,4:,4:'));
    // Top of tube 0 is b, top of tube 1 is a: cannot pour, so tube 1 takes the selection.
    expect(resolveTap(s, 0, 1)).toEqual({ kind: 'reselect', from: 0, index: 1 });
  });

  it('pours, detects completion and the win', () => {
    const s0 = newSession(base);
    const first = resolveTap(s0, 0, 2);
    expect(first.kind).toBe('pour');
    if (first.kind !== 'pour') return;
    expect(first.move.count).toBe(2);
    expect(first.won).toBe(false);
    const s1 = commitPour(s0, first.move, first.board);
    const second = resolveTap(s1, 1, 0);
    expect(second.kind === 'pour' && second.completed).toBe(true);
    const s3 = play(s1, [1, 0, 1, 2]);
    expect(s3.history).toHaveLength(3);
    expect(encodeBoard(s3.board)).toBe('4:aaaa,4:,4:bbbb,4:');
  });

  it('shakes a completed tube', () => {
    const s = newSession(def('4:aaaa,4:b,4:bbb,4:'));
    expect(resolveTap(s, null, 0)).toEqual({ kind: 'invalid', index: 0 });
  });
});

describe('undo, add tube, restart', () => {
  it('undo restores the exact previous board', () => {
    const s0 = newSession(def('4:aabB,4:bbaa,4:,4:'));
    const s1 = play(s0, [0, 2]);
    expect(encodeBoard(s1.board)).not.toBe(encodeBoard(s0.board));
    const u = undoLast(s1);
    expect(u).not.toBeNull();
    expect(encodeBoard(u!.state.board)).toBe(encodeBoard(s0.board));
    expect(u!.state.history).toHaveLength(0);
    expect(u!.state.undosUsed).toBe(1);
    expect(u!.state.poursMade).toBe(1);
    expect(undoLast(s0)).toBeNull();
  });

  it('adds tubes up to the level limit at the largest capacity', () => {
    const s0 = newSession(def('4:aabb,5:bbaa,4:', 1));
    expect(canAddTube(s0)).toBe(true);
    const s1 = addTube(s0)!;
    expect(s1.board.caps).toEqual([4, 5, 4, 5]);
    expect(s1.addedTubes).toBe(1);
    expect(canAddTube(s1)).toBe(false);
    expect(addTube(s1)).toBeNull();
  });

  it('restart resets the board but keeps attempt counters', () => {
    const s0 = newSession(def('4:aabb,4:bbaa,4:,4:'));
    const s1 = { ...play(s0, [0, 2]), hintsUsed: 2 };
    const r = restartSession(s1);
    expect(encodeBoard(r.board)).toBe(encodeBoard(s0.board));
    expect(r.history).toHaveLength(0);
    expect(r.restarts).toBe(1);
    expect(r.hintsUsed).toBe(2);
  });
});
