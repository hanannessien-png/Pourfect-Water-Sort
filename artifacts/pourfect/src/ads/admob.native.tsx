import React from 'react';
import { ADMOB, USE_TEST_ADS } from '@/src/config/ads';
import { retryDelay } from './policy';
import { NO_SHOW, type AdProvider, type BannerProps, type FullscreenKind, type ShowResult } from './provider';

type Lib = typeof import('react-native-google-mobile-ads');
type FullscreenAd = ReturnType<Lib['InterstitialAd']['createForAdRequest']> | ReturnType<Lib['RewardedAd']['createForAdRequest']> | ReturnType<Lib['AppOpenAd']['createForAdRequest']>;

/**
 * Real AdMob provider (installed builds only). The native module is loaded with a guarded
 * require so a missing module can never crash the app — the caller then runs without ads.
 */
export function createAdMobProvider(): AdProvider | null {
  let lib: Lib;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    lib = require('react-native-google-mobile-ads') as Lib;
  } catch (e) {
    console.warn('AdMob unavailable', e);
    return null;
  }
  const { AdsConsent, AdsConsentPrivacyOptionsRequirementStatus, MaxAdContentRating, InterstitialAd, RewardedAd, AppOpenAd, AdEventType, RewardedAdEventType, BannerAd, BannerAdSize, TestIds } = lib;
  const mobileAds = lib.default;

  const unit = {
    banner: USE_TEST_ADS ? TestIds.ADAPTIVE_BANNER : ADMOB.units.banner,
    interstitial: USE_TEST_ADS ? TestIds.INTERSTITIAL : ADMOB.units.interstitial,
    appOpen: USE_TEST_ADS ? TestIds.APP_OPEN : ADMOB.units.appOpen,
    rewarded: USE_TEST_ADS ? TestIds.REWARDED : ADMOB.units.rewarded,
  };

  let enabled = false;
  let privacyRequired = false;

  interface Slot {
    ad: FullscreenAd | null;
    offs: (() => void)[];
    loaded: boolean;
    loading: boolean;
    loadedAt: number;
    attempt: number;
    timer: ReturnType<typeof setTimeout> | null;
    showing: boolean;
  }
  const slots: Record<FullscreenKind, Slot> = {
    interstitial: { ad: null, offs: [], loaded: false, loading: false, loadedAt: 0, attempt: 0, timer: null, showing: false },
    appOpen: { ad: null, offs: [], loaded: false, loading: false, loadedAt: 0, attempt: 0, timer: null, showing: false },
    rewarded: { ad: null, offs: [], loaded: false, loading: false, loadedAt: 0, attempt: 0, timer: null, showing: false },
  };

  type Listen = (type: string, listener: () => void) => () => void;
  const listen = (ad: FullscreenAd, type: string, fn: () => void): (() => void) =>
    (ad.addAdEventListener.bind(ad) as unknown as Listen)(type, fn);

  const create = (kind: FullscreenKind): FullscreenAd =>
    kind === 'interstitial'
      ? InterstitialAd.createForAdRequest(unit.interstitial)
      : kind === 'rewarded'
        ? RewardedAd.createForAdRequest(unit.rewarded)
        : AppOpenAd.createForAdRequest(unit.appOpen);

  const reset = (kind: FullscreenKind) => {
    const s = slots[kind];
    s.offs.forEach((off) => off());
    s.offs = [];
    try {
      s.ad?.destroy();
    } catch {
      // already destroyed
    }
    s.ad = null;
    s.loaded = false;
    s.loading = false;
    s.loadedAt = 0;
  };

  const load = (kind: FullscreenKind) => {
    const s = slots[kind];
    if (!enabled || s.loading || s.loaded || s.showing) return;
    if (s.timer) {
      clearTimeout(s.timer);
      s.timer = null;
    }
    reset(kind);
    s.loading = true;
    const ad = create(kind);
    s.ad = ad;
    const loadedEvent = kind === 'rewarded' ? RewardedAdEventType.LOADED : AdEventType.LOADED;
    s.offs.push(
      listen(ad, loadedEvent, () => {
        s.loaded = true;
        s.loading = false;
        s.loadedAt = Date.now();
        s.attempt = 0;
      }),
      listen(ad, AdEventType.ERROR, () => {
        if (s.showing) return; // show-phase errors are handled by show()
        s.loading = false;
        s.loaded = false;
        const delay = retryDelay(s.attempt++);
        s.timer = setTimeout(() => {
          s.timer = null;
          load(kind);
        }, delay);
      }),
    );
    try {
      ad.load();
    } catch (e) {
      console.warn('Ad load failed', kind, e);
      s.loading = false;
    }
  };

  const waitReady = (kind: FullscreenKind, maxWaitMs: number) =>
    new Promise<boolean>((resolve) => {
      if (slots[kind].loaded) return resolve(true);
      load(kind);
      const started = Date.now();
      const iv = setInterval(() => {
        if (slots[kind].loaded) {
          clearInterval(iv);
          resolve(true);
        } else if (Date.now() - started >= maxWaitMs) {
          clearInterval(iv);
          resolve(false);
        }
      }, 100);
    });

  const show = async (kind: FullscreenKind, maxWaitMs: number): Promise<ShowResult> => {
    if (!enabled) return NO_SHOW;
    const ready = await waitReady(kind, maxWaitMs);
    const s = slots[kind];
    const ad = s.ad;
    if (!ready || !ad) return NO_SHOW;
    s.showing = true;
    return new Promise<ShowResult>((resolve) => {
      let earned = false;
      let done = false;
      const offs: (() => void)[] = [];
      const finish = (shown: boolean) => {
        if (done) return;
        done = true;
        offs.forEach((off) => off());
        s.showing = false;
        reset(kind);
        load(kind); // preload the next one straight away
        resolve({ shown, rewarded: kind === 'rewarded' && earned });
      };
      if (kind === 'rewarded') {
        offs.push(
          listen(ad, RewardedAdEventType.EARNED_REWARD, () => {
            earned = true;
          }),
        );
      }
      offs.push(
        listen(ad, AdEventType.CLOSED, () => finish(true)),
        listen(ad, AdEventType.ERROR, () => finish(false)),
      );
      ad.show().catch(() => finish(false));
    });
  };

  function renderAdMobBanner({ onHeight }: BannerProps) {
    if (!enabled) return null;
    return (
      <BannerAd
        unitId={unit.banner}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={(d) => onHeight?.(d.height)}
        onAdFailedToLoad={() => undefined}
      />
    );
  }

  return {
    name: 'admob',
    async init() {
      try {
        // UMP on every cold start: refresh consent info, show the form only if required.
        await AdsConsent.gatherConsent();
      } catch (e) {
        console.warn('Consent flow failed', e);
      }
      try {
        const info = await AdsConsent.getConsentInfo();
        privacyRequired = info.privacyOptionsRequirementStatus === AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
        if (!info.canRequestAds) return; // the game continues without ads
        await mobileAds().setRequestConfiguration({
          maxAdContentRating: MaxAdContentRating.PG,
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        });
        await mobileAds().initialize();
        enabled = true;
        load('rewarded');
        load('interstitial');
        load('appOpen');
      } catch (e) {
        console.warn('Ads init failed', e);
      }
    },
    isReady: (kind) => enabled && slots[kind].loaded,
    show,
    discard(kind) {
      reset(kind);
      load(kind);
    },
    loadedAt: (kind) => slots[kind].loadedAt,
    renderBanner: renderAdMobBanner,
    privacyOptionsRequired: () => privacyRequired,
    async showPrivacyOptions() {
      try {
        await AdsConsent.showPrivacyOptionsForm();
      } catch (e) {
        console.warn('Privacy options failed', e);
      }
    },
  };
}
