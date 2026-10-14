import React from 'react';
import { Group, LinearGradient, Path, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { TubeSkin } from '@/src/config/cosmetics';
import { codeColor, codeHidden } from '@/src/game/codec';
import { MAX_CAPACITY } from '@/src/game/types';
import type { LiquidShades } from './palettes';
import type { PourPlan } from './pourPlan';
import { sampleAt, sampleLevel } from './sample';
import type { TubeShape } from './shapes';
import { HIDDEN_FILL } from './Tube';

/**
 * The source tube while it pours. The whole tube rotates around its inner lip corner;
 * the liquid bands are drawn in a counter-rotated group so their surfaces stay level,
 * using the boundary heights precomputed in the plan.
 */
interface Props {
  plan: SharedValue<PourPlan | null>;
  progress: SharedValue<number>;
  shape: TubeShape;
  /** Source tube contents before the pour. */
  layers: string;
  shades: readonly LiquidShades[];
  skin: TubeSkin;
}

const SLOTS = Array.from({ length: MAX_CAPACITY }, (_, i) => i);

function useBand(plan: SharedValue<PourPlan | null>, progress: SharedValue<number>, j: number, far: number) {
  const y = useDerivedValue(() => {
    const p = plan.value;
    if (!p || j >= p.layerCount) return 0;
    return sampleLevel(p.levels, p.samples, p.layerCount, j + 1, progress.value);
  });
  const h = useDerivedValue(() => {
    const p = plan.value;
    if (!p || j >= p.layerCount) return 0;
    const top = y.value;
    const bottom = j === 0 ? far : sampleLevel(p.levels, p.samples, p.layerCount, j, progress.value);
    const d = bottom - top;
    return d > 0 ? d + 0.75 : 0;
  });
  return { y, h };
}

function PourBand(props: { plan: SharedValue<PourPlan | null>; progress: SharedValue<number>; j: number; far: number; color: string }) {
  const { y, h } = useBand(props.plan, props.progress, props.j, props.far);
  return <Rect x={-props.far} y={y} width={props.far * 2} height={h} color={props.color} />;
}

export function PouringTube({ plan, progress, shape, layers, shades, skin }: Props) {
  const { w, g, h } = shape;
  const far = h * 3;
  const angle = useDerivedValue(() => {
    const p = plan.value;
    return p ? sampleAt(p.angle, progress.value) : 0;
  });
  const outer = useDerivedValue(() => {
    const p = plan.value;
    if (!p) return [{ translateX: -10000 }];
    const t = progress.value;
    return [{ translateX: sampleAt(p.px, t) }, { translateY: sampleAt(p.py, t) }, { scaleX: p.dir }, { rotate: angle.value }];
  });
  const counter = useDerivedValue(() => [{ translateX: w - g }, { rotate: -angle.value }]);
  const surface = useDerivedValue(() => {
    const p = plan.value;
    if (!p || p.layerCount === 0) return -10000;
    return sampleLevel(p.levels, p.samples, p.layerCount, p.layerCount, progress.value);
  });

  const topCode = layers.charCodeAt(layers.length - 1);
  const topShade = layers.length > 0 ? shades[codeColor(topCode)] : undefined;

  return (
    <Group transform={outer}>
      <Group transform={[{ translateX: -(w - g) }]}>
        <Path path={shape.outer} color={skin.glass} />
        <Group clip={shape.inner}>
          <Group transform={counter}>
            {SLOTS.map((j) => {
              if (j >= layers.length) return null;
              const code = layers.charCodeAt(j);
              const color = codeHidden(code) ? HIDDEN_FILL.base : (shades[codeColor(code)]?.base ?? '#fff');
              return <PourBand key={j} plan={plan} progress={progress} j={j} far={far} color={color} />;
            })}
            {topShade && <Rect x={-far} y={surface} width={far * 2} height={Math.max(1.5, w * 0.05)} color={topShade.light} />}
          </Group>
        </Group>
        <Path path={shape.highlight} color={`rgba(255,255,255,${skin.gloss})`} />
        <Path path={shape.outline} style="stroke" strokeWidth={Math.max(1.4, w * skin.edgeW) + 1.5} color="rgba(0,0,0,0.35)" />
        <Path path={shape.outline} style="stroke" strokeWidth={Math.max(1.4, w * skin.edgeW)} color={skin.edge} />
        <RoundedRect x={-w * 0.09} y={-w * 0.07} width={w * 1.18} height={w * 0.17} r={w * 0.085} color={skin.rim[1]}>
          <LinearGradient start={vec(0, -w * 0.07)} end={vec(0, w * 0.1)} colors={[skin.rim[0], skin.rim[1], skin.rim[2]]} />
        </RoundedRect>
      </Group>
    </Group>
  );
}
