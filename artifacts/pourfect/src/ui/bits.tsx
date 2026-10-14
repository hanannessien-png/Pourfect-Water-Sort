import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp, ZoomIn } from 'react-native-reanimated';
import { en } from '@/src/i18n/en';
import { colors, fonts, radius, space } from './theme';

/** Coin / gem counter chip. */
export function CurrencyChip({ kind, amount }: { kind: 'coins' | 'gems'; amount: number }) {
  const label = kind === 'coins' ? en.common.coins : en.common.gems;
  return (
    <View style={styles.chip} accessible accessibilityLabel={`${label}: ${amount}`}>
      <View style={[styles.chipIcon, { backgroundColor: kind === 'coins' ? colors.gold : colors.teal }]}>
        <Ionicons name={kind === 'coins' ? 'ellipse' : 'diamond'} size={12} color={kind === 'coins' ? colors.goldDark : '#0B5E56'} />
      </View>
      <Text style={styles.chipText}>{amount.toLocaleString('en-US')}</Text>
    </View>
  );
}

/** Three stars; `animate` pops them in one after another. */
export function Stars({ count, size = 28, animate = false }: { count: number; size?: number; animate?: boolean }) {
  return (
    <View style={styles.stars} accessible accessibilityLabel={en.a11y.stars(count)}>
      {[0, 1, 2].map((i) => {
        const filled = i < count;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={i === 1 ? size * 1.2 : size}
            color={filled ? colors.star : colors.starEmpty}
            style={i === 1 ? { marginTop: -size * 0.25 } : undefined}
          />
        );
        return animate && filled ? (
          <Animated.View key={i} entering={ZoomIn.delay(200 + i * 220).springify().damping(10)}>
            {icon}
          </Animated.View>
        ) : (
          <View key={i}>{icon}</View>
        );
      })}
    </View>
  );
}

/** Short message that slides in above the toolbar and disappears by itself. */
export function Toast({ message, id }: { message: string | null; id: number }) {
  if (!message) return null;
  return <ToastBubble key={id} message={message} />;
}

function ToastBubble({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeInDown.duration(180)}
      exiting={FadeOutUp.duration(160)}
      style={styles.toast}
      pointerEvents="none"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingLeft: 4,
    paddingRight: space(1.5),
    height: 36,
    minWidth: 76,
  },
  chipIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space(1),
  },
  chipText: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  stars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 6 },
  toast: {
    alignSelf: 'center',
    backgroundColor: 'rgba(20,16,56,0.94)',
    borderColor: colors.cardBorder,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.25),
    maxWidth: '90%',
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textAlign: 'center' },
});
