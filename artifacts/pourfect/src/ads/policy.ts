import { AD_RULES } from '@/src/config/ads';

/** Pure pacing rules for full-screen ads. All times are epoch milliseconds. */

export interface AdClock {
  /** When the last full-screen ad (any format) closed. 0 = never. */
  lastFullscreenAt: number;
  /** When the last rewarded ad was watched. 0 = never. */
  lastRewardedAt: number;
  /** Levels completed since the last interstitial (or since launch). */
  levelsSinceInterstitial: number;
}

export const freshClock = (): AdClock => ({ lastFullscreenAt: 0, lastRewardedAt: 0, levelsSinceInterstitial: 0 });

export function canShowInterstitial(clock: AdClock, now: number, completedLevel: number): boolean {
  const r = AD_RULES.interstitial;
  if (completedLevel < r.fromLevel) return false;
  if (clock.levelsSinceInterstitial < r.everyNLevels) return false;
  if (clock.lastFullscreenAt > 0 && now - clock.lastFullscreenAt < r.minGapMs) return false;
  if (clock.lastRewardedAt > 0 && now - clock.lastRewardedAt < r.skipAfterRewardedMs) return false;
  return true;
}

export interface AppOpenContext {
  /** How long the app was in the background. */
  backgroundMs: number;
  /** Highest unlocked level. */
  level: number;
  /** 1-based launch count. */
  session: number;
  /** A modal/sheet is open or a pour is animating. */
  busy: boolean;
}

export function canShowAppOpen(clock: AdClock, now: number, ctx: AppOpenContext): boolean {
  const r = AD_RULES.appOpen;
  if (ctx.busy) return false;
  if (ctx.session < r.minSession) return false;
  if (ctx.level < r.minLevel) return false;
  if (ctx.backgroundMs < r.minBackgroundMs) return false;
  // Returning from our own full-screen ad looks like a foreground event; ignore it.
  if (clock.lastFullscreenAt > 0 && now - clock.lastFullscreenAt < r.ownAdGraceMs) return false;
  if (clock.lastFullscreenAt > 0 && now - clock.lastFullscreenAt < r.minGapMs) return false;
  return true;
}

export function isAppOpenStale(loadedAt: number, now: number): boolean {
  return now - loadedAt > AD_RULES.appOpen.maxAgeMs;
}

/** Exponential backoff for failed loads: 5 s, 10 s, 20 s … capped at 5 min. */
export function retryDelay(attempt: number): number {
  const r = AD_RULES.retry;
  return Math.min(r.capMs, r.baseMs * 2 ** Math.max(0, attempt));
}
