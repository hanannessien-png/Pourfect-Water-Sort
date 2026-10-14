import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { en } from '@/src/i18n/en';
import { IconButton } from './Button';
import { colors, fonts, space, textOutline } from './theme';

/** Back gem, gold display title, optional right-hand slot (e.g. the coin pill). */
export function ScreenHeader({ title, right, testID }: { title: string; right?: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.header}>
      <IconButton icon="chevron-back" label={en.common.back} onPress={() => router.back()} testID={testID} />
      <Text style={[styles.title, textOutline]} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(2), gap: space(1.5) },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 32, color: colors.goldHi, letterSpacing: 0.8 },
  right: { minWidth: 50, alignItems: 'flex-end' },
});
