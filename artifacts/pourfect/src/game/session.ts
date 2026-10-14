import { addEmptyTube, applyPour, canSelect, checkPour, colorTotals, isTubeComplete, isWon, undoPour } from './rules';
import type { CompactBoard, LevelDef, Move } from './types';

/**
 * Pure in-level session logic (selection, pours, undo, add tube). The React layer keeps
 * a SessionState in a store and calls these functions; nothing here touches React.
 */

export interface SessionState {
  readonly def: LevelDef;
  readonly board: CompactBoard;
  readonly totals: readonly number[];
  /** Pours kept (undo removes the last one). Moves for stars = history.length. */
  readonly history: readonly Move[];
  readonly addedTubes: number;
  readonly hintsUsed: number;
  readonly undosUsed: number;
  readonly restarts: number;
  /** Total pours ever made on this level, including undone ones (stats/quests). */
  readonly poursMade: number;
}

export function newSession(def: LevelDef): SessionState {
  return {
    def,
    board: def.board,
    totals: colorTotals(def.board),
    history: [],
    addedTubes: 0,
    hintsUsed: 0,
    undosUsed: 0,
    restarts: 0,
    poursMade: 0,
  };
}

export type TapOutcome =
  | { kind: 'select'; index: number }
  | { kind: 'deselect'; index: number }
  | { kind: 'reselect'; from: number; index: number }
  | { kind: 'invalid'; index: number }
  | { kind: 'pour'; move: Move; board: CompactBoard; completed: boolean; won: boolean };

/**
 * Tap rules:
 *  - nothing selected: select a pickable tube; an empty or completed tube shakes.
 *  - tap the selected tube again: cancel.
 *  - legal pour: pour.
 *  - a different non-empty tube that cannot receive the pour takes the selection
 *    (unless it is completed, which shakes).
 */
export function resolveTap(s: SessionState, selected: number | null, index: number): TapOutcome {
  const { board, totals } = s;
  if (selected === null) {
    return canSelect(board, index, totals) ? { kind: 'select', index } : { kind: 'invalid', index };
  }
  if (selected === index) return { kind: 'deselect', index };
  const check = checkPour(board, selected, index, totals);
  if (check.ok) {
    const r = applyPour(board, selected, index, totals);
    if (r) {
      return {
        kind: 'pour',
        move: r.move,
        board: r.board,
        completed: isTubeComplete(r.board.tubes[index] as string, totals),
        won: isWon(r.board, totals),
      };
    }
  }
  if (canSelect(board, index, totals)) return { kind: 'reselect', from: selected, index };
  return { kind: 'invalid', index };
}

export function commitPour(s: SessionState, move: Move, board: CompactBoard): SessionState {
  return { ...s, board, history: [...s.history, move], poursMade: s.poursMade + 1 };
}

export function undoLast(s: SessionState): { state: SessionState; move: Move } | null {
  const move = s.history[s.history.length - 1];
  if (!move) return null;
  return {
    state: { ...s, board: undoPour(s.board, move), history: s.history.slice(0, -1), undosUsed: s.undosUsed + 1 },
    move,
  };
}

/** Standard capacity for Add Tube: the largest capacity on the level. */
export function standardCapacity(def: LevelDef): number {
  return Math.max(...def.board.caps);
}

export function canAddTube(s: SessionState): boolean {
  return s.addedTubes < s.def.maxAddTubes && !isWon(s.board, s.totals);
}

export function addTube(s: SessionState): SessionState | null {
  if (!canAddTube(s)) return null;
  return { ...s, board: addEmptyTube(s.board, standardCapacity(s.def)), addedTubes: s.addedTubes + 1 };
}

/** Restart keeps counters that span attempts (restarts, hints used). */
export function restartSession(s: SessionState): SessionState {
  return { ...newSession(s.def), restarts: s.restarts + 1, hintsUsed: s.hintsUsed, undosUsed: s.undosUsed };
}

export function isSessionWon(s: SessionState): boolean {
  return isWon(s.board, s.totals);
}
