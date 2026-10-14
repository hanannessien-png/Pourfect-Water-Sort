import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TubeSkin } from '@/src/config/cosmetics';

/**
 * Lightweight tube drawn with plain views, for shop previews. Many of these can be on screen at
 * once without creating a Skia canvas (and GPU context) per card.
 */
export function MiniTube({ skin, colors, width = 26, units = 4 }: { skin: TubeSkin; colors: readonly string[]; width?: number; units?: number }) {
  const unit = width * 0.95;
  const height = unit * units + width * 0.45;
  const bottomR = skin.bottom === 'round' ? width / 2 : width * 0.26;
  const border = Math.max(1.5, width * skin.edgeW * 1.4);
  return (
    <View style={{ width: width * 1.24, alignItems: 'center' }}>
      <View
        style={{
          width,
          height,
          marginTop: width * 0.08,
          borderWidth: border,
          borderTopWidth: 0,
          borderColor: skin.edge,
          borderBottomLeftRadius: bottomR,
          borderBottomRightRadius: bottomR,
          backgroundColor: skin.glass,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}
      >
        {colors.map((c, i) => (
          <View key={i} style={{ height: unit, backgroundColor: c }}>
            <View style={[styles.shine, { left: width * 0.16, width: width * 0.16 }]} />
          </View>
        ))}
        <View style={[styles.gloss, { left: width * 0.12, width: width * 0.12, top: width * 0.3, bottom: width * 0.4, borderRadius: width, opacity: skin.gloss * 2 }]} />
      </View>
      <LinearGradient colors={[skin.rim[0], skin.rim[1], skin.rim[2]]} style={[styles.rim, { width: width * 1.24, height: width * 0.22, borderRadius: width * 0.11 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  shine: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.22)' },
  gloss: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.5)' },
  rim: { position: 'absolute', top: 0 },
});
