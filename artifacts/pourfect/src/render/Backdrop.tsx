import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BlurMask, Canvas, Circle, Group, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { colors } from '@/src/ui/theme';

/** "Twilight" gradient backdrop with a few soft glows and faint stars. Static: never redraws on its own. */
const STARS: [number, number, number][] = [
  [0.12, 0.08, 1.2],
  [0.31, 0.14, 0.9],
  [0.78, 0.06, 1.4],
  [0.9, 0.2, 1],
  [0.55, 0.11, 0.8],
  [0.2, 0.27, 1],
  [0.67, 0.3, 0.7],
  [0.42, 0.04, 1.1],
  [0.06, 0.4, 0.8],
  [0.94, 0.42, 0.9],
];

export function Backdrop({ lowGfx = false }: { lowGfx?: boolean }) {
  const { width, height } = useWindowDimensions();
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient start={vec(0, 0)} end={vec(width * 0.3, height)} colors={[colors.bgTop, colors.bgMid, colors.bgBottom]} positions={[0, 0.5, 1]} />
      </Rect>
      {!lowGfx && (
        <Group>
          <Circle cx={width * 0.85} cy={height * 0.16} r={width * 0.32} color="rgba(255,122,102,0.16)">
            <BlurMask blur={60} style="normal" />
          </Circle>
          <Circle cx={width * 0.1} cy={height * 0.62} r={width * 0.4} color="rgba(63,214,198,0.12)">
            <BlurMask blur={70} style="normal" />
          </Circle>
          <Circle cx={width * 0.7} cy={height * 0.95} r={width * 0.45} color="rgba(124,92,255,0.14)">
            <BlurMask blur={80} style="normal" />
          </Circle>
        </Group>
      )}
      {STARS.map(([x, y, r], i) => (
        <Circle key={i} cx={x * width} cy={y * height} r={r * 1.3} color="rgba(255,255,255,0.45)" />
      ))}
    </Canvas>
  );
}
