import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { en } from '@/src/i18n/en';
import { isEndless } from '@/src/data/levels';
import { Backdrop } from '@/src/render/Backdrop';
import { exitApp, onHardwareBack } from '@/src/services/backButton';
import { HeroTubes } from '@/src/render/HeroTubes';
import { usePrefs } from '@/src/state/usePrefs';
import { useSaveStore } from '@/src/state/useSaveStore';
import { Button, IconButton } from '@/src/ui/Button';
import { CurrencyChip } from '@/src/ui/bits';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, space } from '@/src/ui/theme';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const wallet = useSaveStore((s) => s.save.wallet);
  const current = useSaveStore((s) => s.save.progress.current);
  const loadSource = useSaveStore((s) => s.loadSource);
  const clearLoadNotice = useSaveStore((s) => s.clearLoadNotice);
  const [exitOpen, setExitOpen] = useState(false);

  // Android back on Home asks before leaving the app.
  useFocusEffect(
    useCallback(() => {
      return onHardwareBack(() => {
        setExitOpen(true);
        return true;
      });
    }, []),
  );

  const notice = loadSource === 'backup' ? en.home.saveRestored : loadSource === 'reset' ? en.home.saveReset : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom + space(2) }]}>
      <Backdrop lowGfx={prefs.lowGfx} />
      <View style={styles.topBar}>
        <View style={styles.chips}>
          <CurrencyChip kind="coins" amount={wallet.coins} />
          <CurrencyChip kind="gems" amount={wallet.gems} />
        </View>
        <IconButton icon="settings-sharp" label={en.home.settings} onPress={() => router.push('/settings')} testID="home-settings" />
      </View>

      <View style={styles.hero}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <HeroTubes shades={prefs.shades} colorBlind={prefs.colorBlind} lowGfx={prefs.lowGfx} />
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(120).duration(500)} style={styles.title} accessibilityRole="header">
          Pourfect
        </Animated.Text>
        <Text style={styles.tagline}>{en.home.tagline}</Text>
      </View>

      <View style={styles.actions}>
        <Text style={styles.levelLabel}>
          {en.home.level(current)}
          {isEndless(current) ? ` · ${en.game.endless}` : ''}
        </Text>
        <Button
          label={en.home.play}
          icon="play"
          size="lg"
          onPress={() => router.push({ pathname: '/game', params: { level: String(current) } })}
          style={styles.play}
          testID="home-play"
        />
        <Button
          label={en.home.levels}
          icon="grid"
          variant="secondary"
          onPress={() => router.push('/levels')}
          style={styles.secondary}
          testID="home-levels"
        />
      </View>

      <Sheet visible={exitOpen} title={en.home.exitTitle} subtitle={en.home.exitBody} onDismiss={() => setExitOpen(false)}>
        <Button label={en.home.exit} variant="danger" onPress={exitApp} />
        <Button label={en.common.cancel} variant="secondary" onPress={() => setExitOpen(false)} />
      </Sheet>
      <Sheet visible={notice !== null} subtitle={notice ?? undefined} onDismiss={clearLoadNotice}>
        <Button label={en.common.ok} onPress={clearLoadNotice} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: space(2) },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chips: { flexDirection: 'row', gap: space(1) },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: {
    fontFamily: fonts.bold,
    fontSize: 56,
    lineHeight: 64,
    color: colors.text,
    marginTop: space(2),
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,122,102,0.45)',
    textShadowRadius: 18,
  },
  tagline: { fontFamily: fonts.medium, fontSize: 17, color: colors.textMuted, marginTop: space(0.5) },
  actions: { alignItems: 'stretch', paddingHorizontal: space(2), paddingBottom: space(2) },
  levelLabel: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textMuted, textAlign: 'center', marginBottom: space(1) },
  play: { alignSelf: 'stretch' },
  secondary: { marginTop: space(1.5), alignSelf: 'stretch' },
});
