import { Skia, type SkPath } from '@shopify/react-native-skia';

/**
 * Static Skia geometry for tubes and colour-blind symbols. Built once per layout
 * change on the JS thread, never per frame.
 */

export interface TubeShape {
  w: number;
  h: number;
  /** Glass thickness. */
  g: number;
  /** Inner bottom (y of the lowest layer's bottom edge). */
  innerBottom: number;
  /** Closed outer silhouette (for glow/fill). */
  outer: SkPath;
  /** Open outline (no line across the mouth). */
  outline: SkPath;
  /** Interior clip, closed at the mouth (y = 0). */
  inner: SkPath;
  /** Interior clip that extends above the mouth (for the pouring tube's stream lip). */
  highlight: SkPath;
}

export type TubeBottom = 'round' | 'flat';

/** Open-topped U path: walls from (x0, top) down to a round or flat bottom ending at `bottom`. */
function uPath(x0: number, x1: number, top: number, bottom: number, kind: TubeBottom, close: boolean): SkPath {
  const w = x1 - x0;
  const b = Skia.PathBuilder.Make().moveTo(x0, top);
  if (kind === 'round') {
    const r = w / 2;
    b.lineTo(x0, bottom - r).arcToOval(Skia.XYWHRect(x0, bottom - 2 * r, 2 * r, 2 * r), 180, -180, false);
  } else {
    const r = w * 0.26;
    b.lineTo(x0, bottom - r)
      .arcToOval(Skia.XYWHRect(x0, bottom - 2 * r, 2 * r, 2 * r), 180, -90, false)
      .lineTo(x1 - r, bottom)
      .arcToOval(Skia.XYWHRect(x1 - 2 * r, bottom - 2 * r, 2 * r, 2 * r), 90, -90, false);
  }
  b.lineTo(x1, top);
  if (close) b.close();
  return b.build();
}

export function makeTubeShape(w: number, h: number, base: number, bottom: TubeBottom = 'round'): TubeShape {
  const g = Math.max(1.5, w * 0.06);
  const innerBottom = h - base;
  const r = bottom === 'round' ? w / 2 : w * 0.26;

  const outer = uPath(0, w, 0, h, bottom, true);
  const outline = uPath(0, w, 0, h, bottom, false);
  const inner = uPath(g, w - g, 0, innerBottom, bottom, true);

  // Glossy streak along the left wall.
  const sx = g + w * 0.1;
  const sw = Math.max(2, w * 0.11);
  const highlight = Skia.PathBuilder.Make()
    .addRRect(Skia.RRectXY(Skia.XYWHRect(sx, w * 0.22, sw, Math.max(4, h - r - w * 0.3)), sw / 2, sw / 2))
    .build();

  return { w, h, g, innerBottom, outer, outline, inner, highlight };
}

/** Colour-blind symbol for colour `index`, centred at (cx, cy) with radius r. */
export function makeSymbol(index: number, cx: number, cy: number, r: number): SkPath {
  const b = Skia.PathBuilder.Make();
  const poly = (pts: [number, number][]) => {
    b.addPoly(
      pts.map(([x, y]) => ({ x: cx + x * r, y: cy + y * r })),
      true,
    );
  };
  const regular = (n: number, rot: number, scale = 1) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      pts.push([Math.cos(a) * scale, Math.sin(a) * scale]);
    }
    poly(pts);
  };
  const star = (n: number, inner: number) => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const rr = i % 2 === 0 ? 1 : inner;
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    poly(pts);
  };
  const bar = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);

  switch (index % 16) {
    case 0:
      b.addCircle(cx, cy, r * 0.8);
      break;
    case 1:
      bar(-0.72, -0.72, 1.44, 1.44);
      break;
    case 2:
      regular(3, -Math.PI / 2);
      break;
    case 3:
      regular(4, 0, 0.95);
      break;
    case 4:
      star(5, 0.45);
      break;
    case 5:
      bar(-0.95, -0.28, 1.9, 0.56);
      bar(-0.28, -0.95, 0.56, 1.9);
      break;
    case 6:
      regular(6, 0, 0.9);
      break;
    case 7:
      regular(3, Math.PI / 2);
      break;
    case 8:
      bar(-0.95, -0.7, 1.9, 0.42);
      bar(-0.95, 0.28, 1.9, 0.42);
      break;
    case 9:
      b.addCircle(cx - r * 0.45, cy, r * 0.38);
      b.addCircle(cx + r * 0.45, cy, r * 0.38);
      break;
    case 10:
      poly([[-0.9, -0.2], [0.9, -0.2], [0.9, 0.2], [-0.9, 0.2]]);
      break;
    case 11:
      star(4, 0.38);
      break;
    case 12:
      bar(-0.2, -0.95, 0.4, 1.9);
      break;
    case 13:
      poly([[-0.9, 0.7], [0, -0.8], [0.9, 0.7], [0.45, 0.7], [0, -0.05], [-0.45, 0.7]]);
      break;
    case 14:
      b.addCircle(cx - r * 0.55, cy - r * 0.55, r * 0.3);
      b.addCircle(cx + r * 0.55, cy - r * 0.55, r * 0.3);
      b.addCircle(cx - r * 0.55, cy + r * 0.55, r * 0.3);
      b.addCircle(cx + r * 0.55, cy + r * 0.55, r * 0.3);
      break;
    default:
      regular(8, Math.PI / 8, 0.85);
      break;
  }
  return b.build();
}
