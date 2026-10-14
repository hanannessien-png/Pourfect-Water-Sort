import React, { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FIXED_LEVEL_COUNT } from '@/src/config/difficulty';
import { fixedLevel } from '@/src/data/levels';
import { en } from '@/src/i18n/en';
import { Backdrop } from '@/src/render/Backdrop';
import { haptics } from '@/src/services/haptics';
import { usePrefs } from '@/src/state/usePrefs';
import { useSaveStore } from '@/src/state/useSaveStore';
import { Button, IconButton } from '@/src/ui/Button';
import { colors, fonts, radius, space } from '@/src/ui/theme';

const PAGE = 50;
const PAGES = Math.ceil(FIXED_LEVEL_COUNT / PAGE);
const COLS = 5;
const isHard = (n: number) => fixedLevel(n).hard;

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const prefs = usePrefs();
  const current = useSaveStore((s) => s.save.progress.current);
  const stars = useSaveStore((s) => s.save.progress.stars);
  const [page, setPage] = useState(() => Math.min(PAGES - 1, Math.floor((Math.min(current, FIXED_LEVEL_COUNT) - 1) / PAGE)));
  const from = page * PAGE + 1;
  const to = Math.min(FIXED_LEVEL_COUNT, from + PAGE - 1);
  const levels = Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const open = (n: number) => router.push({ pathname: '/game', params: { level: String(n) } });

  return (
    <View style={[styles.root, { paddingTop: insets.top + space(1) }]}>
      <Backdrop lowGfx={prefs.lowGfx} />
      <View style={styles.header}>
        <IconButton icon="chevron-back" label={en.common.back} onPress={() => router.back()} testID="levels-back" />
        <Text style={styles.title} accessibilityRole="header">
          {en.levels.title}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.pager}>
        <IconButton icon="chevron-back" label="Previous page" size={44} disabled={page === 0} onPress={() => setPage((p) => Math.max(0, p - 1))} />
        <Text style={styles.pageLabel}>{en.levels.page(from, to)}</Text>
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
              style={({ pressed }) => [
                styles.cell,
                hard && styles.cellHard,
                isCurrent && styles.cellCurrent,
                locked && styles.cellLocked,
                pressed && { transform: [{ scale: 0.94 }] },
              ]}
            >
              {locked ? (
                <Ionicons name="lock-closed" size={20} color={colors.textFaint} />
              ) : (
                <>
                  <Text style={styles.cellNum}>{n}</Text>
                  <View style={styles.cellStars}>
                    {[0, 1, 2].map((i) => (
                      <Ionicons key={i} name="star" size={11} color={i < s ? colors.star : colors.starEmpty} />
                    ))}
                  </View>
                </>
              )}
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{en.levels.endless}</Text>
            {current > FIXED_LEVEL_COUNT && (
              <Button label={en.home.level(current)} icon="infinite" variant="teal" onPress={() => open(current)} style={{ marginTop: space(1.5) }} />
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space(2) },
  title: { fontFamily: fonts.bold, fontSize: 28, color: colors.text },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    marginTop: space(2),
    marginBottom: space(1),
  },
  pageLabel: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text, minWidth: 90, textAlign: 'center' },
  grid: { paddingHorizontal: space(2), paddingTop: space(1) },
  gridRow: { gap: space(1.25), marginBottom: space(1.25) },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 76,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellHard: { borderColor: 'rgba(255,93,115,0.7)' },
  cellCurrent: { backgroundColor: 'rgba(255,122,102,0.28)', borderColor: colors.coral, borderWidth: 2 },
  cellLocked: { backgroundColor: 'rgba(255,255,255,0.04)' },
  cellNum: { fontFamily: fonts.bold, fontSize: 20, color: colors.text },
  cellStars: { flexDirection: 'row', marginTop: 2 },
  footer: { alignItems: 'center', paddingTop: space(2) },
  footerText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted, textAlign: 'center' },
});
