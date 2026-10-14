import { FIXED_LEVEL_COUNT, MAX_ATTEMPTS, SOLVER_LIMITS, levelSpec } from '@/src/config/difficulty';
import { decodeBoard } from '@/src/game/codec';
import { LevelGenerator, RUNTIME_PASSES } from '@/src/game/generator';
import { hashString } from '@/src/game/prng';
import { runSliced, type SlicedTask } from '@/src/game/sliced';
import type { LevelDef } from '@/src/game/types';
import type { FixedLevelFile } from './levelFile';
import raw from './levels.fixed.json';

/**
 * Level source: 1–300 from the bundled, pre-verified JSON; 301+ generated on device,
 * deterministically from the level number, in time slices (≤ ~6 ms each).
 */
const file = raw as FixedLevelFile;

export function isEndless(level: number): boolean {
  return level > FIXED_LEVEL_COUNT;
}

export function fixedLevel(level: number): LevelDef {
  const row = file.levels[level - 1];
  if (!row || row.n !== level) throw new Error(`Missing fixed level ${level}`);
  return {
    id: `c:${level}`,
    board: decodeBoard(row.b),
    par: row.p,
    difficulty: row.d,
    hard: row.h === 1,
    maxAddTubes: row.a,
  };
}

const endlessCache = new Map<number, LevelDef>();
const endlessJobs = new Map<number, Promise<LevelDef>>();

/** Generate (or fetch from cache) endless level `level`. Rerolls with the next seed on failure. */
export function endlessLevel(level: number): Promise<LevelDef> {
  const cached = endlessCache.get(level);
  if (cached) return Promise.resolve(cached);
  const running = endlessJobs.get(level);
  if (running) return running;
  const spec = levelSpec(level);
  const job = (async () => {
    for (let salt = 0; ; salt++) {
      const gen = new LevelGenerator(spec, hashString(`level:${level}:${salt}`), {
        maxNodes: SOLVER_LIMITS.runtime,
        maxAttempts: MAX_ATTEMPTS,
        passes: RUNTIME_PASSES,
      });
      const task: SlicedTask<'done' | 'failed'> = runSliced((budget) => {
        const st = gen.step(budget);
        return st === 'running' ? null : st;
      });
      const status = await task.promise;
      if (status === 'done' && gen.result) {
        const r = gen.result;
        const def: LevelDef = {
          id: `e:${level}`,
          board: r.board,
          par: r.par,
          difficulty: r.difficulty,
          hard: spec.hard,
          maxAddTubes: spec.maxAddTubes,
        };
        endlessCache.set(level, def);
        endlessJobs.delete(level);
        return def;
      }
    }
  })();
  endlessJobs.set(level, job);
  return job;
}

/** Warm the cache for the next endless level in the background. */
export function pregenerate(level: number): void {
  if (isEndless(level) && !endlessCache.has(level)) void endlessLevel(level).catch(() => undefined);
}

export function getLevel(level: number): LevelDef | Promise<LevelDef> {
  return isEndless(level) ? (endlessCache.get(level) ?? endlessLevel(level)) : fixedLevel(level);
}
