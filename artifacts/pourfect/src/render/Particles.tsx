import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Atlas, Skia, useRSXformBuffer, type SkColor, type SkImage, type SkRect } from '@shopify/react-native-skia';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';

/**
 * Sparkles and confetti drawn with one Atlas call from a fixed pool (cap 120).
 * Motion is analytic (p = p0 + v·t + ½·g·t²) so the UI thread only evaluates a formula
 * per sprite per frame. The particle clock only animates while particles are alive,
 * so an idle board does not redraw.
 */
export const PARTICLE_CAP = 120;
const STRIDE = 8; // x0, y0, vx, vy, t0, life, spin, size
const SPRITE = 16;
const GRAVITY = 900;

export interface BurstOptions {
  x: number;
  y: number;
  count: number;
  colors: readonly string[];
  kind: 'sparkle' | 'confetti';
  /** Spread speed in dp/s. */
  speed?: number;
}

export interface ParticlesHandle {
  burst: (o: BurstOptions) => void;
}

const SPARKLE_RECT = Skia.XYWHRect(0, 0, SPRITE, SPRITE);
const CONFETTI_RECT = Skia.XYWHRect(SPRITE, 0, SPRITE, SPRITE);

function starPath() {
  const b = Skia.PathBuilder.Make();
  const c = SPRITE / 2;
  for (let i = 0; i < 8; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const r = i % 2 === 0 ? c - 0.5 : c * 0.32;
    const x = c + Math.cos(a) * r;
    const y = c + Math.sin(a) * r;
    if (i === 0) b.moveTo(x, y);
    else b.lineTo(x, y);
  }
  return b.close().build();
}

/**
 * The sprite sheet (star + confetti strip) is drawn once on a CPU raster surface and cached.
 * Never use a GPU offscreen surface here: creating one per render (what `useTexture` does when
 * its size object changes) exhausted GL contexts and blanked the screen after a few moves.
 */
let sheetCache: SkImage | null = null;
function spriteSheet(): SkImage | null {
  if (sheetCache) return sheetCache;
  const surface = Skia.Surface.Make(SPRITE * 2, SPRITE);
  if (!surface) return null;
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setColor(Skia.Color('white'));
  canvas.drawPath(starPath(), paint);
  canvas.drawRRect(Skia.RRectXY(Skia.XYWHRect(SPRITE + 3, 5, SPRITE - 6, SPRITE - 10), 1.5, 1.5), paint);
  surface.flush();
  const snap = surface.makeImageSnapshot();
  sheetCache = snap.makeNonTextureImage();
  return sheetCache;
}

export const Particles = React.memo(
  forwardRef<ParticlesHandle, { enabled: boolean }>(function Particles({ enabled }, ref) {
  const params = useSharedValue<number[]>(new Array(PARTICLE_CAP * STRIDE).fill(0).map((_, i) => (i % STRIDE === 5 ? 0 : -1)));
  const clock = useSharedValue(0);
  const [sprites, setSprites] = useState<SkRect[]>(() => new Array(PARTICLE_CAP).fill(SPARKLE_RECT));
  const [tints, setTints] = useState<SkColor[]>(() => new Array(PARTICLE_CAP).fill(Skia.Color('white')));
  const cursor = useRef(0);
  const texture = useMemo(spriteSheet, []);

  const transforms = useRSXformBuffer(PARTICLE_CAP, (val, i) => {
    'worklet';
    const p = params.value;
    const o = i * STRIDE;
    const t = clock.value - (p[o + 4] as number);
    const life = p[o + 5] as number;
    if (life <= 0 || t < 0 || t > life) {
      val.set(0, 0, -100, -100);
      return;
    }
    const k = t / life;
    const x = (p[o] as number) + (p[o + 2] as number) * t;
    const y = (p[o + 1] as number) + (p[o + 3] as number) * t + 0.5 * GRAVITY * t * t;
    const s = (p[o + 7] as number) * (1 - k * k);
    const rot = (p[o + 6] as number) * t;
    const sc = s * Math.cos(rot);
    const ss = s * Math.sin(rot);
    const h = SPRITE / 2;
    val.set(sc, ss, x - (sc * h - ss * h), y - (ss * h + sc * h));
  });

  useImperativeHandle(
    ref,
    () => ({
      burst: (o: BurstOptions) => {
        if (!enabled || o.count <= 0 || o.colors.length === 0) return;
        const now = clock.get();
        const next = params.get().slice();
        const nextSprites = sprites.slice();
        const nextTints = tints.slice();
        const speed = o.speed ?? (o.kind === 'confetti' ? 620 : 260);
        let c = cursor.current;
        let maxLife = 0;
        for (let n = 0; n < Math.min(o.count, PARTICLE_CAP); n++) {
          const slot = c % PARTICLE_CAP;
          c++;
          const off = slot * STRIDE;
          const a = o.kind === 'confetti' ? -Math.PI / 2 + (Math.random() - 0.5) * 1.9 : Math.random() * Math.PI * 2;
          const v = speed * (0.45 + Math.random() * 0.75);
          const life = o.kind === 'confetti' ? 1.3 + Math.random() * 0.7 : 0.55 + Math.random() * 0.35;
          maxLife = Math.max(maxLife, life);
          next[off] = o.x;
          next[off + 1] = o.y;
          next[off + 2] = Math.cos(a) * v;
          next[off + 3] = Math.sin(a) * v - (o.kind === 'sparkle' ? 120 : 0);
          next[off + 4] = now;
          next[off + 5] = life;
          next[off + 6] = (Math.random() - 0.5) * (o.kind === 'confetti' ? 14 : 6);
          next[off + 7] = o.kind === 'confetti' ? 0.7 + Math.random() * 0.5 : 0.5 + Math.random() * 0.6;
          nextSprites[slot] = o.kind === 'confetti' ? CONFETTI_RECT : SPARKLE_RECT;
          nextTints[slot] = Skia.Color(o.colors[n % o.colors.length] as string);
        }
        cursor.current = c % PARTICLE_CAP;
        setSprites(nextSprites);
        setTints(nextTints);
        params.set(next);
        clock.set(withTiming(now + maxLife + 0.05, { duration: (maxLife + 0.05) * 1000, easing: Easing.linear }));
      },
    }),
    [enabled, clock, params, sprites, tints],
  );

  if (!enabled || !texture) return null;
  return <Atlas image={texture} sprites={sprites} transforms={transforms} colors={tints} colorBlendMode="modulate" />;
  }),
);
