import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { create } from 'zustand';
import { AD_RULES } from '@/src/config/ads';
import { createAdMobProvider } from './admob';
import { mockProvider } from './mock';
import { canShowAppOpen, canShowInterstitial, freshClock, isAppOpenStale } from './policy';
import type { AdProvider } from './provider';

/**
 * The one entry point the game uses for ads. Picks the backend once:
 *  - Expo Go / web → labelled mock ads (the AdMob native SDK is not available there)
 *  - installed Android build → AdMob (or no ads at all if the native module is missing)
 * Pacing rules live in policy.ts; this module only tracks the clock and the busy gate.
 */

const noneProvider: AdProvider = {
  name: 'none',
  init: () => Promise.resolve(),
  isReady: () => false,
  show: () => Promise.resolve({ shown: false, rewarded: false }),
  discard: () => undefined,
  loadedAt: () => 0,
  renderBanner: null,
  privacyOptionsRequired: () => false,
  showPrivacyOptions: () => Promise.resolve(),
};

function pickProvider(): AdProvider {
  const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (expoGo || Platform.OS === 'web') return mockProvider;
  return createAdMobProvider() ?? noneProvider;
}

let provider: AdProvider | null = null;
const getProvider = (): AdProvider => (provider ??= pickProvider());

const clock = freshClock();
let session = 1;
let modals = 0;
let pourActive = false;
let fullscreenShowing = false;

/** UI-facing state: banners render once the SDK is ready. */
export const useAdState = create<{ ready: boolean; privacyRequired: boolean; fullscreen: boolean }>(() => ({
  ready: false,
  privacyRequired: false,
  fullscreen: false,
}));

const SESSION_KEY = 'pourfect.ads.v1';

async function bumpSession(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    const prev = raw ? Number.parseInt(raw, 10) : 0;
    session = (Number.isFinite(prev) ? prev : 0) + 1;
    await AsyncStorage.setItem(SESSION_KEY, String(session));
  } catch {
    session = 1;
  }
}

let initStarted = false;
/** Call once after the save is loaded. Never throws; the game runs fine without ads. */
export async function initAds(): Promise<void> {
  if (initStarted) return;
  initStarted = true;
  await bumpSession();
  const p = getProvider();
  await p.init();
  useAdState.setState({ ready: p.name !== 'none', privacyRequired: p.privacyOptionsRequired() });
}

export const adProviderName = (): AdProvider['name'] => getProvider().name;
export const getBannerRenderer = () => getProvider().renderBanner;

/** Sheets/modals register here so app-open ads never cover them. */
export function noteModal(open: boolean): void {
  modals = Math.max(0, modals + (open ? 1 : -1));
}
export function notePour(active: boolean): void {
  pourActive = active;
}

/** Count a completed level toward the interstitial cadence. */
export function noteLevelComplete(): void {
  clock.levelsSinceInterstitial += 1;
}

async function showFullscreen(kind: 'interstitial' | 'appOpen' | 'rewarded', maxWaitMs: number) {
  fullscreenShowing = true;
  useAdState.setState({ fullscreen: true });
  try {
    return await getProvider().show(kind, maxWaitMs);
  } finally {
    fullscreenShowing = false;
    useAdState.setState({ fullscreen: false });
    clock.lastFullscreenAt = Date.now();
  }
}

/** Called when the player taps Next on the win card. Resolves when it's safe to navigate. */
export async function showInterstitialIfEligible(completedLevel: number): Promise<void> {
  if (fullscreenShowing) return;
  const p = getProvider();
  if (!canShowInterstitial(clock, Date.now(), completedLevel) || !p.isReady('interstitial')) return;
  const res = await showFullscreen('interstitial', 0);
  if (res.shown) clock.levelsSinceInterstitial = 0;
}

export type RewardedOutcome = 'rewarded' | 'skipped' | 'unavailable';

/** Rewarded video, waiting briefly for one to load. */
export async function showRewardedAd(): Promise<RewardedOutcome> {
  if (fullscreenShowing) return 'unavailable';
  const res = await showFullscreen('rewarded', AD_RULES.rewarded.maxWaitMs);
  if (!res.shown) return 'unavailable';
  if (!res.rewarded) return 'skipped';
  clock.lastRewardedAt = Date.now();
  return 'rewarded';
}

/** Called when the app returns to the foreground. */
export async function maybeShowAppOpen(backgroundMs: number, level: number): Promise<void> {
  if (fullscreenShowing) return;
  const p = getProvider();
  const now = Date.now();
  if (!canShowAppOpen(clock, now, { backgroundMs, level, session, busy: modals > 0 || pourActive })) return;
  if (!p.isReady('appOpen')) return;
  if (isAppOpenStale(p.loadedAt('appOpen'), now)) {
    p.discard('appOpen');
    return;
  }
  await showFullscreen('appOpen', 0);
}

export const isFullscreenAdShowing = (): boolean => fullscreenShowing;

export async function showPrivacyOptions(): Promise<void> {
  await getProvider().showPrivacyOptions();
}
