import React, { useEffect, useMemo } from 'react';
import { BlurMask, Group, Path, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { colors } from '@/src/ui/theme';

/** Curved source → target arrow shown above the tubes while a hint is active. */
export function HintArrow({
  from,
  to,
  size,
  reduceMotion,
  lowGfx,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  size: number;
  reduceMotion: boolean;
  lowGfx: boolean;
}) {
  const pulse = useSharedValue(0.9);
  useEffect(() => {
    pulse.set(reduceMotion ? 0.9 : withRepeat(withSequence(withTiming(1, { duration: 480 }), withTiming(0.45, { duration: 480 })), -1));
  }, [reduceMotion, pulse]);

  const { line, head } = useMemo(() => {
    const lift = Math.max(size * 1.1, Math.abs(to.x - from.x) * 0.28);
    const cx = (from.x + to.x) / 2;
    const cy = Math.min(from.y, to.y) - lift;
    const line = Skia.PathBuilder.Make().moveTo(from.x, from.y).quadTo(cx, cy, to.x, to.y - size * 0.18).build();
    // Arrowhead aligned with the curve's end tangent.
    const ex = to.x;
    const ey = to.y - size * 0.18;
    const ang = Math.atan2(ey - cy, ex - cx);
    const L = size * 0.42;
    const head = Skia.PathBuilder.Make()
      .moveTo(ex + Math.cos(ang) * L * 0.25, ey + Math.sin(ang) * L * 0.25)
      .lineTo(ex - Math.cos(ang - 0.5) * L, ey - Math.sin(ang - 0.5) * L)
      .lineTo(ex - Math.cos(ang + 0.5) * L, ey - Math.sin(ang + 0.5) * L)
      .close()
      .build();
    return { line, head };
  }, [from.x, from.y, to.x, to.y, size]);

  const stroke = Math.max(3, size * 0.09);
  return (
    <Group opacity={pulse}>
      {!lowGfx && (
        <Path path={line} style="stroke" strokeWidth={stroke * 2.2} strokeCap="round" color={colors.hint} opacity={0.35}>
          <BlurMask blur={6} style="normal" />
        </Path>
      )}
      <Path path={line} style="stroke" strokeWidth={stroke} strokeCap="round" color={colors.hint} />
      <Path path={head} color={colors.hint} />
    </Group>
  );
}
