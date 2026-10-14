import { isEndless } from '@/src/data/levels';
import { decodeBoard, encodeBoard } from '@/src/game/codec';
import { applyPour } from '@/src/game/rules';
import { addTube, commitPour, newSession, type SessionState } from '@/src/game/session';
import type { LevelDef } from '@/src/game/types';
import type { ResumeState } from './saveData';

/** Converting an in-progress level to and from its saved form (pure; unit-tested). */

export function sessionToResume(s: SessionState, level: number, elapsedMs: number): ResumeState {
  return {
    mode: isEndless(level) ? 'endless' : 'campaign',
    level,
    board: encodeBoard(s.def.board),
    par: s.def.par,
    difficulty: s.def.difficulty,
    hard: s.def.hard,
    maxAddTubes: s.def.maxAddTubes,
    history: s.history.slice(),
    addedTubes: s.addedTubes,
    hintsUsed: s.hintsUsed,
    undosUsed: s.undosUsed,
    restarts: s.restarts,
    poursMade: s.poursMade,
    elapsedMs,
  };
}

/** Rebuild a session from a saved resume by replaying its moves. Returns null if anything is inconsistent. */
export function sessionFromResume(r: ResumeState, expected: LevelDef | null): SessionState | null {
  try {
    if (expected && encodeBoard(expected.board) !== r.board) return null;
    const def: LevelDef = expected ?? {
      id: `${r.mode === 'endless' ? 'e' : 'c'}:${r.level}`,
      board: decodeBoard(r.board),
      par: r.par,
      difficulty: r.difficulty,
      hard: r.hard,
      maxAddTubes: r.maxAddTubes,
    };
    let s = newSession(def);
    for (let i = 0; i < r.addedTubes; i++) {
      const next = addTube(s);
      if (!next) return null;
      s = next;
    }
    for (const m of r.history) {
      const out = applyPour(s.board, m.from, m.to, s.totals);
      if (!out || out.move.count !== m.count || out.move.color !== m.color) return null;
      s = commitPour(s, out.move, out.board);
    }
    return { ...s, hintsUsed: r.hintsUsed, undosUsed: r.undosUsed, restarts: r.restarts, poursMade: Math.max(r.poursMade, s.poursMade) };
  } catch {
    return null;
  }
}
