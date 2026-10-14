import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOutUp, ZoomIn } from 'react-native-reanimated';
import { en } from '@/src/i18n/en';
import { haptics } from '@/src/services/haptics';
import { Coin } from './Coin';
import { colors, fonts, radius, space, textOutline } from './theme';

const GOLD_FRAME = ['#FFF3BF', '#E7B238', '#8E560C', '#E9BE5A'] as const;

/** Coin counter: dark inset pill with gold frame, coin on the left, optional green "+" (opens the shop). */
export function CoinPill({ amount, onPlus, testID }: { amount: number; onPlus?: () => void; testID?: string }) {
  const body = (
    <LinearGradient colors={GOLD_FRAME} locations={[0, 0.4, 0.75, 1]} style={styles.pillFrame}>
      <View style={styles.pillInner}>
        <Text style={[styles.pillText, textOutline]} numberOfLines={1}>
          {amount.toLocaleString('en-US')}
        </Text>
        {onPlus && (
          <LinearGradient colors={['#A6FFD3', '#22C97F', '#0A8A52']} style={styles.pillPlus}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </LinearGradient>
        )}
      </View>
      <View style={styles.pillCoin}>
        <Coin size={34} />
      </View>
    </LinearGradient>
  );
  return onPlus ? (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${en.common.coins}: ${amount}. ${en.shop.open}`}
      hitSlop={6}
      onPress={() => {
        haptics.button();
        onPlus();
      }}
    >
      {body}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={`${en.common.coins}: ${amount}`} testID={testID}>
      {body}
    </View>
  );
}

/** Three gold stars with a dark outline; `animate` pops them in one after another. */
export function Stars({ count, size = 28, animate = false }: { count: number; size?: number; animate?: boolean }) {
  return (
    <View style={styles.stars} accessible accessibilityLabel={en.a11y.stars(count)}>
      {[0, 1, 2].map((i) => {
        const filled = i < count;
        const s = i === 1 ? size * 1.25 : size;
        const icon = (
          <View style={[{ width: s * 1.12, height: s * 1.12 }, i === 1 && { marginBottom: size * 0.3 }]}>
            <Ionicons name="star" size={s * 1.12} color={filled ? '#7A4508' : 'rgba(0,0,0,0.35)'} style={StyleSheet.absoluteFill} />
            <Ionicons name="star" size={s * 0.96} color={filled ? colors.star : 'rgba(255,240,215,0.14)'} style={{ position: 'absolute', left: s * 0.08, top: s * 0.06 }} />
            {filled && <Ionicons name="star" size={s * 0.46} color="rgba(255,255,255,0.55)" style={{ position: 'absolute', left: s * 0.26, top: s * 0.2 }} />}
          </View>
        );
        return animate && filled ? (
          <Animated.View key={i} entering={ZoomIn.delay(250 + i * 240).springify().damping(9)}>
            {icon}
          </Animated.View>
        ) : (
          <View key={i}>{icon}</View>
        );
      })}
    </View>
  );
}

/** Ruby banner with gold edges, used as the title of panels and the win screen. */
export function Ribbon({ title, style, variant = 'ruby' }: { title: string; style?: StyleProp<ViewStyle>; variant?: 'ruby' | 'emerald' | 'sapphire' }) {
  const grad =
    variant === 'emerald'
      ? (['#7CF5BC', '#18B872', '#0A7447'] as const)
      : variant === 'sapphire'
        ? (['#9CC2FF', '#3B7BF0', '#1A43A8'] as const)
        : (['#FF8EA0', '#E5304F', '#9A0F2C'] as const);
  return (
    <View style={[styles.ribbonWrap, style]} accessibilityRole="header">
      <View style={[styles.ribbonTail, styles.ribbonTailL]} />
      <View style={[styles.ribbonTail, styles.ribbonTailR]} />
      <LinearGradient colors={GOLD_FRAME} locations={[0, 0.4, 0.75, 1]} style={styles.ribbonFrame}>
        <LinearGradient colors={grad} style={styles.ribbonFace}>
          <View style={styles.ribbonGloss} pointerEvents="none" />
          <Text style={[styles.ribbonText, textOutline]} numberOfLines={1} adjustsFontSizeToFit>
            {title}
          </Text>
        </LinearGradient>
      </LinearGradient>
    </View>
  );
}

/** Framed card: polished gold border around a deep plum gradient with a fine inner gold line. */
export function Panel({ children, style, padded = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return (
    <LinearGradient colors={GOLD_FRAME} locations={[0, 0.4, 0.75, 1]} style={[styles.panelFrame, style]}>
      <LinearGradient colors={['#3A2468', '#24154A', '#170C33']} style={[styles.panelFace, padded && styles.panelPad]}>
        {children}
      </LinearGradient>
    </LinearGradient>
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
  pillFrame: { height: 38, borderRadius: radius.pill, padding: 2, marginLeft: 16, justifyContent: 'center' },
  pillInner: {
    flex: 1,
    minWidth: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    backgroundColor: '#1A0C2E',
    paddingLeft: 24,
    paddingRight: 3,
  },
  pillText: { flex: 1, fontFamily: fonts.display, fontSize: 19, color: colors.text, textAlign: 'center', paddingHorizontal: 4 },
  pillPlus: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D8FFEC' },
  pillCoin: { position: 'absolute', left: -16, top: 0 },
  stars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  ribbonWrap: { alignSelf: 'center', alignItems: 'center', justifyContent: 'center', minWidth: 220 },
  ribbonTail: {
    position: 'absolute',
    top: 14,
    width: 40,
    height: 38,
    backgroundColor: '#7A0C24',
    borderWidth: 2,
    borderColor: '#C8871E',
  },
  ribbonTailL: { left: -22, transform: [{ skewY: '-12deg' }] },
  ribbonTailR: { right: -22, transform: [{ skewY: '12deg' }] },
  ribbonFrame: { borderRadius: 14, padding: 3, alignSelf: 'stretch' },
  ribbonFace: { borderRadius: 11, paddingHorizontal: space(4), paddingVertical: space(1), overflow: 'hidden', alignItems: 'center' },
  ribbonGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: '48%', backgroundColor: 'rgba(255,255,255,0.18)' },
  ribbonText: { fontFamily: fonts.display, fontSize: 28, color: '#FFFFFF', letterSpacing: 0.8 },
  panelFrame: {
    borderRadius: radius.xl,
    padding: 3,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  panelFace: { borderRadius: radius.xl - 3, borderWidth: 1, borderColor: 'rgba(255,226,150,0.35)' },
  panelPad: { padding: space(2.5) },
  toast: {
    alignSelf: 'center',
    backgroundColor: 'rgba(23,12,48,0.96)',
    borderColor: 'rgba(247,201,72,0.7)',
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: space(2.5),
    paddingVertical: space(1.25),
    maxWidth: '90%',
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text, textAlign: 'center' },
});
