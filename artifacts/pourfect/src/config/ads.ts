/**
 * AdMob configuration. IDs supplied by the owner. Every pacing rule is a constant here and is
 * covered by unit tests (src/ads/__tests__/policy.test.ts).
 */

declare const __DEV__: boolean | undefined;

export const ADMOB = {
  /** Android app id — also set in app.json (react-native-google-mobile-ads plugin). Keep both in sync. */
  androidAppId: 'ca-app-pub-6225158226956884~8782715365',
  units: {
    banner: 'ca-app-pub-6225158226956884/3900344764',
    interstitial: 'ca-app-pub-6225158226956884/3616264573',
    appOpen: 'ca-app-pub-6225158226956884/1039956717',
    rewarded: 'ca-app-pub-6225158226956884/8726875047',
  },
} as const;

/**
 * Debug builds request Google's test ads instead of the live units, so the owner never sees
 * or taps their own live ads while testing (that can get an AdMob account suspended).
 * Release builds (EAS production / preview) use the live units above.
 */
export const USE_TEST_ADS = typeof __DEV__ !== 'undefined' && __DEV__ === true;

const SEC = 1000;
const MIN = 60 * SEC;

export const AD_RULES = {
  banner: {
    /** Banner hidden in the game on these first levels. */
    hiddenThroughLevel: 2,
  },
  appOpen: {
    /** Only after the app was in the background at least this long. */
    minBackgroundMs: 60 * SEC,
    /** At least this long since any other full-screen ad. */
    minGapMs: 4 * MIN,
    /** Never before the player reaches this level. */
    minLevel: 4,
    /** Never in the first session. */
    minSession: 2,
    /** Discard a cached app-open ad older than this. */
    maxAgeMs: 4 * 60 * MIN,
    /** Foreground events within this window after our own full-screen ad closes are ignored. */
    ownAdGraceMs: 3 * SEC,
  },
  interstitial: {
    /** First level whose completion may be followed by an interstitial. */
    fromLevel: 5,
    /** Show on every Nth completed level. */
    everyNLevels: 2,
    /** At least this long since the last full-screen ad. */
    minGapMs: 90 * SEC,
    /** Skip if a rewarded ad was watched this recently. */
    skipAfterRewardedMs: 3 * MIN,
  },
  rewarded: {
    /** Longest the game waits for a rewarded ad to load before saying none is available. */
    maxWaitMs: 2 * SEC,
  },
  retry: {
    baseMs: 5 * SEC,
    capMs: 5 * MIN,
  },
} as const;
