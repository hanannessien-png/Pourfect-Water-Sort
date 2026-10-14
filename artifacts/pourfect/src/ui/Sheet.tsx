import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { onHardwareBack } from '@/src/services/backButton';
import { colors, fonts, radius, space } from './theme';

/**
 * Centered modal card over a dim scrim. Back button / scrim tap call `onDismiss`
 * when provided (otherwise the sheet is modal-only, e.g. the win screen).
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onDismiss,
  children,
  testID,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onDismiss?: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  useEffect(() => {
    if (!visible) return;
    return onHardwareBack(() => {
      onDismiss?.();
      return true;
    });
  }, [visible, onDismiss]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => onDismiss?.()}>
      {visible && (
        <Animated.View style={styles.scrim} entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onDismiss}
            accessibilityLabel={onDismiss ? 'Close' : undefined}
            accessible={!!onDismiss}
          />
          <Animated.View style={styles.card} entering={ZoomIn.springify().damping(16).stiffness(220)} testID={testID}>
            {title && (
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
            )}
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
            <View style={styles.body}>{children}</View>
          </Animated.View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: colors.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(3),
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.sheet,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.sheetBorder,
    paddingHorizontal: space(3),
    paddingTop: space(3),
    paddingBottom: space(3),
  },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text, textAlign: 'center' },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space(1),
  },
  body: { marginTop: space(2.5), gap: space(1.5) },
});
