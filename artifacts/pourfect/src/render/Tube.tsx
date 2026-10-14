import React, { useEffect, useMemo, useRef } from 'react';
import {
  BlurMask,
  Circle,
  Group,
  LinearGradient,
  Oval,
  Path,
  Rect,
  RoundedRect,
  Text as SkText,
  usePathValue,
  vec,
  type SkFont,
  type SkPath,
} from '@shopify/react-native-skia';
import {
  Easing,
  cancelAnimation,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { TubeSkin } from '@/src/config/cosmetics';
import { codeColor, codeHidden } from '@/src/game/codec';
import { colors } from '@/src/ui/theme';
import { GEOM, type TubeRect } from './layout';
import type { LiquidShades } from './palettes';
import { makeSymbol, type TubeShape } from './shapes';

export const HIDDEN_FILL = { base: '#2E2150', light: '#45336F', dark: '#1B1233' } as const;

export interface IncomingLiquid {
  color: number;
  /** Units poured so far (0..count), animated on the UI thread. */
  fill: SharedValue<number>;
}

export interface TubeViewProps {
  rect: TubeRect;
  shape: TubeShape;
  skin: TubeSkin;
  /** Compact tube string, bottom → top. */
  layers: string;
  shades: readonly LiquidShades[];
  font: SkFont | null;
  colorBlind: boolean;
  lowGfx: boolean;
  reduceMotion: boolean;
  selected: boolean;
  complete: boolean;
  hinted: boolean;
  /** Increment to trigger the invalid-tap shake. */
  shakeKey: number;
  /** Increment when liquid lands (wave + bubbles). */
  splashKey: number;
  /** Increment with `revealMask` to flash newly revealed layers. */
  revealKey: number;
  revealMask: number;
  incoming: IncomingLiquid | null;
  /** Newly added tube: slide up and fade in on mount. */
  slideIn?: boolean;
}

interface Band {
  y: number;
  h: number;
  hidden: boolean;
  shade: { base: string; light: string; dark: string };
  ink: string;
  symbol: SkPath | null;
  /** Draw a thin refraction line at this band's top (colour boundary). */
  edge: boolean;
}

const BUBBLES = [0, 1, 2] as const;

export const TubeView = React.memo(function TubeView(p: TubeViewProps) {
  const { rect, shape, layers, shades, lowGfx, reduceMotion } = p;
  const { w, unit } = rect;
  const { innerBottom, g } = shape;
  const len = layers.length;

  const bands = useMemo<Band[]>(() => {
    const out: Band[] = [];
    for (let k = 0; k < len; k++) {
      const code = layers.charCodeAt(k);
      const hidden = codeHidden(code);
      const c = codeColor(code);
      const s = shades[c] ?? shades[0]!;
      const y = innerBottom - (k + 1) * unit;
      const prev = k > 0 ? layers.charCodeAt(k - 1) : -1;
      const symbol = p.colorBlind && !hidden ? makeSymbol(c, w / 2, y + unit / 2, Math.min(unit, w) * 0.2) : null;
      out.push({
        y,
        h: k === 0 ? unit + shape.g * 3 : unit,
        hidden,
        shade: hidden ? HIDDEN_FILL : s,
        ink: hidden ? 'rgba(255,255,255,0.85)' : s.ink,
        symbol,
        edge: k > 0 && prev !== code,
      });
    }
    return out;
  }, [layers, len, shades, innerBottom, unit, w, p.colorBlind, shape.g]);

  // ---- Lift (selection) and shake --------------------------------------------------
  const lift = useSharedValue(p.selected ? w * GEOM.LIFT : 0);
  const shakeX = useSharedValue(0);
  const flash = useSharedValue(0);
  useEffect(() => {
    const target = p.selected ? w * GEOM.LIFT : 0;
    lift.set(reduceMotion ? withTiming(target, { duration: 120 }) : withSpring(target, { damping: 14, stiffness: 260, mass: 0.7 }));
  }, [p.selected, w, reduceMotion, lift]);

  const firstShake = useRef(p.shakeKey);
  useEffect(() => {
    if (p.shakeKey === firstShake.current) return;
    flash.set(withSequence(withTiming(1, { duration: 60 }), withTiming(0, { duration: 420 })));
    if (reduceMotion) return;
    const a = w * 0.12;
    shakeX.set(
      withSequence(
        withTiming(-a, { duration: 45 }),
        withTiming(a, { duration: 70 }),
        withTiming(-a * 0.6, { duration: 60 }),
        withTiming(a * 0.35, { duration: 55 }),
        withTiming(0, { duration: 45 }),
      ),
    );
  }, [p.shakeKey, reduceMotion, w, shakeX, flash]);

  // ---- Position (springs to new slots when the layout reflows) ------------------------
  const posX = useSharedValue(rect.x);
  const posY = useSharedValue(p.slideIn ? rect.y + rect.h * 0.5 : rect.y);
  const appear = useSharedValue(p.slideIn ? 0 : 1);
  useEffect(() => {
    const cfg = { damping: 18, stiffness: 170 };
    posX.set(reduceMotion ? rect.x : withSpring(rect.x, cfg));
    posY.set(reduceMotion ? rect.y : withSpring(rect.y, cfg));
    appear.set(withTiming(1, { duration: 260 }));
  }, [rect.x, rect.y, reduceMotion, posX, posY, appear]);

  const transform = useDerivedValue(() => [
    { translateX: posX.value + shakeX.value },
    { translateY: posY.value - lift.value },
  ]);
  const shadowX = useDerivedValue(() => posX.value + w * 0.08);
  const shadowY = useDerivedValue(() => posY.value + rect.h - w * 0.07);
  const liftNorm = useDerivedValue(() => lift.value / (w * GEOM.LIFT));

  // ---- Wave + bubbles after liquid lands ------------------------------------------
  const fx = useSharedValue(1);
  const firstSplash = useRef(p.splashKey);
  useEffect(() => {
    if (p.splashKey === firstSplash.current || reduceMotion || lowGfx) return;
    fx.set(0);
    fx.set(withTiming(1, { duration: 1400, easing: Easing.linear }));
  }, [p.splashKey, reduceMotion, lowGfx, fx]);

  // ---- Reveal flash -----------------------------------------------------------------
  const reveal = useSharedValue(0);
  const firstReveal = useRef(p.revealKey);
  useEffect(() => {
    if (p.revealKey === firstReveal.current) return;
    reveal.set(1);
    reveal.set(withTiming(0, { duration: reduceMotion ? 200 : 450 }));
  }, [p.revealKey, reduceMotion, reveal]);
  const revealBands = useMemo(() => bands.filter((_, k) => (p.revealMask & (1 << k)) !== 0), [bands, p.revealMask]);

  // ---- Hint pulse ---------------------------------------------------------------------
  const hint = useSharedValue(0);
  useEffect(() => {
    if (p.hinted) {
      hint.set(reduceMotion ? 0.8 : withRepeat(withSequence(withTiming(1, { duration: 520 }), withTiming(0.35, { duration: 520 })), -1));
    } else {
      cancelAnimation(hint);
      hint.set(withTiming(0, { duration: 150 }));
    }
  }, [p.hinted, reduceMotion, hint]);
  const glowOpacity = useDerivedValue(() => Math.max(liftNorm.value * 0.95, hint.value));

  // ---- Cap drop when the tube completes -----------------------------------------------
  const cap = useSharedValue(p.complete ? 1 : 0);
  const wasComplete = useRef(p.complete);
  useEffect(() => {
    if (p.complete && !wasComplete.current) {
      cap.set(0);
      cap.set(reduceMotion ? withTiming(1, { duration: 150 }) : withSpring(1, { damping: 11, stiffness: 180 }));
    } else if (!p.complete) {
      cap.set(0);
    }
    wasComplete.current = p.complete;
  }, [p.complete, reduceMotion, cap]);
  const capTransform = useDerivedValue(() => [{ translateY: (1 - cap.value) * -w * 1.3 }]);
  const capOpacity = useDerivedValue(() => Math.min(1, cap.value * 2.5));

  // ---- Incoming liquid (this tube is the pour target) ---------------------------------
  const incoming = p.incoming;
  const zero = useSharedValue(0);
  const fill = incoming ? incoming.fill : zero;
  const inY = useDerivedValue(() => innerBottom - (len + fill.value) * unit);
  const inH = useDerivedValue(() => fill.value * unit + 0.75);
  const inShade = incoming ? (shades[incoming.color] ?? shades[0]!) : null;
  const top = incoming ? inShade : bands[len - 1]?.shade ?? null;
  const surfaceY = useDerivedValue(() => innerBottom - (len + fill.value) * unit);
  const hasLiquid = len > 0 || incoming !== null;

  const wave = useDerivedValue(() => {
    const f = fx.value;
    return f >= 1 ? 0 : unit * 0.16 * (1 - f) * (1 - f);
  });
  const crest = useWavePath(wave, surfaceY, fx, g, w - g);

  const bubbleXs = BUBBLES.map((i) => g + (w - 2 * g) * (0.28 + 0.22 * i));
  const b0 = useBubble(fx, 0, bubbleXs[0]!, innerBottom, surfaceY, w);
  const b1 = useBubble(fx, 1, bubbleXs[1]!, innerBottom, surfaceY, w);
  const b2 = useBubble(fx, 2, bubbleXs[2]!, innerBottom, surfaceY, w);
  const bubbles = [b0, b1, b2];

  const shadowOpacity = useDerivedValue(() => 0.5 - liftNorm.value * 0.22);
  const skin = p.skin;
  const outlineW = Math.max(1.4, w * skin.edgeW);
  const glowColor = p.hinted && !p.selected ? colors.hint : colors.selectGlow;
  const glyphSize = p.font?.getSize() ?? 0;
  const glyphW = useMemo(() => (p.font ? p.font.getTextWidth('?') : 0), [p.font]);
  const h = rect.h;

  return (
    <Group opacity={appear}>
      {/* Contact shadow on the shelf */}
      <Oval x={shadowX} y={shadowY} width={w * 0.84} height={w * 0.2} color="#000000" opacity={shadowOpacity}>
        {!lowGfx && <BlurMask blur={w * 0.09} style="normal" />}
      </Oval>
      <Group transform={transform}>
        {/* Selection / hint glow behind the glass */}
        <Path path={shape.outline} style="stroke" strokeWidth={outlineW * 3.2} color={glowColor} opacity={glowOpacity}>
          {!lowGfx && <BlurMask blur={w * 0.14} style="normal" />}
        </Path>
        {/* Back glass */}
        <Path path={shape.outer} color={skin.glass}>
          {!lowGfx && <LinearGradient start={vec(0, 0)} end={vec(w, 0)} colors={['rgba(0,0,0,0.28)', skin.glass, 'rgba(0,0,0,0.18)']} positions={[0, 0.45, 1]} />}
        </Path>
        <Group clip={shape.inner}>
          {bands.map((b, k) => (
            <Rect key={k} x={0} y={b.y} width={w} height={b.h + 0.75} color={b.shade.base}>
              {!lowGfx && (
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(w, 0)}
                  colors={[b.shade.dark, b.shade.base, b.shade.light, b.shade.base, b.shade.dark]}
                  positions={[0, 0.2, 0.4, 0.72, 1]}
                />
              )}
            </Rect>
          ))}
          {inShade && (
            <Rect x={0} y={inY} width={w} height={inH} color={inShade.base}>
              {!lowGfx && (
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(w, 0)}
                  colors={[inShade.dark, inShade.base, inShade.light, inShade.base, inShade.dark]}
                  positions={[0, 0.2, 0.4, 0.72, 1]}
                />
              )}
            </Rect>
          )}
          {bands.map((b, k) =>
            b.edge ? <Rect key={`e${k}`} x={0} y={b.y + b.h - 1} width={w} height={1.4} color="rgba(0,0,0,0.22)" /> : null,
          )}
          {hasLiquid && top && (
            <>
              <Path path={crest} color={top.base} />
              <Rect x={0} y={surfaceY} width={w} height={Math.max(2, unit * 0.09)} color={top.light} opacity={0.95} />
            </>
          )}
          {bands.map((b, k) =>
            b.hidden && p.font ? (
              <SkText
                key={`q${k}`}
                x={w / 2 - glyphW / 2}
                y={b.y + unit / 2 + glyphSize * 0.36}
                text="?"
                font={p.font}
                color="rgba(255,226,150,0.9)"
              />
            ) : null,
          )}
          {bands.map((b, k) => (b.symbol ? <Path key={`s${k}`} path={b.symbol} color={b.ink} /> : null))}
          {revealBands.map((b, k) => (
            <Rect key={`r${k}`} x={0} y={b.y} width={w} height={b.h} color="#FFFFFF" opacity={reveal} />
          ))}
          {!lowGfx && !reduceMotion && len > 0 &&
            bubbles.map((b, i) => <Circle key={`b${i}`} cx={b.cx} cy={b.cy} r={b.r} color="rgba(255,255,255,0.55)" />)}
        </Group>
        {/* Front glass: gloss streak, right-edge reflection, outline */}
        <Path path={shape.highlight} color={`rgba(255,255,255,${skin.gloss})`} />
        <Rect x={w - g - w * 0.1} y={w * 0.35} width={Math.max(1, w * 0.045)} height={Math.max(4, h * 0.55)} color="rgba(255,255,255,0.12)" />
        <Path path={shape.outline} style="stroke" strokeWidth={outlineW + 1.5} color="rgba(0,0,0,0.35)" />
        <Path path={shape.outline} style="stroke" strokeWidth={outlineW} color={skin.edge} />
        <Path path={shape.outline} style="stroke" strokeWidth={outlineW * 1.6} color={colors.danger} opacity={flash} />
        {/* Lip ring */}
        <RoundedRect x={-w * 0.09} y={-w * 0.07} width={w * 1.18} height={w * 0.17} r={w * 0.085} color={skin.rim[1]}>
          <LinearGradient start={vec(0, -w * 0.07)} end={vec(0, w * 0.1)} colors={[skin.rim[0], skin.rim[1], skin.rim[2]]} />
        </RoundedRect>
        <RoundedRect x={-w * 0.02} y={-w * 0.05} width={w * 0.5} height={w * 0.04} r={w * 0.02} color="rgba(255,255,255,0.55)" />
        {p.complete && (
          <Group transform={capTransform} opacity={capOpacity}>
            <RoundedRect x={w * 0.08} y={-w * 0.4} width={w * 0.84} height={w * 0.42} r={w * 0.13} color={skin.cap[1]}>
              <LinearGradient start={vec(0, -w * 0.4)} end={vec(0, w * 0.02)} colors={[skin.cap[0], skin.cap[1], skin.cap[2]]} />
            </RoundedRect>
            <RoundedRect x={w * 0.16} y={-w * 0.36} width={w * 0.5} height={w * 0.07} r={w * 0.035} color="rgba(255,255,255,0.55)" />
            <Circle cx={w / 2} cy={-w * 0.19} r={w * 0.09} color="rgba(255,255,255,0.35)" />
            <Circle cx={w / 2} cy={-w * 0.19} r={w * 0.055} color={skin.rim[0]} />
          </Group>
        )}
      </Group>
    </Group>
  );
});

/** Crest shapes above the flat liquid surface while the wave decays. */
function useWavePath(
  amp: SharedValue<number>,
  surface: SharedValue<number>,
  fx: SharedValue<number>,
  x0: number,
  x1: number,
): SharedValue<SkPath> {
  return usePathValue((b) => {
    'worklet';
    const a = amp.value;
    if (a < 0.3) return;
    const y = surface.value;
    const phase = fx.value * 14;
    const steps = 10;
    b.moveTo(x0, y + 1);
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps;
      b.lineTo(x, y - a * (0.5 + 0.5 * Math.sin(phase + i * 0.9)));
    }
    b.lineTo(x1, y + 1);
    b.close();
  });
}

function useBubble(
  fx: SharedValue<number>,
  i: number,
  x: number,
  bottom: number,
  surface: SharedValue<number>,
  w: number,
): { cx: SharedValue<number>; cy: SharedValue<number>; r: SharedValue<number> } {
  const q = useDerivedValue(() => {
    const v = (fx.value * 1.5 - i * 0.2) / 0.85;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  });
  const cx = useDerivedValue(() => x + Math.sin(q.value * 9 + i * 2) * w * 0.05);
  const cy = useDerivedValue(() => bottom - (bottom - surface.value) * q.value);
  const r = useDerivedValue(() => (fx.value >= 1 || q.value <= 0 || q.value >= 1 ? 0 : w * (0.035 + 0.012 * i) * (1 - q.value * 0.4)));
  return { cx, cy, r };
}
