/**
 * Offline generator for the fixed campaign (levels 1–300).
 *   pnpm --filter @workspace/pourfect run levels:generate
 * Writes src/data/levels.fixed.json. Deterministic: re-running yields the same file.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { FIXED_LEVEL_COUNT, MAX_ATTEMPTS, SOLVER_LIMITS, levelSpec } from '../src/config/difficulty';
import { encodeBoard } from '../src/game/codec';
import { generateBoard, OFFLINE_PASSES } from '../src/game/generator';
import { hashString } from '../src/game/prng';
import type { FixedLevelFile, FixedLevelRow } from '../src/data/levelFile';

const out = resolve(__dirname, '../src/data/levels.fixed.json');
const rows: FixedLevelRow[] = [];
const started = Date.now();
let relaxed = 0;

for (let n = 1; n <= FIXED_LEVEL_COUNT; n++) {
  const spec = levelSpec(n);
  const t0 = Date.now();
  let result = null;
  // Re-seed on the rare failure so every level is always produced.
  for (let salt = 0; !result; salt++) {
    if (salt > 20) throw new Error(`Level ${n}: could not generate a verified board`);
    result = generateBoard(spec, hashString(`level:${n}:${salt}`), {
      maxNodes: SOLVER_LIMITS.offline,
      maxAttempts: MAX_ATTEMPTS,
      passes: OFFLINE_PASSES,
    });
  }
  if (result.relaxed) relaxed++;
  rows.push({
    n,
    b: encodeBoard(result.board),
    p: result.par,
    d: result.difficulty,
    h: spec.hard ? 1 : 0,
    a: spec.maxAddTubes,
  });
  console.log(
    `L${n} colors=${spec.colorCaps.length} par=${result.par} diff=${result.difficulty} band=${spec.band.join('-')}` +
      `${result.relaxed ? ' RELAXED' : ''} attempts=${result.attempts} ${Date.now() - t0}ms`,
  );
}

const file: FixedLevelFile = { version: 1, count: rows.length, levels: rows };
writeFileSync(out, `${JSON.stringify(file, null, 0)}\n`);
console.log(`Wrote ${rows.length} levels to ${out} in ${((Date.now() - started) / 1000).toFixed(1)}s (relaxed: ${relaxed})`);
