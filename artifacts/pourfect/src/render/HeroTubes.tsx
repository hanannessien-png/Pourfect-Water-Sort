import React, { useMemo } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { layerChar } from '@/src/game/codec';
import { GEOM, tubeHeight, type TubeRect } from './layout';
import type { LiquidShades } from './palettes';
import { makeTubeShape } from './shapes';
import { TubeView } from './Tube';

/** Decorative trio of tubes for the Home screen (static apart from the lifted middle tube). */
const CONTENTS: number[][] = [
  [1, 0, 0, 3],
  [2, 2, 2, 2],
  [3, 3, 1],
];

export function HeroTubes({ shades, colorBlind, lowGfx }: { shades: readonly LiquidShades[]; colorBlind: boolean; lowGfx: boolean }) {
  const w = 44;
  const gap = 26;
  const h = tubeHeight(w, 4);
  const lift = w * GEOM.LIFT;
  const width = 3 * w + 2 * gap + 24;
  const height = h + lift + w * 0.6;
  const shape = useMemo(() => makeTubeShape(w, h, w * GEOM.BASE), [h]);
  const rects: TubeRect[] = CONTENTS.map((_, i) => {
    const x = 12 + i * (w + gap);
    const y = height - h - w * 0.15;
    return { x, y, w, h, unit: w * GEOM.UNIT, capacity: 4, row: 0, hit: { x, y, w, h } };
  });
  return (
    <Canvas style={{ width, height }} pointerEvents="none" accessible={false}>
      {CONTENTS.map((c, i) => (
        <TubeView
          key={i}
          rect={rects[i]!}
          shape={shape}
          layers={c.map((k) => layerChar(k, false)).join('')}
          shades={shades}
          font={null}
          colorBlind={colorBlind}
          lowGfx={lowGfx}
          reduceMotion
          selected={i === 0}
          complete={i === 1}
          hinted={false}
          shakeKey={0}
          splashKey={0}
          revealKey={0}
          revealMask={0}
          incoming={null}
        />
      ))}
    </Canvas>
  );
}
