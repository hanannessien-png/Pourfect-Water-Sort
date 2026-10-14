import { fixedLevel } from '@/src/data/levels';
import { decodeBoard, encodeBoard } from '@/src/game/codec';
import { applyPour, legalPours } from '@/src/game/rules';
import { addTube, commitPour, newSession, type SessionState } from '@/src/game/session';
import { sessionFromResume, sessionToResume } from '../resume';
import { sanitizeSave, defaultSave } from '../saveData';

function playMoves(s: SessionState, n: number): SessionState {
  for (let i = 0; i < n; i++) {
    const m = legalPours(s.board, s.totals)[0];
    if (!m) break;
    const r = applyPour(s.board, m.from, m.to, s.totals)!;
    s = commitPour(s, r.move, r.board);
  }
  return s;
}

/** Simulate a save round-trip through JSON + sanitize. */
const throughSave = (r: ReturnType<typeof sessionToResume>) =>
  sanitizeSave(JSON.parse(JSON.stringify({ ...defaultSave(0), resume: r })) as Record<string, unknown>, 0).resume!;

describe('resume', () => {
  it('round-trips a campaign level with moves and an added tube', () => {
    const def = fixedLevel(12);
    let s = newSession(def);
    s = addTube(s) ?? s;
    s = playMoves(s, 3);
    s = { ...s, hintsUsed: 1, restarts: 2 };
    const saved = throughSave(sessionToResume(s, 12, 4567));
    expect(saved.mode).toBe('campaign');
    expect(saved.elapsedMs).toBe(4567);
    const back = sessionFromResume(saved, def);
    expect(back).not.toBeNull();
    expect(encodeBoard(back!.board)).toBe(encodeBoard(s.board));
    expect(back!.history).toEqual(s.history);
    expect(back!.addedTubes).toBe(s.addedTubes);
    expect(back!.hintsUsed).toBe(1);
    expect(back!.restarts).toBe(2);
  });

  it('rejects a resume whose board no longer matches the level', () => {
    const s = playMoves(newSession(fixedLevel(12)), 1);
    const saved = throughSave(sessionToResume(s, 12, 0));
    expect(sessionFromResume(saved, fixedLevel(13))).toBeNull();
  });

  it('rejects a resume with an impossible move', () => {
    const s = playMoves(newSession(fixedLevel(20)), 2);
    const saved = throughSave(sessionToResume(s, 20, 0));
    const bad = { ...saved, history: [...saved.history, { from: 0, to: 0, count: 3, color: 1, srcReveal: 0, tgtReveal: 0 }] };
    expect(sessionFromResume(bad, fixedLevel(20))).toBeNull();
  });

  it('rebuilds an endless level from the stored board without regenerating', () => {
    const board = decodeBoard('4:aabb,4:bbaa,4:,4:');
    const def = { id: 'e:301', board, par: 3, difficulty: 50, hard: true, maxAddTubes: 2 };
    const s = playMoves(newSession(def), 1);
    const saved = throughSave(sessionToResume(s, 301, 0));
    expect(saved.mode).toBe('endless');
    const back = sessionFromResume(saved, null)!;
    expect(back.def.id).toBe('e:301');
    expect(back.def.hard).toBe(true);
    expect(back.def.maxAddTubes).toBe(2);
    expect(encodeBoard(back.board)).toBe(encodeBoard(s.board));
  });
});
