import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Group, LinearGradient, Shadow, Text as SkText, useFont, vec } from '@shopify/react-native-skia';
import { colors, fonts } from './theme';

const LILITA = require('@expo-google-fonts/lilita-one/400Regular/LilitaOne_400Regular.ttf') as number;

/** Gold "Pourfect" wordmark: thick dark-bronze outline, polished gold fill, white top sheen. */
export function Logo({ width = 320 }: { width?: number }) {
  const size = width * 0.24;
  const font = useFont(LILITA, size);
  const height = size * 1.3;
  const text = 'Pourfect';
  const tw = font ? font.getTextWidth(text) : 0;
  const x = (width - tw) / 2;
  const y = size * 1.02;
  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityRole="header" accessibilityLabel="Pourfect, Water Sort Puzzle">
      <Canvas style={{ width, height }} pointerEvents="none">
        {font && (
          <Group>
            <SkText x={x} y={y + size * 0.06} text={text} font={font} style="stroke" strokeWidth={size * 0.2} strokeJoin="round" color="#2A1200">
              <Shadow dx={0} dy={size * 0.06} blur={size * 0.08} color="rgba(0,0,0,0.6)" />
            </SkText>
            <SkText x={x} y={y} text={text} font={font} style="stroke" strokeWidth={size * 0.13} strokeJoin="round" color="#7A4508" />
            <SkText x={x} y={y} text={text} font={font}>
              <LinearGradient start={vec(0, y - size * 0.8)} end={vec(0, y + size * 0.05)} colors={['#FFFBE0', '#FFE27A', '#F5B83A', '#C97A12', '#F7C948']} positions={[0, 0.3, 0.55, 0.85, 1]} />
            </SkText>
            <SkText x={x} y={y} text={text} font={font} style="stroke" strokeWidth={1.2} color="rgba(255,255,255,0.55)" />
          </Group>
        )}
      </Canvas>
      <View style={styles.plate}>
        <Text style={styles.sub}>WATER SORT PUZZLE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: {
    marginTop: -6,
    paddingHorizontal: 16,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(23,12,48,0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,201,72,0.75)',
  },
  sub: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 3, color: colors.goldHi },
});
