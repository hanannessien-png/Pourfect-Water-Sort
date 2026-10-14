import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import Animated, { FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { REWARDS } from '@/src/config/cosmetics';
import { en } from '@/src/i18n/en';
import { isEndless } from '@/src/data/levels';
import { Backdrop } from '@/src/render/Backdrop';
import { HeroTubes } from '@/src/render/HeroTubes';
import { exitApp, onHardwareBack } from '@/src/services/backButton';
import { haptics } from '@/src/services/haptics';
import { watchForReward } from '@/src/state/rewards';
import { canClaimGift, claimGift, dayKey, videosLeft } from '@/src/state/shop';
import { usePrefs } from '@/src/state/usePrefs';
import { getSave, useSaveStore } from '@/src/state/useSaveStore';
import { Button, IconButton, type IconName } from '@/src/ui/Button';
import { Coin } from '@/src/ui/Coin';
import { CoinPill, Toast } from '@/src/ui/bits';
import { Logo } from '@/src/ui/Logo';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, space, textOutline } from '@/src/ui/theme';

function RailButton({ icon, label, onPress, badge, variant, testID }: { icon: IconName; label: string; onPress: () => void; badge?: string | null; variant?: 'plum' | 'emerald' | 'ruby' | 'sapphire' | 'gold'; testID?: string }) {
  return (
    <View style={styles.rail}>
      <IconButton icon={icon} label={label} onPress={onPress} size={58} badge={badge} variant={variant} testID={testID} />
      <Text style={[styles.railLabel, textOutline]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const coins = useSaveStore((s) => s.save.wallet.coins);
  const current = useSaveStore((s) => s.save.progress.current);
  const daily = useSaveStore((s) => s.save.daily);
  const loadSource = useSaveStore((s) => s.loadSource);
  const clearLoadNotice = useSaveStore((s) => s.clearLoadNotice);
  const update = useSaveStore((s) => s.update);
  const [exitOpen, setExitOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [freeOpen, setFreeOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const say = (message: string) => setToast((t) => ({ message, id: (t?.id ?? 0) + 1 }));

  const today = dayKey(new Date());
  const giftReady = canClaimGift({ ...getSave(), daily }, today);
  const left = videosLeft({ ...getSave(), daily }, today);

  // Android back on Home asks before leaving the app.
  useFocusEffect(
    useCallback(() => {
      return onHardwareBack(() => {
        setExitOpen(true);
        return true;
      });
    }, []),
  );

  // Gentle breathing on the Play button.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (prefs.reduceMotion) return;
    pulse.set(withRepeat(withSequence(withTiming(1.05, { duration: 700 }), withTiming(1, { duration: 700 })), -1));
  }, [prefs.reduceMotion, pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const notice = loadSource === 'backup' ? en.home.saveRestored : loadSource === 'reset' ? en.home.saveReset : null;

  const claim = () => {
    const r = claimGift(getSave(), dayKey(new Date()));
    setGiftOpen(false);
    if (!r.ok) return;
    update(() => r.save, 'now');
    haptics.win();
    say(en.home.gotCoins(REWARDS.dailyGift));
  };

  const watch = async () => {
    setFreeOpen(false);
    const res = await watchForReward({ kind: 'coins', amount: REWARDS.videoCoins });
    if (res === 'granted') {
      haptics.win();
      say(en.home.gotCoins(REWARDS.videoCoins));
    } else if (res === 'limit') say(en.home.limitReached);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1), paddingBottom: insets.bottom + space(2) }]}>
      <Backdrop />
      <View style={styles.topBar}>
        <CoinPill amount={coins} onPlus={() => router.push('/shop')} testID="home-coins" />
        <IconButton icon="settings-sharp" label={en.home.settings} onPress={() => router.push('/settings')} testID="home-settings" />
      </View>

      <Animated.View entering={FadeInDown.duration(500)} style={styles.logo}>
        <Logo width={330} />
      </Animated.View>

      <View style={styles.middle}>
        <View style={styles.railCol}>
          <RailButton icon="storefront" label={en.home.shop} variant="ruby" onPress={() => router.push('/shop')} testID="home-shop" />
          <RailButton icon="gift" label={en.home.daily} variant="emerald" badge={giftReady ? '!' : null} onPress={() => setGiftOpen(true)} testID="home-gift" />
        </View>
        <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.hero}>
          <HeroTubes shades={prefs.shades} skin={prefs.skin} colorBlind={prefs.colorBlind} lowGfx={prefs.lowGfx} tubeW={56} count={3} />
        </Animated.View>
        <View style={styles.railCol}>
          <RailButton icon="grid" label={en.home.levels} variant="sapphire" onPress={() => router.push('/levels')} testID="home-levels" />
          <RailButton icon="videocam" label={en.home.freeCoins} variant="gold" onPress={() => setFreeOpen(true)} testID="home-free" />
        </View>
      </View>

      <View style={styles.actions}>
        <Toast message={toast?.message ?? null} id={toast?.id ?? 0} />
        <Animated.View style={pulseStyle}>
          <Button
            label={`${en.home.level(current)}${isEndless(current) ? ` · ${en.game.endless}` : ''}`}
            icon="play"
            size="xl"
            onPress={() => router.push({ pathname: '/game', params: { level: String(current) } })}
            testID="home-play"
          />
        </Animated.View>
        <Text style={styles.tagline}>{en.home.tagline}</Text>
      </View>

      <Sheet visible={giftOpen} title={en.home.dailyTitle} ribbon="emerald" onDismiss={() => setGiftOpen(false)} testID="sheet-gift">
        <View style={styles.rewardRow}>
          <Coin size={56} />
          <Text style={[styles.rewardAmount, textOutline]}>+{REWARDS.dailyGift}</Text>
        </View>
        <Text style={styles.sheetBody}>{giftReady ? en.home.dailyBody(REWARDS.dailyGift) : en.home.dailyDone}</Text>
        {giftReady ? (
          <Button label={en.home.dailyClaim} icon="gift" variant="emerald" size="lg" onPress={claim} testID="gift-claim" />
        ) : (
          <Button label={en.common.ok} variant="plum" onPress={() => setGiftOpen(false)} />
        )}
      </Sheet>

      <Sheet visible={freeOpen} title={en.home.freeTitle} onDismiss={() => setFreeOpen(false)} testID="sheet-free">
        <View style={styles.rewardRow}>
          <Coin size={56} />
          <Text style={[styles.rewardAmount, textOutline]}>+{REWARDS.videoCoins}</Text>
        </View>
        <Text style={styles.sheetBody}>{left > 0 ? en.home.freeBody(REWARDS.videoCoins, left) : en.home.limitReached}</Text>
        <Button label={en.home.freeWatch} video variant="emerald" size="lg" disabled={left <= 0} onPress={() => void watch()} testID="free-watch" />
      </Sheet>

      <Sheet visible={exitOpen} title={en.home.exitTitle} subtitle={en.home.exitBody} onDismiss={() => setExitOpen(false)}>
        <Button label={en.home.exit} variant="ruby" onPress={exitApp} />
        <Button label={en.common.cancel} variant="plum" onPress={() => setExitOpen(false)} />
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
  logo: { alignItems: 'center', marginTop: space(3) },
  middle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  railCol: { gap: space(3), alignItems: 'center', width: 76 },
  rail: { alignItems: 'center' },
  railLabel: { fontFamily: fonts.display, fontSize: 15, color: colors.text, marginTop: 4, letterSpacing: 0.4 },
  hero: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  actions: { alignItems: 'stretch', paddingHorizontal: space(2), paddingBottom: space(1), gap: space(1.5) },
  tagline: { fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space(1.5) },
  rewardAmount: { fontFamily: fonts.display, fontSize: 44, color: colors.goldHi },
  sheetBody: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.textMuted, textAlign: 'center' },
});
