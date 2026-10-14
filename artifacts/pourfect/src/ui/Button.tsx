import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptics } from '@/src/services/haptics';
import { MIN_TAP, colors, fonts, radius, space } from './theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type Variant = 'primary' | 'secondary' | 'gold' | 'teal' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, { bg: string; border: string; text: string; shadow: string }> = {
  primary: { bg: colors.coral, border: colors.coralDark, text: '#FFFFFF', shadow: colors.coralDark },
  gold: { bg: colors.gold, border: colors.goldDark, text: '#3A2400', shadow: colors.goldDark },
  teal: { bg: colors.teal, border: colors.tealDark, text: '#05302B', shadow: colors.tealDark },
  danger: { bg: colors.danger, border: '#C93A50', text: '#FFFFFF', shadow: '#C93A50' },
  secondary: { bg: colors.cardStrong, border: colors.cardBorder, text: colors.text, shadow: 'rgba(0,0,0,0.25)' },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.textMuted, shadow: 'transparent' },
};

function usePressScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return {
    style,
    onPressIn: () => scale.set(withSpring(0.94, { damping: 18, stiffness: 400 })),
    onPressOut: () => scale.set(withSpring(1, { damping: 12, stiffness: 300 })),
  };
}

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  size?: 'lg' | 'md' | 'sm';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', icon, size = 'md', disabled, style, testID, accessibilityHint }: ButtonProps) {
  const v = VARIANTS[variant];
  const press = usePressScale();
  const h = size === 'lg' ? 64 : size === 'md' ? 52 : MIN_TAP;
  const fontSize = size === 'lg' ? 24 : size === 'md' ? 18 : 15;
  return (
    <Animated.View style={[press.style, style, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={[
          styles.btn,
          {
            height: h,
            backgroundColor: v.bg,
            borderColor: v.border,
            borderBottomWidth: variant === 'ghost' ? 0 : 4,
            paddingHorizontal: size === 'sm' ? space(2) : space(3),
          },
        ]}
      >
        {icon && <Ionicons name={icon} size={fontSize + 2} color={v.text} style={{ marginRight: space(1) }} />}
        <Text style={[styles.label, { color: v.text, fontSize }]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  disabled?: boolean;
  badge?: number | null;
  tint?: string;
  testID?: string;
}

/** Round frosted icon button (≥ 44 dp) with an optional count badge. */
export function IconButton({ icon, label, onPress, size = 48, disabled, badge, tint = colors.text, testID }: IconButtonProps) {
  const press = usePressScale();
  const s = Math.max(MIN_TAP, size);
  return (
    <Animated.View style={[press.style, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={badge !== undefined && badge !== null ? `${label}, ${badge}` : label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        hitSlop={4}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={[styles.icon, { width: s, height: s, borderRadius: s / 2 }]}
      >
        <Ionicons name={icon} size={s * 0.48} color={tint} />
      </Pressable>
      {badge !== undefined && badge !== null && (
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

/** Labelled tool button for the in-game toolbar (icon over label, count badge). */
export function ToolButton({ icon, label, onPress, disabled, badge, testID }: IconButtonProps) {
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, styles.tool, disabled && styles.disabled]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={badge !== undefined && badge !== null ? `${label}, ${badge} left` : label}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => {
          haptics.button();
          onPress();
        }}
        style={styles.toolInner}
      >
        <View style={styles.toolIcon}>
          <Ionicons name={icon} size={26} color={colors.text} />
        </View>
        <Text style={styles.toolLabel} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      {badge !== undefined && badge !== null && (
        <View style={[styles.badge, styles.toolBadge, badge === 0 && styles.badgeEmpty]} pointerEvents="none">
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 0,
  },
  label: { fontFamily: fonts.bold, letterSpacing: 0.3 },
  disabled: { opacity: 0.45 },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgTop,
  },
  badgeEmpty: { backgroundColor: '#5A5480' },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: '#FFFFFF' },
  tool: { alignItems: 'center', minWidth: 64 },
  toolInner: { alignItems: 'center', paddingHorizontal: space(0.5), minHeight: MIN_TAP },
  toolIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textMuted, marginTop: 4 },
  toolBadge: { top: -6, right: 0 },
});
