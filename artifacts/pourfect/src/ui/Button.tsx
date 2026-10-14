import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { haptics } from '@/src/services/haptics';
import { Coin } from './Coin';
import { MIN_TAP, colors, fonts, radius, space, textOutline } from './theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export type Variant = 'gold' | 'emerald' | 'ruby' | 'sapphire' | 'plum' | 'ghost';

interface Skin {
  grad: readonly [string, string, ...string[]];
  edge: string;
  rim: string;
  text: string;
  outline: boolean;
}

const SKINS: Record<Exclude<Variant, 'ghost'>, Skin> = {
  gold: { grad: ['#FFF0A8', '#FBCB45', '#E9A126', '#C77A12'], edge: '#7A4508', rim: '#FFF7CF', text: '#FFFFFF', outline: true },
  emerald: { grad: ['#A6FFD3', '#38E39A', '#13B46E', '#0A8A52'], edge: '#04492B', rim: '#D8FFEC', text: '#FFFFFF', outline: true },
  ruby: { grad: ['#FFB3BF', '#FF5872', '#E0294A', '#A8122F'], edge: '#5C0717', rim: '#FFDDE3', text: '#FFFFFF', outline: true },
  sapphire: { grad: ['#C2DAFF', '#5B9BFF', '#2F69E8', '#1D47B8'], edge: '#0D2461', rim: '#E1ECFF', text: '#FFFFFF', outline: true },
  plum: { grad: ['#6A47AE', '#4A2D85', '#36206A', '#28174F'], edge: '#120827', rim: 'rgba(247,201,72,0.75)', text: colors.text, outline: false },
};

function usePress() {
  const down = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: down.value * 3 }, { scale: 1 - down.value * 0.03 }],
  }));
  return {
    style,
    onPressIn: () => down.set(withTiming(1, { duration: 60 })),
    onPressOut: () => down.set(withSpring(0, { damping: 12, stiffness: 320 })),
  };
}

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  /** Coin price shown at the right of the label. */
  price?: number;
  /** Small "watch video" play badge before the label. */
  video?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}

const SIZES = { xl: { h: 76, f: 32, i: 30 }, lg: { h: 62, f: 26, i: 24 }, md: { h: 52, f: 21, i: 20 }, sm: { h: 44, f: 17, i: 17 } } as const;

/** Chunky bevelled game button: gradient face, glossy top, darker 3D lip underneath. */
export function Button({ label, onPress, variant = 'gold', icon, size = 'md', price, video, disabled, style, testID, accessibilityHint }: ButtonProps) {
  const press = usePress();
  const dims = SIZES[size];
  const a11y = price !== undefined ? `${label ? `${label}, ` : ''}${price} coins` : label;
  if (variant === 'ghost') {
    return (
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        disabled={disabled}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={[styles.ghost, { minHeight: MIN_TAP }, style, disabled && styles.disabled]}
      >
        {icon && <Ionicons name={icon} size={dims.i - 2} color={colors.textMuted} style={{ marginRight: 6 }} />}
        <Text style={[styles.ghostText, { fontSize: dims.f - 4 }]}>{label}</Text>
      </Pressable>
    );
  }
  const sk = SKINS[variant];
  const lip = size === 'sm' ? 4 : 6;
  return (
    <Animated.View style={[press.style, style, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={[styles.shell, { height: dims.h + lip, borderRadius: dims.h / 2.4, backgroundColor: sk.edge, paddingBottom: lip }]}
      >
        <LinearGradient colors={sk.grad} locations={sk.grad.length === 4 ? [0, 0.35, 0.7, 1] : undefined} style={[styles.face, { height: dims.h, borderRadius: dims.h / 2.4, borderColor: sk.rim }]}>
          <View style={[styles.gloss, { borderTopLeftRadius: dims.h / 2.4, borderTopRightRadius: dims.h / 2.4 }]} pointerEvents="none" />
          <View style={[styles.content, { paddingHorizontal: size === 'sm' ? space(2) : space(3) }]}>
            {video && (
              <View style={styles.videoBadge}>
                <Ionicons name="play" size={dims.i * 0.6} color={colors.emeraldDeep} />
              </View>
            )}
            {icon && <Ionicons name={icon} size={dims.i} color={sk.text} style={[styles.iconShadow, { marginRight: space(1) }]} />}
            {label !== '' && (
              <Text style={[styles.label, { fontSize: dims.f, color: sk.text }, sk.outline && textOutline]} numberOfLines={1} adjustsFontSizeToFit>
                {label}
              </Text>
            )}
            {price !== undefined && (
              <View style={[styles.price, label !== '' && { marginLeft: space(1.25) }]}>
                <Coin size={dims.f * 0.95} />
                <Text style={[styles.priceText, { fontSize: dims.f * 0.82 }]}>{price.toLocaleString('en-US')}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export interface RoundButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  badge?: number | string | null;
  variant?: Exclude<Variant, 'ghost'>;
  testID?: string;
}

/** Round gem button with a polished gold ring. */
export function IconButton({ icon, label, onPress, size = 50, disabled, badge, variant = 'plum', testID }: RoundButtonProps) {
  const press = usePress();
  const s = Math.max(MIN_TAP, size);
  const sk = SKINS[variant];
  return (
    <Animated.View style={[press.style, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={badge !== undefined && badge !== null ? `${label}, ${badge}` : label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        hitSlop={6}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
      >
        <View style={[styles.roundShadow, { width: s, height: s + 4, borderRadius: s / 2 }]}>
          <LinearGradient colors={['#FFF3BF', '#E7B238', '#8E560C', '#F2CB6A']} locations={[0, 0.4, 0.75, 1]} style={[styles.ring, { width: s, height: s, borderRadius: s / 2 }]}>
            <LinearGradient colors={sk.grad} style={[styles.roundFace, { width: s - 7, height: s - 7, borderRadius: (s - 7) / 2 }]}>
              <View style={[styles.roundGloss, { width: s * 0.6, height: s * 0.24, borderRadius: s * 0.12 }]} pointerEvents="none" />
              <Ionicons name={icon} size={s * 0.46} color={colors.text} style={styles.iconShadow} />
            </LinearGradient>
          </LinearGradient>
        </View>
      </Pressable>
      {badge !== undefined && badge !== null && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export interface BoosterButtonProps {
  icon: IconName;
  label: string;
  count: number;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}

/** Square booster tile: gem face, gold frame, count badge — or a green "+" when empty. */
export function BoosterButton({ icon, label, count, onPress, disabled, busy, testID }: BoosterButtonProps) {
  const press = usePress();
  const empty = count <= 0;
  return (
    <Animated.View style={[press.style, styles.booster, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={empty ? `${label}, none left. Get more` : `${label}, ${count} left`}
        accessibilityState={{ disabled: !!disabled, busy: !!busy }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={styles.boosterPress}
      >
        <View style={styles.boosterShell}>
          <LinearGradient colors={['#FFF3BF', '#E7B238', '#8E560C', '#F2CB6A']} locations={[0, 0.4, 0.75, 1]} style={styles.boosterRing}>
            <LinearGradient colors={['#6A47AE', '#4A2D85', '#2A1852']} style={styles.boosterFace}>
              <View style={styles.boosterGloss} pointerEvents="none" />
              <Ionicons name={busy ? 'hourglass' : icon} size={30} color={colors.goldHi} style={styles.iconShadow} />
            </LinearGradient>
          </LinearGradient>
        </View>
        <Text style={[styles.boosterLabel, textOutline]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      <View style={[styles.boosterBadge, empty && styles.boosterBadgeEmpty]} pointerEvents="none">
        {empty ? <Ionicons name="add" size={18} color="#FFFFFF" /> : <Text style={styles.badgeText}>{count}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  face: { borderWidth: 2, overflow: 'hidden', justifyContent: 'center' },
  gloss: { position: 'absolute', top: 0, left: 6, right: 6, height: '46%', backgroundColor: 'rgba(255,255,255,0.22)' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.display, letterSpacing: 0.6, includeFontPadding: false },
  iconShadow: { textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 1 },
  price: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 0,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.28)',
    gap: 4,
  },
  priceText: { fontFamily: fonts.display, color: '#FFFFFF' },
  videoBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space(1),
    paddingLeft: 2,
  },
  ghost: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: space(2) },
  ghostText: { fontFamily: fonts.semibold, color: colors.textMuted },
  disabled: { opacity: 0.45 },
  roundShadow: {
    backgroundColor: '#3E2405',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  ring: { alignItems: 'center', justifyContent: 'center' },
  roundFace: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  roundGloss: { position: 'absolute', top: 3, backgroundColor: 'rgba(255,255,255,0.22)' },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.ruby,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: { fontFamily: fonts.display, fontSize: 13, color: '#FFFFFF' },
  booster: { alignItems: 'center', width: 78 },
  boosterPress: { alignItems: 'center' },
  boosterShell: {
    borderRadius: 22,
    backgroundColor: '#3E2405',
    paddingBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  boosterRing: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  boosterFace: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  boosterGloss: { position: 'absolute', top: 3, left: 6, right: 6, height: 20, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.18)' },
  boosterLabel: { fontFamily: fonts.display, fontSize: 14, color: colors.text, marginTop: 4, letterSpacing: 0.4 },
  boosterBadge: {
    position: 'absolute',
    top: -6,
    right: 2,
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    backgroundColor: colors.ruby,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boosterBadgeEmpty: { backgroundColor: colors.emeraldDeep },
});
