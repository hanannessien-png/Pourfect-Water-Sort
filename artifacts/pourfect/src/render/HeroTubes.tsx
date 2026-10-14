import React, { useMemo } from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { TubeSkin } from '@/src/config/cosmetics';
import { layerChar } from '@/src/game/codec';
import { GEOM, tubeHeight, type TubeRect } from './layout';
import type { LiquidShades } from './palettes';
import { makeTubeShape } from './shapes';
import { TubeView } from './Tube';

/** Decorative row of tubes for the Home screen and shop previews (static apart from the lifted tube). */
const CONTENTS: string[] = [[0, 1, 0, 3], [2, 2, 2, 2], [4, 3, 1], [5, 4, 5, 6]].map((c) => c.map((k) => layerChar(k, false)).join(''));

interface Props {
  shades: readonly LiquidShades[];
  skin: TubeSkin;
  colorBlind?: boolean;
  lowGfx?: boolean;
  tubeW?: number;
  count?: number;
}

export const HeroTubes = React.memo(function HeroTubes({ shades, skin, colorBlind = false, lowGfx = false, tubeW = 50, count = 4 }: Props) {
  const w = tubeW;
  const gap = w * 0.55;
  const h = tubeHeight(w, 4);
  const lift = w * GEOM.LIFT;
  const n = Math.min(count, CONTENTS.length);
  const width = n * w + (n - 1) * gap + w * 0.5;
  const height = h + lift + w * 0.7;
  const shape = useMemo(() => makeTubeShape(w, h, w * GEOM.BASE, skin.bottom), [w, h, skin.bottom]);
  const rects = useMemo<TubeRect[]>(
    () =>
      CONTENTS.slice(0, n).map((_, i) => {
        const x = w * 0.25 + i * (w + gap);
        const y = height - h - w * 0.15;
        return { x, y, w, h, unit: w * GEOM.UNIT, capacity: 4, row: 0, hit: { x, y, w, h } };
      }),
    [n, w, gap, height, h],
  );
  return (
    <Canvas style={{ width, height }} pointerEvents="none" accessible={false}>
      {rects.map((r, i) => (
        <TubeView
          key={i}
          rect={r}
          shape={shape}
          skin={skin}
          layers={CONTENTS[i]!}
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
});
