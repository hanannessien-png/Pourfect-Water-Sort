/**
 * Validates src/data/levels.fixed.json:
 *   pnpm --filter @workspace/pourfect run levels:validate
 * Checks format, limits, the "no tube starts sorted" rule, and re-verifies every board
 * with the solver (and that the stored par is not beaten by a quick re-solve).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FIXED_LEVEL_COUNT, levelSpec } from '../src/config/difficulty';
import { canonicalKey, decodeBoard } from '../src/game/codec';
import { hasSortedTube } from '../src/game/generator';
import { colorTotals, colorsPresent, isWon } from '../src/game/rules';
import { solve } from '../src/game/solver';
import { MAX_CAPACITY, MAX_COLORS, MAX_LAYERS, MAX_TUBES } from '../src/game/types';
import type { FixedLevelFile } from '../src/data/levelFile';

const file = JSON.parse(readFileSync(resolve(__dirname, '../src/data/levels.fixed.json'), 'utf8')) as FixedLevelFile;
const errors: string[] = [];
const fail = (n: number, msg: string): void => {
  errors.push(`L${n}: ${msg}`);
};
const seen = new Map<string, number>();

if (file.version !== 1) errors.push(`Unknown version ${String(file.version)}`);
if (file.levels.length !== FIXED_LEVEL_COUNT) errors.push(`Expected ${FIXED_LEVEL_COUNT} levels, found ${file.levels.length}`);

file.levels.forEach((row, i) => {
  const n = row.n;
  if (n !== i + 1) fail(n, `out of order (index ${i})`);
  let board;
  try {
    board = decodeBoard(row.b);
  } catch (e) {
    fail(n, `decode error ${(e as Error).message}`);
    return;
  }
  const key = canonicalKey(board.caps, board.tubes, false);
  const dup = seen.get(key);
  if (dup !== undefined) fail(n, `duplicate of level ${dup}`);
  seen.set(key, n);
  const totals = colorTotals(board);
  const { band } = levelSpec(n);
  if (row.d < band[0] || row.d > band[1]) fail(n, `difficulty ${row.d} outside band ${band.join('-')}`);
  const layers = board.tubes.reduce((s, t) => s + t.length, 0);
  if (board.tubes.length > MAX_TUBES) fail(n, `too many tubes (${board.tubes.length})`);
  if (layers > MAX_LAYERS) fail(n, `too many layers (${layers})`);
  if (colorsPresent(totals) > MAX_COLORS) fail(n, 'too many colours');
  if (board.caps.some((c) => c > MAX_CAPACITY)) fail(n, 'capacity too large');
  if (board.tubes.some((t) => t.length > 0 && t.charCodeAt(t.length - 1) < 97)) fail(n, 'hidden top layer');
  if (hasSortedTube(board)) fail(n, 'a tube starts sorted');
  if (isWon(board, totals)) fail(n, 'already solved');
  const spec = levelSpec(n);
  if (spec.hard !== (row.h === 1)) fail(n, 'hard flag mismatch');
  if (row.p < 1) fail(n, 'bad par');
  const r = solve(board, { weight: 3, maxNodes: 400_000 });
  if (r.status !== 'solved' || !r.moves) fail(n, `not verified solvable (${r.status})`);
  else if (r.moves.length < row.p) fail(n, `par ${row.p} beaten by quick solve (${r.moves.length})`);
});

if (errors.length > 0) {
  console.error(`✗ ${errors.length} problem(s):\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`✓ ${file.levels.length} levels valid and solver-verified`);
