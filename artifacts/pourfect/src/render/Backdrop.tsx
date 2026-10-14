import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { backgroundItem, type BackgroundItem } from '@/src/config/cosmetics';
import { useSaveStore } from '@/src/state/useSaveStore';
import { colors } from '@/src/ui/theme';

/**
 * Full-screen illustrated background (the equipped one unless `item` is given), with a dark
 * wash and top/bottom vignette so the HUD and liquids stay readable. Static: no redraws.
 */
export function Backdrop({ item, dim }: { item?: BackgroundItem; dim?: number; lowGfx?: boolean }) {
  const equipped = useSaveStore((s) => s.save.cosmetics.equipped.background);
  const bg = item ?? backgroundItem(equipped);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.night }]} pointerEvents="none">
      <Image source={bg.image} style={StyleSheet.absoluteFill} contentFit="cover" transition={180} cachePolicy="memory-disk" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(8,4,22,${dim ?? bg.dim})` }]} />
      <LinearGradient
        colors={['rgba(8,4,22,0.75)', 'rgba(8,4,22,0)', 'rgba(8,4,22,0)', 'rgba(8,4,22,0.8)']}
        locations={[0, 0.2, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
