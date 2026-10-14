import type React from 'react';

export type FullscreenKind = 'interstitial' | 'appOpen' | 'rewarded';

export interface ShowResult {
  /** An ad was actually displayed. */
  shown: boolean;
  /** Rewarded only: the SDK reported the reward as earned. */
  rewarded: boolean;
}

export interface BannerProps {
  /** Called with the real banner height once it loads (to grow the reserved slot if needed). */
  onHeight?: (h: number) => void;
}

/** One ad backend: AdMob in installed builds, the labelled mock in Expo Go / web. */
export interface AdProvider {
  readonly name: 'admob' | 'mock' | 'none';
  /** Consent (UMP) → request configuration → SDK init → preload. Never throws. */
  init(): Promise<void>;
  isReady(kind: FullscreenKind): boolean;
  /** Shows an ad if one is (or becomes, within maxWaitMs) ready; resolves when it closes. */
  show(kind: FullscreenKind, maxWaitMs: number): Promise<ShowResult>;
  /** Drop a cached ad (e.g. a stale app-open ad) and load a fresh one. */
  discard(kind: FullscreenKind): void;
  /** Age-checking helper for app-open: when the cached ad finished loading (0 = none). */
  loadedAt(kind: FullscreenKind): number;
  /** Renders the banner (plain function, no hooks). Null when this backend has no banners. */
  renderBanner: ((props: BannerProps) => React.ReactNode) | null;
  privacyOptionsRequired(): boolean;
  showPrivacyOptions(): Promise<void>;
}

export const NO_SHOW: ShowResult = { shown: false, rewarded: false };
