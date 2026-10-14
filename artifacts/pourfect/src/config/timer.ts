/**
 * Level countdown timer. The limit scales with the level's par (solver move count), so
 * bigger boards get more time. The clock pauses whenever a sheet is open, the screen is
 * not focused or the app is in the background.
 */
export const TIMER = {
  /** Seconds every level gets before par is counted. */
  baseSec: 25,
  /** Seconds per par move. */
  perParMoveSec: 4.5,
  minSec: 45,
  maxSec: 420,
  /** Hard levels get extra time. */
  hardMultiplier: 1.25,
  /** Seconds added by watching a video on the "Time's up" sheet. */
  extraSec: 60,
  /** Countdown turns red at or below this many seconds. */
  warnSec: 10,
} as const;

/** Time limit for a level in milliseconds. */
export function timeLimitMs(par: number, hard: boolean): number {
  const raw = TIMER.baseSec + par * TIMER.perParMoveSec;
  const rounded = Math.round(raw / 5) * 5;
  const clamped = Math.min(TIMER.maxSec, Math.max(TIMER.minSec, rounded));
  const sec = hard ? Math.round((clamped * TIMER.hardMultiplier) / 5) * 5 : clamped;
  return sec * 1000;
}

/** "m:ss" for a remaining time in milliseconds (rounded up to whole seconds). */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
