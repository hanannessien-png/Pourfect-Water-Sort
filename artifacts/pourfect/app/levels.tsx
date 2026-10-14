import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXED_LEVEL_COUNT } from '@/src/config/difficulty';
import { fixedLevel } from '@/src/data/levels';
import { en } from '@/src/i18n/en';
import { Backdrop } from '@/src/render/Backdrop';
import { haptics } from '@/src/services/haptics';
import { useSaveStore } from '@/src/state/useSaveStore';
import { Button, IconButton } from '@/src/ui/Button';
import { ScreenHeader } from '@/src/ui/ScreenHeader';
import { colors, fonts, radius, space, textOutline } from '@/src/ui/theme';

const PAGE = 50;
const PAGES = Math.ceil(FIXED_LEVEL_COUNT / PAGE);
const COLS = 5;
const isHard = (n: number) => fixedLevel(n).hard;

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const current = useSaveStore((s) => s.save.progress.current);
  const stars = useSaveStore((s) => s.save.progress.stars);
  const [page, setPage] = useState(() => Math.min(PAGES - 1, Math.floor((Math.min(current, FIXED_LEVEL_COUNT) - 1) / PAGE)));
  const from = page * PAGE + 1;
  const to = Math.min(FIXED_LEVEL_COUNT, from + PAGE - 1);
  const levels = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const open = (n: number) => router.push({ pathname: '/game', params: { level: String(n) } });

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1) }]}>
      <Backdrop />
      <ScreenHeader title={en.levels.title} testID="levels-back" />

      <View style={styles.pager}>
        <IconButton icon="chevron-back" label="Previous page" size={44} disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} />
        <Text style={[styles.pageLabel, textOutline]}>{en.levels.page(from, to)}</Text>
        <IconButton
          icon="chevron-forward"
          label="Next page"
          size={44}
          disabled={page >= PAGES - 1}
          onPress={() => setPage((p) => Math.min(PAGES - 1, p + 1))}
        />
      </View>

      <FlatList
        data={levels}
        key={page}
        numColumns={COLS}
        keyExtractor={(n) => String(n)}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + space(4) }]}
        renderItem={({ item: n }) => {
          const locked = n > current;
          const s = stars[n - 1] ?? 0;
          const isCurrent = n === current;
          const hard = isHard(n);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={locked ? `${en.home.level(n)}, ${en.levels.locked}` : `${en.levels.playLevel(n)}, ${en.a11y.stars(s)}`}
              accessibilityState={{ disabled: locked }}
              disabled={locked}
              onPress={() => {
                haptics.button();
                open(n);
              }}
              style={({ pressed }) => [styles.cellWrap, pressed && { transform: [{ scale: 0.92 }] }]}
            >
              <LinearGradient
                colors={
                  locked
                    ? ['#2A1F45', '#1A1230']
                    : isCurrent
                      ? ['#FFF0A8', '#F5BD3C', '#C77A12']
                      : hard
                        ? ['#C23A58', '#7E1430', '#4E0A1E']
                        : ['#5A3C98', '#3A2468', '#24154A']
                }
                style={[styles.cell, isCurrent && styles.cellCurrent, locked && styles.cellLocked, hard && !locked && !isCurrent && styles.cellHard]}
              >
                {locked ? (
                  <Ionicons name="lock-closed" size={20} color="rgba(255,240,215,0.35)" />
                ) : (
                  <>
                    <View style={styles.cellGloss} pointerEvents="none" />
                    <Text style={[styles.cellNum, textOutline]}>{n}</Text>
                    <View style={styles.cellStars}>
                      {[0, 1, 2].map((i) => (
                        <Ionicons key={i} name="star" size={11} color={i < s ? colors.star : 'rgba(0,0,0,0.35)'} />
                      ))}
                    </View>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{en.levels.endless}</Text>
            {current > FIXED_LEVEL_COUNT && (
              <Button label={en.home.level(current)} icon="infinite" variant="sapphire" onPress={() => open(current)} style={{ marginTop: space(1.5) }} />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    marginTop: space(2),
    marginBottom: space(1),
  },
  pageLabel: { fontFamily: fonts.display, fontSize: 22, color: colors.text, minWidth: 100, textAlign: 'center' },
  grid: { paddingHorizontal: space(2), paddingTop: space(1) },
  gridRow: { gap: space(1.25), marginBottom: space(1.25) },
  cellWrap: { flex: 1, aspectRatio: 1, maxWidth: 76 },
  cell: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'rgba(247,201,72,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellHard: { borderColor: '#FF8EA0' },
  cellCurrent: { borderColor: '#FFFFFF', borderWidth: 2.5 },
  cellLocked: { borderColor: 'rgba(247,201,72,0.2)' },
  cellGloss: { position: 'absolute', top: 2, left: 4, right: 4, height: '40%', borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.14)' },
  cellNum: { fontFamily: fonts.display, fontSize: 22, color: '#FFFFFF' },
  cellStars: { flexDirection: 'row', marginTop: 1 },
  footer: { alignItems: 'center', paddingTop: space(2) },
  footerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
