import { codeColor, codeHidden } from './codec';
import type { CompactBoard, Move, PourCheck, PourRef } from './types';
import { MAX_COLORS } from './types';

/**
 * Pour rules (single source of truth for game, solver and generator):
 *  - Tap source then target. The source's contiguous top run of one visible colour
 *    moves as far as the target has room.
 *  - Legal only if the target is empty or its top colour matches.
 *  - Completed tubes (holding every unit of one colour) are locked.
 *  - When a hidden layer becomes the top of a tube it is revealed.
 *  - When a tube becomes complete, any hidden layers inside it are revealed.
 *  - Win: every tube is empty or complete.
 */

/** Units of each colour on the board (hidden layers count as their true colour). */
export function colorTotals(board: CompactBoard): number[] {
  const totals = new Array<number>(MAX_COLORS).fill(0);
  for (const t of board.tubes) {
    for (let k = 0; k < t.length; k++) {
      const c = codeColor(t.charCodeAt(k));
      totals[c] = (totals[c] ?? 0) + 1;
    }
  }
  return totals;
}

export function colorsPresent(totals: readonly number[]): number {
  let n = 0;
  for (const v of totals) if (v > 0) n++;
  return n;
}

/** Top colour of a tube, or -1 if empty. The top layer is never hidden. */
export function topColor(tube: string): number {
  return tube.length === 0 ? -1 : codeColor(tube.charCodeAt(tube.length - 1));
}

/** Length of the contiguous visible same-colour run at the top. */
export function topRun(tube: string): number {
  const n = tube.length;
  if (n === 0) return 0;
  const top = tube.charCodeAt(n - 1);
  let run = 1;
  for (let k = n - 2; k >= 0; k--) {
    if (tube.charCodeAt(k) !== top) break; // hidden chars differ in case, so they stop the run
    run++;
  }
  return run;
}

/** All layers share one colour (hidden or not). */
export function isSingleColor(tube: string): boolean {
  if (tube.length === 0) return false;
  const c = codeColor(tube.charCodeAt(0));
  for (let k = 1; k < tube.length; k++) if (codeColor(tube.charCodeAt(k)) !== c) return false;
  return true;
}

export function isTubeComplete(tube: string, totals: readonly number[]): boolean {
  if (!isSingleColor(tube)) return false;
  return tube.length === totals[codeColor(tube.charCodeAt(0))];
}

export function isWon(board: CompactBoard, totals: readonly number[]): boolean {
  for (const t of board.tubes) {
    if (t.length > 0 && !isTubeComplete(t, totals)) return false;
  }
  return true;
}

export function checkPour(board: CompactBoard, from: number, to: number, totals: readonly number[]): PourCheck {
  const n = board.tubes.length;
  if (from < 0 || to < 0 || from >= n || to >= n) return { ok: false, reason: 'bad-index' };
  if (from === to) return { ok: false, reason: 'same-tube' };
  const src = board.tubes[from] as string;
  const tgt = board.tubes[to] as string;
  if (src.length === 0) return { ok: false, reason: 'source-empty' };
  if (isTubeComplete(src, totals)) return { ok: false, reason: 'source-complete' };
  const free = (board.caps[to] as number) - tgt.length;
  if (free <= 0) return { ok: false, reason: 'target-full' };
  if (tgt.length > 0 && topColor(tgt) !== topColor(src)) return { ok: false, reason: 'color-mismatch' };
  return { ok: true, count: Math.min(topRun(src), free) };
}

/** Can this tube be picked up as a source? */
export function canSelect(board: CompactBoard, index: number, totals: readonly number[]): boolean {
  const t = board.tubes[index];
  return t !== undefined && t.length > 0 && !isTubeComplete(t, totals);
}

function revealTop(tube: string): { tube: string; mask: number } {
  const n = tube.length;
  if (n === 0 || !codeHidden(tube.charCodeAt(n - 1))) return { tube, mask: 0 };
  return { tube: tube.slice(0, n - 1) + tube[n - 1]!.toLowerCase(), mask: 1 << (n - 1) };
}

function revealIfComplete(tube: string, totals: readonly number[]): { tube: string; mask: number } {
  if (!isTubeComplete(tube, totals)) return { tube, mask: 0 };
  let mask = 0;
  for (let k = 0; k < tube.length; k++) if (codeHidden(tube.charCodeAt(k))) mask |= 1 << k;
  return mask === 0 ? { tube, mask } : { tube: tube.toLowerCase(), mask };
}

/** Low-level pour on tube strings. Assumes legality was checked. */
export function pourTubes(
  src: string,
  tgt: string,
  count: number,
  totals: readonly number[],
): { src: string; tgt: string; srcReveal: number; tgtReveal: number } {
  const moved = src.slice(src.length - count);
  let s = src.slice(0, src.length - count);
  let t = tgt + moved;
  const top = revealTop(s);
  s = top.tube;
  const sc = revealIfComplete(s, totals);
  s = sc.tube;
  const tc = revealIfComplete(t, totals);
  t = tc.tube;
  return { src: s, tgt: t, srcReveal: top.mask | sc.mask, tgtReveal: tc.mask };
}

export function applyPour(
  board: CompactBoard,
  from: number,
  to: number,
  totals: readonly number[],
): { board: CompactBoard; move: Move } | null {
  const check = checkPour(board, from, to, totals);
  if (!check.ok) return null;
  const src = board.tubes[from] as string;
  const r = pourTubes(src, board.tubes[to] as string, check.count, totals);
  const tubes = board.tubes.slice();
  tubes[from] = r.src;
  tubes[to] = r.tgt;
  return {
    board: { caps: board.caps, tubes },
    move: {
      from,
      to,
      count: check.count,
      color: topColor(src),
      srcReveal: r.srcReveal,
      tgtReveal: r.tgtReveal,
    },
  };
}

function rehide(tube: string, mask: number): string {
  if (mask === 0) return tube;
  let out = '';
  for (let k = 0; k < tube.length; k++) {
    const ch = tube[k] as string;
    out += mask & (1 << k) ? ch.toUpperCase() : ch;
  }
  return out;
}

/** Reverts a pour exactly, re-hiding any layer it revealed. */
export function undoPour(board: CompactBoard, move: Move): CompactBoard {
  const tubes = board.tubes.slice();
  let tgt = rehide(tubes[move.to] as string, move.tgtReveal);
  const moved = tgt.slice(tgt.length - move.count);
  tgt = tgt.slice(0, tgt.length - move.count);
  const src = rehide(tubes[move.from] as string, move.srcReveal) + moved;
  tubes[move.to] = tgt;
  tubes[move.from] = src;
  return { caps: board.caps, tubes };
}

/** Every legal pour (unpruned), in index order. */
export function legalPours(board: CompactBoard, totals: readonly number[]): PourRef[] {
  const out: PourRef[] = [];
  const n = board.tubes.length;
  for (let from = 0; from < n; from++) {
    if (!canSelect(board, from, totals)) continue;
    for (let to = 0; to < n; to++) {
      if (checkPour(board, from, to, totals).ok) out.push({ from, to });
    }
  }
  return out;
}

/**
 * Moves that can change the position in a meaningful way. Excludes pouring a tube that
 * is a single visible run into an empty tube (it only relocates the tube).
 */
export function usefulPours(board: CompactBoard, totals: readonly number[]): PourRef[] {
  return legalPours(board, totals).filter(({ from, to }) => {
    const src = board.tubes[from] as string;
    return !((board.tubes[to] as string).length === 0 && topRun(src) === src.length);
  });
}

/** Total colour runs on the board, comparing colours only (ignores hidden flags). */
export function countRuns(tubes: readonly string[]): number {
  let runs = 0;
  for (const t of tubes) {
    if (t.length === 0) continue;
    runs++;
    let prev = codeColor(t.charCodeAt(0));
    for (let k = 1; k < t.length; k++) {
      const c = codeColor(t.charCodeAt(k));
      if (c !== prev) {
        runs++;
        prev = c;
      }
    }
  }
  return runs;
}

export function addEmptyTube(board: CompactBoard, capacity: number): CompactBoard {
  return { caps: [...board.caps, capacity], tubes: [...board.tubes, ''] };
}
