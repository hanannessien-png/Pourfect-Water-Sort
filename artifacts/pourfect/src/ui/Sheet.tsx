import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { en } from '@/src/i18n/en';
import { onHardwareBack } from '@/src/services/backButton';
import { Panel, Ribbon } from './bits';
import { IconButton } from './Button';
import { colors, fonts, space } from './theme';

/**
 * Centered framed panel over a dim scrim, titled by a ribbon. Back button, scrim tap and the
 * close button call `onDismiss` when provided (otherwise the sheet is modal-only, e.g. the win screen).
 */
export function Sheet({
  visible,
  title,
  subtitle,
  onDismiss,
  children,
  testID,
  ribbon = 'ruby',
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onDismiss?: () => void;
  children: React.ReactNode;
  testID?: string;
  ribbon?: 'ruby' | 'emerald' | 'sapphire';
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
          <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessibilityLabel={onDismiss ? en.common.close : undefined} accessible={!!onDismiss} />
          <Animated.View style={styles.wrap} entering={ZoomIn.springify().damping(15).stiffness(220)} testID={testID}>
            <Panel>
              {title && <View style={styles.titleSpace} />}
              {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
              <View style={styles.body}>{children}</View>
            </Panel>
            {title && <Ribbon title={title} variant={ribbon} style={styles.ribbon} />}
            {onDismiss && (
              <View style={styles.close}>
                <IconButton icon="close" label={en.common.close} size={44} variant="ruby" onPress={onDismiss} />
              </View>
            )}
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
  wrap: { width: '100%', maxWidth: 380, paddingTop: space(3) },
  titleSpace: { height: space(2.5) },
  ribbon: { position: 'absolute', top: 0, left: space(5), right: space(5) },
  close: { position: 'absolute', top: space(1.5), right: -space(1) },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: space(1),
  },
  body: { marginTop: space(2), gap: space(1.5) },
});
