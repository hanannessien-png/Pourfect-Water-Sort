import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BACKGROUNDS,
  BOOSTER_PACKS,
  LIQUIDS,
  REWARDS,
  TUBE_SKINS,
  type BoosterKind,
  type CosmeticItem,
  type TubeSkin,
} from '@/src/config/cosmetics';
import { en } from '@/src/i18n/en';
import { Backdrop } from '@/src/render/Backdrop';
import { haptics } from '@/src/services/haptics';
import { watchForReward } from '@/src/state/rewards';
import { buyBoosterPack, buyCosmetic, canClaimGift, claimGift, dayKey, equipCosmetic, videosLeft } from '@/src/state/shop';
import { shadesFor, usePrefs } from '@/src/state/usePrefs';
import { getSave, useSaveStore } from '@/src/state/useSaveStore';
import { Button, type IconName } from '@/src/ui/Button';
import { Coin } from '@/src/ui/Coin';
import { CoinPill, Panel, Toast } from '@/src/ui/bits';
import { MiniTube } from '@/src/ui/MiniTube';
import { ScreenHeader } from '@/src/ui/ScreenHeader';
import { Sheet } from '@/src/ui/Sheet';
import { colors, fonts, radius, space, textOutline } from '@/src/ui/theme';

type Tab = 'tube' | 'background' | 'liquid' | 'boosters' | 'coins';
const TABS: { id: Tab; icon: IconName }[] = [
  { id: 'tube', icon: 'flask' },
  { id: 'background', icon: 'image' },
  { id: 'liquid', icon: 'color-palette' },
  { id: 'boosters', icon: 'flash' },
  { id: 'coins', icon: 'logo-bitcoin' },
];
const BOOSTER_ICON: Record<BoosterKind, IconName> = { undo: 'arrow-undo', hint: 'bulb', tube: 'flask' };
const BOOSTER_NAME: Record<BoosterKind, string> = { undo: en.game.undo, hint: en.game.hint, tube: en.game.addTube };
const DEMO = [[0, 1, 2], [3, 4, 5, 6], [7, 0]];

function TubeTrio({ skin, shades, width = 24 }: { skin: TubeSkin; shades: readonly { base: string }[]; width?: number }) {
  return (
    <View style={styles.trio}>
      {DEMO.map((c, i) => (
        <MiniTube key={i} skin={skin} width={width} colors={c.map((k) => shades[k]?.base ?? '#fff')} />
      ))}
    </View>
  );
}

function Preview({ item, big = false }: { item: CosmeticItem; big?: boolean }) {
  const prefs = usePrefs();
  if (item.kind === 'background') {
    return <Image source={item.image} style={[styles.bgThumb, big && styles.bgBig]} contentFit="cover" contentPosition="top" />;
  }
  if (item.kind === 'tube') {
    return (
      <View style={[styles.inset, big && styles.insetBig]}>
        <TubeTrio skin={item} shades={prefs.shades} width={big ? 34 : 22} />
      </View>
    );
  }
  const shades = shadesFor(item.palette);
  return (
    <View style={[styles.inset, big && styles.insetBig]}>
      <TubeTrio skin={prefs.skin} shades={shades} width={big ? 34 : 22} />
    </View>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const coins = useSaveStore((s) => s.save.wallet.coins);
  const cosmetics = useSaveStore((s) => s.save.cosmetics);
  const tokens = useSaveStore((s) => s.save.tokens);
  const daily = useSaveStore((s) => s.save.daily);
  const update = useSaveStore((s) => s.update);
  const [tab, setTab] = useState<Tab>(() => (TABS.some((t) => t.id === params.tab) ? (params.tab as Tab) : 'tube'));
  const [confirm, setConfirm] = useState<CosmeticItem | null>(null);
  const [toast, setToast] = useState<{ message: string; id: number } | null>(null);
  const say = (message: string) => setToast((t) => ({ message, id: (t?.id ?? 0) + 1 }));

  const items: readonly CosmeticItem[] = useMemo(() => (tab === 'tube' ? TUBE_SKINS : tab === 'background' ? BACKGROUNDS : tab === 'liquid' ? LIQUIDS : []), [tab]);
  const today = dayKey(new Date());
  const save = getSave();
  const giftReady = canClaimGift({ ...save, daily }, today);
  const left = videosLeft({ ...save, daily }, today);

  const onItem = (it: CosmeticItem) => {
    haptics.button();
    if (cosmetics.owned.includes(it.id)) {
      const r = equipCosmetic(getSave(), it.id);
      if (r.ok) update(() => r.save, 'now');
      return;
    }
    setConfirm(it);
  };

  const buy = () => {
    if (!confirm) return;
    const r = buyCosmetic(getSave(), confirm.id);
    if (!r.ok) {
      if (r.error === 'coins') say(en.shop.notEnough);
      setConfirm(null);
      return;
    }
    update(() => r.save, 'now');
    haptics.win();
    say(`${confirm.name} — ${en.shop.bought}`);
    setConfirm(null);
  };

  const buyPack = (id: string) => {
    const r = buyBoosterPack(getSave(), id);
    if (!r.ok) {
      say(en.shop.notEnough);
      return;
    }
    update(() => r.save, 'now');
    haptics.complete();
  };

  const watchCoins = async () => {
    const res = await watchForReward({ kind: 'coins', amount: REWARDS.videoCoins });
    if (res === 'granted') say(en.home.gotCoins(REWARDS.videoCoins));
    else if (res === 'limit') say(en.home.limitReached);
  };

  const claim = () => {
    const r = claimGift(getSave(), dayKey(new Date()));
    if (!r.ok) return;
    update(() => r.save, 'now');
    haptics.win();
    say(en.home.gotCoins(REWARDS.dailyGift));
  };

  const renderCard = ({ item }: { item: CosmeticItem }) => {
    const owned = cosmetics.owned.includes(item.id);
    const equipped = cosmetics.equipped[item.kind] === item.id;
    return (
      <Pressable
        style={({ pressed }) => [styles.cardWrap, pressed && { transform: [{ scale: 0.96 }] }]}
        onPress={() => onItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}. ${equipped ? en.shop.equipped : owned ? en.shop.equip : `${item.price} coins`}`}
        testID={`shop-item-${item.id}`}
      >
        <LinearGradient
          colors={equipped ? ['#FFF0A8', '#E7B238', '#8E560C'] : ['rgba(247,201,72,0.9)', 'rgba(142,86,12,0.9)']}
          style={styles.cardFrame}
        >
          <LinearGradient colors={['#3A2468', '#1E1240']} style={styles.card}>
            <Preview item={item} />
            <Text style={[styles.cardName, textOutline]} numberOfLines={1}>
              {item.name}
            </Text>
            {equipped ? (
              <View style={[styles.state, styles.stateOn]}>
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.stateText}>{en.shop.equipped}</Text>
              </View>
            ) : owned ? (
              <View style={[styles.state, styles.stateOwned]}>
                <Text style={styles.stateText}>{en.shop.equip}</Text>
              </View>
            ) : (
              <View style={[styles.state, styles.statePrice, coins < item.price && styles.stateShort]}>
                <Coin size={18} />
                <Text style={styles.priceText}>{item.price.toLocaleString('en-US')}</Text>
              </View>
            )}
          </LinearGradient>
        </LinearGradient>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1) }]}>
      <Backdrop />
      <ScreenHeader title={en.shop.title} right={<CoinPill amount={coins} testID="shop-coins" />} testID="shop-back" />

      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = t.id === tab;
          return (
            <Pressable
              key={t.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={en.shop.tabs[t.id]}
              onPress={() => {
                haptics.button();
                setTab(t.id);
              }}
              style={styles.tabPress}
              testID={`shop-tab-${t.id}`}
            >
              <LinearGradient colors={on ? ['#FFF0A8', '#F5BD3C', '#C77A12'] : ['#4A2D85', '#2A1852']} style={[styles.tab, on && styles.tabOn]}>
                <Ionicons name={t.icon} size={20} color={on ? colors.textOnGold : colors.goldHi} />
                <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                  {en.shop.tabs[t.id]}
                </Text>
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>

      {items.length > 0 ? (
        <FlatList
          key={tab}
          data={items}
          numColumns={2}
          keyExtractor={(i) => i.id}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + space(4) }]}
          renderItem={renderCard}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space(4) }]}>
          {tab === 'boosters' &&
            BOOSTER_PACKS.map((p) => (
              <Panel key={p.id} padded={false}>
                <View style={styles.rowItem}>
                  <LinearGradient colors={['#FFF3BF', '#E7B238', '#8E560C']} style={styles.rowIconRing}>
                    <LinearGradient colors={['#6A47AE', '#2A1852']} style={styles.rowIcon}>
                      <Ionicons name={BOOSTER_ICON[p.booster]} size={26} color={colors.goldHi} />
                    </LinearGradient>
                  </LinearGradient>
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, textOutline]}>{en.shop.packTitle(p.amount, BOOSTER_NAME[p.booster])}</Text>
                    <Text style={styles.rowSub}>
                      {en.game.boosterBody[p.booster]} ({tokens[p.booster]})
                    </Text>
                  </View>
                  <Button label="" price={p.price} size="sm" variant="gold" onPress={() => buyPack(p.id)} disabled={coins < p.price} testID={`shop-pack-${p.id}`} />
                </View>
              </Panel>
            ))}
          {tab === 'coins' && (
            <>
              <Panel padded={false}>
                <View style={styles.rowItem}>
                  <Coin size={48} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, textOutline]}>{en.shop.freeCoinsTitle} +{REWARDS.videoCoins}</Text>
                    <Text style={styles.rowSub}>{en.shop.videosLeft(left)}</Text>
                  </View>
                  <Button label={en.home.freeWatch} video size="sm" variant="emerald" disabled={left <= 0} onPress={() => void watchCoins()} testID="shop-watch" />
                </View>
              </Panel>
              <Panel padded={false}>
                <View style={styles.rowItem}>
                  <Ionicons name="gift" size={44} color={colors.ruby} />
                  <View style={styles.rowText}>
                    <Text style={[styles.rowTitle, textOutline]}>{en.shop.dailyGift} +{REWARDS.dailyGift}</Text>
                    <Text style={styles.rowSub}>{giftReady ? en.home.dailyBody(REWARDS.dailyGift) : en.home.dailyDone}</Text>
                  </View>
                  <Button label={en.home.dailyClaim} size="sm" variant="emerald" disabled={!giftReady} onPress={claim} testID="shop-gift" />
                </View>
              </Panel>
            </>
          )}
        </ScrollView>
      )}

      <View style={[styles.toastSlot, { bottom: insets.bottom + space(3) }]} pointerEvents="none">
        <Toast message={toast?.message ?? null} id={toast?.id ?? 0} />
      </View>

      <Sheet visible={confirm !== null} title={confirm?.name} onDismiss={() => setConfirm(null)} testID="sheet-buy">
        {confirm && (
          <>
            <View style={styles.confirmPreview}>
              <Preview item={confirm} big />
            </View>
            <Button label={en.shop.unlock} price={confirm.price} size="lg" onPress={buy} disabled={coins < confirm.price} testID="shop-buy" />
            {coins < confirm.price && (
              <Button label={`${en.home.freeWatch} +${REWARDS.videoCoins}`} video variant="emerald" disabled={left <= 0} onPress={() => void watchCoins()} />
            )}
          </>
        )}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabs: { flexDirection: 'row', paddingHorizontal: space(1.5), marginTop: space(2), gap: space(0.75) },
  tabPress: { flex: 1 },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space(1),
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'rgba(247,201,72,0.6)',
    gap: 2,
  },
  tabOn: { borderColor: '#FFFFFF' },
  tabText: { fontFamily: fonts.display, fontSize: 12, color: colors.text, letterSpacing: 0.3 },
  tabTextOn: { color: colors.textOnGold },
  grid: { paddingHorizontal: space(2), paddingTop: space(2) },
  gridRow: { gap: space(1.5), marginBottom: space(1.5) },
  cardWrap: { flex: 1, maxWidth: '50%' },
  cardFrame: { borderRadius: radius.lg, padding: 2.5 },
  card: { borderRadius: radius.lg - 2.5, padding: space(1.25), alignItems: 'center', gap: space(1) },
  trio: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  inset: {
    alignSelf: 'stretch',
    height: 140,
    borderRadius: radius.md,
    backgroundColor: 'rgba(5,2,18,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insetBig: { height: 220 },
  bgThumb: { alignSelf: 'stretch', height: 140, borderRadius: radius.md },
  bgBig: { height: 320 },
  cardName: { fontFamily: fonts.display, fontSize: 17, color: colors.text, letterSpacing: 0.3 },
  state: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    alignSelf: 'stretch',
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  stateOn: { backgroundColor: colors.emeraldDeep, borderColor: '#A6FFD3' },
  stateOwned: { backgroundColor: colors.plumLight, borderColor: 'rgba(247,201,72,0.6)' },
  statePrice: { backgroundColor: '#C77A12', borderColor: colors.goldHi },
  stateShort: { opacity: 0.7 },
  stateText: { fontFamily: fonts.display, fontSize: 15, color: '#FFFFFF', letterSpacing: 0.3 },
  priceText: { fontFamily: fonts.display, fontSize: 16, color: '#FFFFFF', ...textOutline },
  list: { padding: space(2), gap: space(1.5) },
  rowItem: { flexDirection: 'row', alignItems: 'center', gap: space(1.5), padding: space(1.5) },
  rowIconRing: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowIcon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1 },
  rowTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
  rowSub: { fontFamily: fonts.medium, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  toastSlot: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  confirmPreview: { alignItems: 'stretch' },
});
