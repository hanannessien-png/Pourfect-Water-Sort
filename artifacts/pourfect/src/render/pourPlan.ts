/**
 * Pour animation planning (pure math, runs once per pour on the JS thread).
 *
 * The source tube rotates around the inner corner of its lip. For a rotation θ the liquid
 * surface is a world-horizontal line; the retained volume is the area of the tube interior
 * below that line. The tilt angle is chosen so the surface sits exactly at the lip while
 * pouring, so the angle follows the fill level. Results are sampled into keyframes the
 * UI-thread worklets interpolate (no per-frame JS work, no allocations).
 */

export interface PourGeometry {
  /** Interior width / height of the source tube (height = mouth to inner bottom). */
  innerW: number;
  innerH: number;
  /** Layer height. */
  unit: number;
  /** Units in the source before the pour, and units moving. */
  srcUnits: number;
  count: number;
  /** Pivot (inner lip corner) at home (lifted) and at the pour position, world coords. */
  home: { x: number; y: number };
  rest: { x: number; y: number };
  pour: { x: number; y: number };
  /** +1 = tilt right (clockwise), -1 = tilt left (mirrored). */
  dir: 1 | -1;
}

export const PLAN_SAMPLES = 61;

export interface PourPlan {
  samples: number;
  dir: 1 | -1;
  /** Per sample: rotation (radians, ≥ 0), pivot x/y. */
  angle: number[];
  px: number[];
  py: number[];
  /** Per sample, per layer boundary j = 1..srcUnits: world Y of the top of layer j-1, relative to pivot. */
  levels: number[];
  layerCount: number;
  /** Per sample: stream width factor 0–1, target units filled 0..count. */
  stream: number[];
  fill: number[];
  /** Normalized time window of the pour phase. */
  pourStart: number;
  pourEnd: number;
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** Area of the rotated interior rect below the line Y = level (Y grows downwards). */
export function retainedArea(w: number, h: number, theta: number, level: number): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  // Corners relative to the pivot (top inner corner on the pour side), rotated.
  const xs = [0, -h * s, -w * c - h * s, -w * c];
  const ys = [0, h * c, -w * s + h * c, -w * s];
  // Sutherland–Hodgman clip against Y >= level, then shoelace.
  const ox: number[] = [];
  const oy: number[] = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    const ax = xs[i] as number;
    const ay = ys[i] as number;
    const bx = xs[j] as number;
    const by = ys[j] as number;
    const aIn = ay >= level;
    const bIn = by >= level;
    if (aIn) {
      ox.push(ax);
      oy.push(ay);
    }
    if (aIn !== bIn) {
      const t = (level - ay) / (by - ay);
      ox.push(ax + (bx - ax) * t);
      oy.push(level);
    }
  }
  let area = 0;
  for (let i = 0; i < ox.length; i++) {
    const j = (i + 1) % ox.length;
    area += (ox[i] as number) * (oy[j] as number) - (ox[j] as number) * (oy[i] as number);
  }
  return Math.abs(area) / 2;
}

/** World Y (relative to pivot) of the surface holding `area` at rotation θ. */
export function levelForArea(w: number, h: number, theta: number, area: number): number {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const ys = [0, h * c, -w * s + h * c, -w * s];
  let lo = Math.min(...ys); // full
  let hi = Math.max(...ys); // empty
  if (area <= 0) return hi;
  if (area >= w * h) return lo;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (retainedArea(w, h, theta, mid) > area) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Rotation at which the tube holds exactly `area` with the surface at the lip. */
export function angleForArea(w: number, h: number, area: number): number {
  if (area >= w * h) return 0;
  let lo = 0;
  let hi = Math.PI / 2;
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2;
    if (retainedArea(w, h, mid, 0) > area) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Pour duration in ms: scales with layers moved (400–900 ms). */
export function pourDuration(count: number): number {
  return Math.min(880, 420 + 100 * count);
}

export function buildPourPlan(g: PourGeometry): PourPlan {
  const { innerW: w, innerH: h, unit } = g;
  const unitArea = w * unit;
  const v0 = g.srcUnits;
  const v1 = g.srcUnits - g.count;
  const thetaStart = angleForArea(w, h, v0 * unitArea);
  const thetaEnd = angleForArea(w, h, Math.max(v1, 0.06) * unitArea);
  const moveEnd = 0.24;
  const pourStart = 0.32;
  const pourEnd = 0.8;
  const n = PLAN_SAMPLES;
  const angle: number[] = [];
  const px: number[] = [];
  const py: number[] = [];
  const levels: number[] = [];
  const stream: number[] = [];
  const fill: number[] = [];

  for (let k = 0; k < n; k++) {
    const t = k / (n - 1);
    let theta: number;
    let volume = v0;
    let x: number;
    let y: number;
    let st = 0;
    let f = 0;
    if (t <= moveEnd) {
      const e = easeInOut(t / moveEnd);
      x = g.home.x + (g.pour.x - g.home.x) * e;
      y = g.home.y + (g.pour.y - g.home.y) * e;
      theta = thetaStart * 0.55 * e;
    } else if (t <= pourStart) {
      const e = easeOut((t - moveEnd) / (pourStart - moveEnd));
      x = g.pour.x;
      y = g.pour.y;
      theta = thetaStart * (0.55 + 0.45 * e);
    } else if (t <= pourEnd) {
      const p = (t - pourStart) / (pourEnd - pourStart);
      const e = easeInOut(p);
      volume = v0 - g.count * e;
      x = g.pour.x;
      y = g.pour.y;
      theta = Math.max(thetaStart, angleForArea(w, h, Math.max(volume, 0.06) * unitArea));
      st = clamp01(p / 0.12) * clamp01((1 - p) / 0.14);
      f = g.count * e;
    } else {
      const e = easeInOut((t - pourEnd) / (1 - pourEnd));
      volume = v1;
      x = g.pour.x + (g.rest.x - g.pour.x) * e;
      y = g.pour.y + (g.rest.y - g.pour.y) * e;
      theta = thetaEnd * (1 - e);
      f = g.count;
    }
    angle.push(theta);
    px.push(x);
    py.push(y);
    stream.push(st);
    fill.push(f);
    for (let j = 1; j <= v0; j++) {
      levels.push(levelForArea(w, h, theta, Math.min(j, volume) * unitArea));
    }
  }
  return {
    samples: n,
    dir: g.dir,
    angle,
    px,
    py,
    levels,
    layerCount: v0,
    stream,
    fill,
    pourStart,
    pourEnd,
  };
}
