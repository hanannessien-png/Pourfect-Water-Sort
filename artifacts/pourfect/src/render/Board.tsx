import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Path, useFont, usePathValue } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { en } from '@/src/i18n/en';
import { codeColor, codeHidden } from '@/src/game/codec';
import { isTubeComplete } from '@/src/game/rules';
import type { CompactBoard, Move, PourRef } from '@/src/game/types';
import { HintArrow } from './HintArrow';
import { GEOM, computeLayout, hitTest, type BoardLayout } from './layout';
import type { LiquidShades } from './palettes';
import { Particles, type ParticlesHandle } from './Particles';
import { PouringTube } from './PouringTube';
import { buildPourPlan, pourDuration, type PourPlan } from './pourPlan';
import { sampleAt } from './sample';
import { makeTubeShape, type TubeShape } from './shapes';
import { TubeView } from './Tube';

const FREDOKA_BOLD = require('@expo-google-fonts/fredoka/700Bold/Fredoka_700Bold.ttf') as number;

export interface ActivePour {
  id: number;
  move: Move;
  /** Board before the pour (the committed board is passed as `board`). */
  prev: CompactBoard;
}

export interface BoardArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoardProps {
  area: BoardArea;
  board: CompactBoard;
  totals: readonly number[];
  selected: number | null;
  pour: ActivePour | null;
  onPourDone: (id: number) => void;
  onTapTube: (index: number) => void;
  hint: PourRef | null;
  shake: { index: number; key: number };
  shades: readonly LiquidShades[];
  colorBlind: boolean;
  lowGfx: boolean;
  reduceMotion: boolean;
  /** Fires once per win so the board can throw confetti. */
  winKey: number;
}

interface FxKeys {
  splash: number[];
  reveal: number[];
  revealMask: number[];
}

const emptyFx = (): FxKeys => ({ splash: [], reveal: [], revealMask: [] });

interface PourTarget {
  cx: number;
  bottom: number;
  len: number;
  unit: number;
}

/** One splash droplet bouncing on the target surface while liquid lands. */
function useDrop(k: number, plan: SharedValue<PourPlan | null>, progress: SharedValue<number>, target: SharedValue<PourTarget>, W: number) {
  const cx = useDerivedValue(() => target.value.cx + Math.sin(progress.value * 46 + k * 2.1) * W * 0.2);
  const cy = useDerivedValue(() => {
    const p = plan.value;
    const tg = target.value;
    const y1 = tg.bottom - (tg.len + (p ? sampleAt(p.fill, progress.value) : 0)) * tg.unit;
    return y1 - Math.abs(Math.sin(progress.value * 31 + k * 1.3)) * W * 0.22;
  });
  return { cx, cy };
}

function describeTube(tube: string, complete: boolean, selected: boolean): string {
  if (tube.length === 0) return en.a11y.empty;
  const parts: string[] = [];
  for (let k = 0; k < tube.length; k++) {
    const code = tube.charCodeAt(k);
    parts.push(codeHidden(code) ? en.a11y.hidden : (en.colorNames[codeColor(code)] ?? '?'));
  }
  const state = [selected ? en.a11y.selected : '', complete ? en.a11y.complete : ''].filter(Boolean).join(', ');
  return `${en.a11y.bottomToTop(parts.join(', '))}${state ? `. ${state}` : ''}`;
}

export function Board(props: BoardProps) {
  const { area, board, totals, pour, shades, lowGfx, reduceMotion } = props;
  const capsKey = board.caps.join(',');
  const layout: BoardLayout = useMemo(
    () => computeLayout(board.caps, area.width, area.height),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [capsKey, area.width, area.height],
  );
  const W = layout.tubeW;
  const shapes = useMemo(() => {
    const m = new Map<number, TubeShape>();
    for (const t of layout.tubes) {
      if (!m.has(t.capacity)) m.set(t.capacity, makeTubeShape(t.w, t.h, W * GEOM.BASE));
    }
    return m;
  }, [layout, W]);
  const font = useFont(FREDOKA_BOLD, Math.max(10, layout.unit * 0.6));

  // ---- Pour animation ------------------------------------------------------------------
  const plan = useSharedValue<PourPlan | null>(null);
  const progress = useSharedValue(0);
  const target = useSharedValue<PourTarget>({ cx: 0, bottom: 0, len: 0, unit: 1 });
  const [fx, setFx] = useState<FxKeys>(emptyFx);
  const particles = useRef<ParticlesHandle>(null);
  const lastPour = useRef<ActivePour | null>(null);

  const onPourDone = props.onPourDone;
  const finishPour = useCallback(
    (id: number) => {
      const p = lastPour.current;
      if (p && p.id === id) {
        const { move } = p;
        setFx((f) => {
          const next = { splash: f.splash.slice(), reveal: f.reveal.slice(), revealMask: f.revealMask.slice() };
          if (move.srcReveal) {
            next.reveal[move.from] = (next.reveal[move.from] ?? 0) + 1;
            next.revealMask[move.from] = move.srcReveal;
          }
          if (move.tgtReveal) {
            next.reveal[move.to] = (next.reveal[move.to] ?? 0) + 1;
            next.revealMask[move.to] = move.tgtReveal;
          }
          return next;
        });
      }
      onPourDone(id);
    },
    [onPourDone],
  );

  const pourId = pour?.id ?? -1;
  useEffect(() => {
    if (!pour) return;
    lastPour.current = pour;
    const { move, prev } = pour;
    const s = layout.tubes[move.from];
    const t = layout.tubes[move.to];
    const shape = s ? shapes.get(s.capacity) : undefined;
    if (!s || !t || !shape) {
      finishPour(pour.id);
      return;
    }
    const scx = s.x + s.w / 2;
    const tcx = t.x + t.w / 2;
    const dir: 1 | -1 = scx < tcx ? 1 : scx > tcx ? -1 : tcx < layout.width / 2 ? 1 : -1;
    const lip = dir === 1 ? s.w - shape.g : shape.g;
    const lift = W * GEOM.LIFT;
    const tLen = (prev.tubes[move.to] ?? '').length;
    const p = buildPourPlan({
      innerW: s.w - 2 * shape.g,
      innerH: shape.innerBottom,
      unit: s.unit,
      srcUnits: (prev.tubes[move.from] ?? '').length,
      count: move.count,
      home: { x: s.x + lip, y: s.y - lift },
      rest: { x: s.x + lip, y: s.y },
      pour: { x: tcx - dir * W * 0.14, y: t.y - W * 0.55 },
      dir,
    });
    const tShape = shapes.get(t.capacity);
    target.set({ cx: tcx, bottom: t.y + (tShape?.innerBottom ?? t.h), len: tLen, unit: t.unit });
    plan.set(p);
    progress.set(0);
    const id = pour.id;
    progress.set(
      withTiming(1, { duration: pourDuration(move.count), easing: Easing.linear }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(finishPour, id);
      }),
    );
    // Starting a pour is a one-shot reaction to the new `pour` prop; the splash key rides along.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFx((f) => {
      const splash = f.splash.slice();
      splash[move.to] = (splash[move.to] ?? 0) + 1;
      return { ...f, splash };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pourId]);

  // Sparkles when a pour completes a tube.
  const prevBoardRef = useRef(board);
  useEffect(() => {
    if (pour) return; // compare against the pre-pour board once the animation has finished
    const before = prevBoardRef.current;
    prevBoardRef.current = board;
    board.tubes.forEach((tube, i) => {
      const was = before.tubes[i];
      if (was === undefined || was === tube) return;
      if (isTubeComplete(tube, totals) && !isTubeComplete(was, totals)) {
        const r = layout.tubes[i];
        if (!r) return;
        const c = shades[codeColor(tube.charCodeAt(0))]?.light ?? '#fff';
        particles.current?.burst({
          x: area.x + r.x + r.w / 2,
          y: area.y + r.y - r.w * 0.2,
          count: lowGfx ? 10 : 20,
          colors: [c, '#FFFFFF', '#FFE38A'],
          kind: 'sparkle',
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, pour]);

  // Confetti on win.
  const firstWin = useRef(props.winKey);
  useEffect(() => {
    if (props.winKey === firstWin.current) return;
    const palette = shades.slice(0, 8).map((s) => s.base);
    const n = lowGfx ? 40 : 80;
    particles.current?.burst({ x: area.x + area.width * 0.3, y: area.y + area.height * 0.55, count: n / 2, colors: palette, kind: 'confetti' });
    particles.current?.burst({ x: area.x + area.width * 0.7, y: area.y + area.height * 0.55, count: n / 2, colors: palette, kind: 'confetti' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.winKey]);

  const targetFill = useDerivedValue(() => {
    const p = plan.value;
    return p ? sampleAt(p.fill, progress.value) : 0;
  });

  const stream = usePathValue((b) => {
    'worklet';
    const p = plan.value;
    if (!p) return;
    const t = progress.value;
    const sw = sampleAt(p.stream, t);
    if (sw < 0.02) return;
    const x0 = sampleAt(p.px, t);
    const y0 = sampleAt(p.py, t);
    const tg = target.value;
    const y1 = tg.bottom - (tg.len + sampleAt(p.fill, t)) * tg.unit;
    b.moveTo(x0, y0);
    b.quadTo(x0 + (tg.cx - x0) * 0.85, y0 + (y1 - y0) * 0.12, tg.cx, y1);
  });
  const streamWidth = useDerivedValue(() => {
    const p = plan.value;
    return p ? sampleAt(p.stream, progress.value) * W * 0.2 : 0;
  });
  const dropR = useDerivedValue(() => streamWidth.value * 0.32);
  const drops = [useDrop(0, plan, progress, target, W), useDrop(1, plan, progress, target, W), useDrop(2, plan, progress, target, W)];

  // Tubes past the count at mount are added tubes (Add Tube): they slide in when they mount.
  const [initialCount] = useState(board.tubes.length);

  const onTapTube = props.onTapTube;
  const tap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .maxDistance(30)
        .onEnd((e, success) => {
          if (!success) return;
          const i = hitTest(layout, e.x, e.y);
          if (i >= 0) onTapTube(i);
        }),
    [layout, onTapTube],
  );

  const pourColor = pour ? (shades[pour.move.color]?.base ?? '#fff') : '#fff';
  const hint = props.hint;
  const hintFrom = hint ? layout.tubes[hint.from] : undefined;
  const hintTo = hint ? layout.tubes[hint.to] : undefined;

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group transform={[{ translateX: area.x }, { translateY: area.y }]}>
          {layout.tubes.map((r, i) => {
            if (pour && i === pour.move.from) return null;
            const shape = shapes.get(r.capacity);
            if (!shape) return null;
            const isTarget = pour !== null && i === pour.move.to;
            const tube = (isTarget ? pour.prev.tubes[i] : board.tubes[i]) ?? '';
            return (
              <TubeView
                key={i}
                rect={r}
                shape={shape}
                layers={tube}
                shades={shades}
                font={font}
                colorBlind={props.colorBlind}
                lowGfx={lowGfx}
                reduceMotion={reduceMotion}
                selected={props.selected === i}
                complete={!isTarget && isTubeComplete(tube, totals)}
                hinted={hint !== null && hint.from === i && props.selected !== i}
                shakeKey={props.shake.index === i ? props.shake.key : 0}
                splashKey={fx.splash[i] ?? 0}
                revealKey={fx.reveal[i] ?? 0}
                revealMask={fx.revealMask[i] ?? 0}
                incoming={isTarget ? { color: pour.move.color, fill: targetFill } : null}
                slideIn={i >= initialCount}
              />
            );
          })}
          {pour && layout.tubes[pour.move.from] && shapes.get(layout.tubes[pour.move.from]!.capacity) && (
            <PouringTube
              plan={plan}
              progress={progress}
              shape={shapes.get(layout.tubes[pour.move.from]!.capacity)!}
              layers={pour.prev.tubes[pour.move.from] ?? ''}
              shades={shades}
            />
          )}
          {pour && (
            <>
              <Path path={stream} style="stroke" strokeWidth={streamWidth} strokeCap="round" color={pourColor} />
              {!reduceMotion &&
                !lowGfx &&
                drops.map((d, k) => <Circle key={k} cx={d.cx} cy={d.cy} r={dropR} color={pourColor} />)}
            </>
          )}
          {hintFrom && hintTo && !pour && (
            <HintArrow
              from={{ x: hintFrom.x + hintFrom.w / 2, y: hintFrom.y - W * (props.selected === hint?.from ? GEOM.LIFT + 0.3 : 0.3) }}
              to={{ x: hintTo.x + hintTo.w / 2, y: hintTo.y - W * 0.25 }}
              size={W}
              reduceMotion={reduceMotion}
              lowGfx={lowGfx}
            />
          )}
        </Group>
        <Particles ref={particles} enabled={!reduceMotion} />
      </Canvas>
      <GestureDetector gesture={tap}>
        <View
          style={{ position: 'absolute', left: area.x, top: area.y, width: area.width, height: area.height }}
          testID="board"
        >
          {layout.tubes.map((r, i) => {
            const tube = board.tubes[i] ?? '';
            const complete = isTubeComplete(tube, totals);
            return (
              <View
                key={i}
                accessible
                accessibilityRole="button"
                accessibilityLabel={en.a11y.tube(i + 1, describeTube(tube, complete, props.selected === i), '')}
                accessibilityHint={en.a11y.tubeHint}
                accessibilityActions={[{ name: 'activate' }]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === 'activate') onTapTube(i);
                }}
                style={{ position: 'absolute', left: r.hit.x, top: r.hit.y, width: r.hit.w, height: r.hit.h }}
              />
            );
          })}
        </View>
      </GestureDetector>
    </>
  );
}
