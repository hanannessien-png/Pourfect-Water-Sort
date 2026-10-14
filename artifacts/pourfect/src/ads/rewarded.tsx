import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { en } from '@/src/i18n/en';
import { Button, IconButton } from '@/src/ui/Button';
import { colors, fonts, radius, space } from '@/src/ui/theme';

/**
 * Rewarded-video provider. This is the mock used until real ad unit IDs are supplied:
 * a clearly labelled full-screen "test ad" with a countdown. Same contract as the real
 * provider: resolves true only when the player watched to the end and claimed.
 */
const MOCK_SECONDS = 4;

interface AdState {
  pending: { id: number; resolve: (ok: boolean) => void } | null;
}
const useAdStore = create<AdState>(() => ({ pending: null }));
let seq = 0;

export function showRewarded(): Promise<boolean> {
  const prev = useAdStore.getState().pending;
  if (prev) prev.resolve(false);
  return new Promise<boolean>((resolve) => {
    useAdStore.setState({ pending: { id: ++seq, resolve } });
  });
}

function finish(ok: boolean) {
  const p = useAdStore.getState().pending;
  if (!p) return;
  useAdStore.setState({ pending: null });
  p.resolve(ok);
}

/** Mount once at the root. Renders above every sheet. */
export function RewardedHost() {
  const pending = useAdStore((s) => s.pending);
  return (
    <Modal visible={pending !== null} transparent={false} animationType="fade" statusBarTranslucent onRequestClose={() => finish(false)}>
      {pending && <MockAd key={pending.id} />}
    </Modal>
  );
}

function MockAd() {
  const [left, setLeft] = useState(MOCK_SECONDS);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(1, { duration: MOCK_SECONDS * 1000, easing: Easing.linear }));
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const done = left <= 0;
  return (
    <LinearGradient colors={['#1B0F3A', '#0B0720']} style={styles.root} testID="mock-ad">
      <View style={styles.top}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{en.ads.testAd}</Text>
        </View>
        {done ? (
          <IconButton icon="close" label={en.common.close} size={44} variant="ruby" onPress={() => finish(false)} />
        ) : (
          <View style={styles.countdown}>
            <Text style={styles.countdownText}>{left}</Text>
          </View>
        )}
      </View>
      <View style={styles.center}>
        <Ionicons name="play-circle" size={110} color={colors.gold} />
        <Text style={styles.title}>{en.ads.title}</Text>
        <Text style={styles.body}>{en.ads.body}</Text>
      </View>
      <View style={styles.bottom}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, bar]} />
        </View>
        <Button
          label={done ? en.ads.claim : en.ads.wait(left)}
          variant="emerald"
          size="lg"
          icon={done ? 'gift' : 'time'}
          disabled={!done}
          onPress={() => finish(true)}
          testID="mock-ad-claim"
        />
        {!done && <Button label={en.ads.skip} variant="ghost" size="sm" onPress={() => finish(false)} />}
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
});
