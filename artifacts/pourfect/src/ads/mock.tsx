import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { en } from '@/src/i18n/en';
import { Button, IconButton } from '@/src/ui/Button';
import { colors, fonts, radius, space } from '@/src/ui/theme';
import type { AdProvider, FullscreenKind, ShowResult } from './provider';

/**
 * Mock provider for Expo Go and the web preview, where the AdMob native SDK does not exist.
 * Clearly labelled "TEST AD" screens with a countdown, plus a "Test banner" strip, so every
 * ad flow can be tried without real ads.
 */
const SECONDS: Record<FullscreenKind, number> = { rewarded: 4, interstitial: 3, appOpen: 3 };

interface Pending {
  id: number;
  kind: FullscreenKind;
  resolve: (r: ShowResult) => void;
}
const useMockStore = create<{ pending: Pending | null }>(() => ({ pending: null }));
let seq = 0;

function finish(r: ShowResult) {
  const p = useMockStore.getState().pending;
  if (!p) return;
  useMockStore.setState({ pending: null });
  p.resolve(r);
}

function renderMockBanner() {
  return (
    <View style={styles.banner} testID="mock-banner">
      <Text style={styles.bannerText}>{en.ads.testBanner}</Text>
    </View>
  );
}

export const mockProvider: AdProvider = {
  name: 'mock',
  init: () => Promise.resolve(),
  isReady: () => true,
  show(kind) {
    const prev = useMockStore.getState().pending;
    if (prev) prev.resolve({ shown: false, rewarded: false });
    return new Promise<ShowResult>((resolve) => {
      useMockStore.setState({ pending: { id: ++seq, kind, resolve } });
    });
  },
  discard: () => undefined,
  loadedAt: () => Date.now(),
  renderBanner: renderMockBanner,
  privacyOptionsRequired: () => false,
  showPrivacyOptions: () => Promise.resolve(),
};

/** Mount once at the root. Renders the mock full-screen ads above every sheet. */
export function MockAdHost() {
  const pending = useMockStore((s) => s.pending);
  return (
    <Modal
      visible={pending !== null}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => finish({ shown: true, rewarded: false })}
    >
      {pending && <MockAd key={pending.id} kind={pending.kind} />}
    </Modal>
  );
}

function MockAd({ kind }: { kind: FullscreenKind }) {
  const total = SECONDS[kind];
  const [left, setLeft] = useState(total);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: total * 1000, easing: Easing.linear }));
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [progress, total]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const done = left <= 0;
  const rewarded = kind === 'rewarded';
  const title = rewarded ? en.ads.title : kind === 'appOpen' ? en.ads.appOpenTitle : en.ads.interstitialTitle;
  return (
    <LinearGradient colors={['#1B0F3A', '#0B0720']} style={styles.root} testID={`mock-ad-${kind}`}>
      <View style={styles.top}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{en.ads.testAd}</Text>
        </View>
        {done ? (
          <IconButton icon="close" label={en.common.close} size={44} variant="ruby" onPress={() => finish({ shown: true, rewarded: false })} testID="mock-ad-close" />
        ) : (
          <View style={styles.countdown}>
            <Text style={styles.countdownText}>{left}</Text>
          </View>
        )}
      </View>
      <View style={styles.center}>
        <Ionicons name={rewarded ? 'play-circle' : 'megaphone'} size={110} color={colors.gold} />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{en.ads.body}</Text>
      </View>
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        {rewarded && (
          <>
            <Button
              label={done ? en.ads.claim : en.ads.wait(left)}
              variant="emerald"
              size="lg"
              icon={done ? 'gift' : 'time'}
              disabled={!done}
              onPress={() => finish({ shown: true, rewarded: true })}
              testID="mock-ad-claim"
            />
            {!done && <Button label={en.ads.skip} variant="ghost" size="sm" onPress={() => finish({ shown: true, rewarded: false })} />}
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: space(3), paddingTop: space(6) },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tag: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: radius.pill, paddingHorizontal: space(1.5), paddingVertical: 4 },
  tagText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: 0.5 },
  countdown: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: { fontFamily: fonts.display, fontSize: 20, color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space(1.5) },
  title: { fontFamily: fonts.display, fontSize: 30, color: colors.text, textAlign: 'center' },
  body: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted, textAlign: 'center', maxWidth: 300 },
  bottom: { gap: space(2), paddingBottom: space(3) },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.emerald },
  banner: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  bannerText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, letterSpacing: 0.5 },
});
