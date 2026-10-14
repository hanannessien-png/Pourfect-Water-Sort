import { AD_RULES } from '@/src/config/ads';
import { timeLimitMs, formatClock, TIMER } from '@/src/config/timer';
import { canShowAppOpen, canShowInterstitial, freshClock, isAppOpenStale, retryDelay, type AdClock } from '../policy';

const T0 = 1_800_000_000_000;
const MIN = 60_000;
const clockWith = (p: Partial<AdClock>): AdClock => ({ ...freshClock(), ...p });

describe('interstitial pacing', () => {
  const ready = clockWith({ levelsSinceInterstitial: 2 });

  it('never before level 5', () => {
    expect(canShowInterstitial(ready, T0, 4)).toBe(false);
    expect(canShowInterstitial(ready, T0, AD_RULES.interstitial.fromLevel)).toBe(true);
  });

  it('only every 2nd completed level', () => {
    expect(canShowInterstitial(clockWith({ levelsSinceInterstitial: 1 }), T0, 10)).toBe(false);
    expect(canShowInterstitial(clockWith({ levelsSinceInterstitial: 2 }), T0, 10)).toBe(true);
  });

  it('waits 90 s after any full-screen ad', () => {
    const c = clockWith({ levelsSinceInterstitial: 3, lastFullscreenAt: T0 });
    expect(canShowInterstitial(c, T0 + 89_000, 10)).toBe(false);
    expect(canShowInterstitial(c, T0 + 90_000, 10)).toBe(true);
  });

  it('skips for 3 min after a rewarded video', () => {
    const c = clockWith({ levelsSinceInterstitial: 3, lastRewardedAt: T0, lastFullscreenAt: T0 });
    expect(canShowInterstitial(c, T0 + 2 * MIN, 10)).toBe(false);
    expect(canShowInterstitial(c, T0 + 3 * MIN, 10)).toBe(true);
  });
});

describe('app-open pacing', () => {
  const ok = { backgroundMs: 2 * MIN, level: 10, session: 3, busy: false };

  it('shows when every rule passes', () => {
    expect(canShowAppOpen(freshClock(), T0, ok)).toBe(true);
  });

  it('needs at least 60 s in the background', () => {
    expect(canShowAppOpen(freshClock(), T0, { ...ok, backgroundMs: 59_000 })).toBe(false);
  });

  it('never in the first session or before level 4', () => {
    expect(canShowAppOpen(freshClock(), T0, { ...ok, session: 1 })).toBe(false);
    expect(canShowAppOpen(freshClock(), T0, { ...ok, level: 3 })).toBe(false);
  });

  it('never over a sheet or a pour', () => {
    expect(canShowAppOpen(freshClock(), T0, { ...ok, busy: true })).toBe(false);
  });

  it('waits 4 min after another full-screen ad (and ignores our own ad closing)', () => {
    const c = clockWith({ lastFullscreenAt: T0 });
    expect(canShowAppOpen(c, T0 + 1000, ok)).toBe(false);
    expect(canShowAppOpen(c, T0 + 4 * MIN - 1, ok)).toBe(false);
    expect(canShowAppOpen(c, T0 + 4 * MIN, ok)).toBe(true);
  });

  it('discards cached ads older than 4 h', () => {
    expect(isAppOpenStale(T0, T0 + 4 * 60 * MIN)).toBe(false);
    expect(isAppOpenStale(T0, T0 + 4 * 60 * MIN + 1)).toBe(true);
  });
});

describe('load retry backoff', () => {
  it('doubles from 5 s and caps at 5 min', () => {
    expect(retryDelay(0)).toBe(5000);
    expect(retryDelay(1)).toBe(10_000);
    expect(retryDelay(2)).toBe(20_000);
    expect(retryDelay(20)).toBe(5 * MIN);
  });
});

describe('level timer', () => {
  it('scales with par, rounded to 5 s and clamped', () => {
    expect(timeLimitMs(2, false)).toBe(TIMER.minSec * 1000);
    expect(timeLimitMs(14, false)).toBe(90_000);
    expect(timeLimitMs(1000, false)).toBe(TIMER.maxSec * 1000);
  });

  it('gives hard levels 25 % more time', () => {
    expect(timeLimitMs(20, true)).toBe(Math.round((115 * 1.25) / 5) * 5 * 1000);
  });

  it('formats m:ss, rounding up', () => {
    expect(formatClock(90_000)).toBe('1:30');
    expect(formatClock(9_001)).toBe('0:10');
    expect(formatClock(0)).toBe('0:00');
    expect(formatClock(-5)).toBe('0:00');
  });
});
