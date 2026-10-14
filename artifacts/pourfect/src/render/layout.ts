/**
 * Board layout (pure). Picks 1–3 rows that give the largest tubes, scales uniformly to
 * the available area and aligns tube bottoms per row (mixed capacities stand on one shelf).
 *
 * Tube geometry is expressed in multiples of the tube width W:
 *   neck (empty headroom above the top layer) = NECK·W, layer height = UNIT·W,
 *   glass bottom = BASE·W, lift when selected = LIFT·W.
 */
export const GEOM = {
  UNIT: 0.78,
  NECK: 0.42,
  BASE: 0.1,
  LIFT: 0.62,
  GAP: 0.5,
  ROW_GAP: 0.55,
  MAX_W: 72,
  MIN_W: 18,
} as const;

export interface TubeRect {
  /** Left edge of the tube body. */
  x: number;
  /** Top (mouth) of the tube. */
  y: number;
  w: number;
  h: number;
  /** Layer height. */
  unit: number;
  capacity: number;
  row: number;
  /** Generous hit box (≥ 44 dp where space allows). */
  hit: { x: number; y: number; w: number; h: number };
}

export interface BoardLayout {
  tubes: TubeRect[];
  tubeW: number;
  unit: number;
  rows: number;
  width: number;
  height: number;
}

export function tubeHeight(w: number, capacity: number): number {
  return w * (GEOM.NECK + capacity * GEOM.UNIT + GEOM.BASE);
}

function splitRows(n: number, rows: number): number[] {
  const out: number[] = [];
  let left = n;
  for (let r = 0; r < rows; r++) {
    const take = Math.ceil(left / (rows - r));
    out.push(take);
    left -= take;
  }
  return out;
}

/**
 * @param caps capacity per tube
 * @param width available width (dp)
 * @param height available height (dp)
 */
export function computeLayout(caps: readonly number[], width: number, height: number): BoardLayout {
  const n = Math.max(1, caps.length);
  const maxCap = Math.max(4, ...caps);
  let best: { rows: number; w: number } = { rows: 1, w: 0 };
  for (let rows = 1; rows <= 3; rows++) {
    if (rows > n) break;
    const perRow = Math.ceil(n / rows);
    const wByWidth = width / (perRow + (perRow + 1) * GEOM.GAP);
    const rowUnits = GEOM.NECK + maxCap * GEOM.UNIT + GEOM.BASE + GEOM.LIFT;
    const wByHeight = height / (rows * rowUnits + (rows - 1) * GEOM.ROW_GAP);
    const w = Math.min(wByWidth, wByHeight, GEOM.MAX_W);
    // Prefer fewer rows unless more rows give noticeably bigger tubes.
    if (w > best.w * 1.04) best = { rows, w };
  }
  const W = Math.max(GEOM.MIN_W, Math.floor(best.w * 2) / 2);
  const rowCounts = splitRows(n, best.rows);
  const rowH = tubeHeight(W, maxCap) + W * GEOM.LIFT;
  const blockH = best.rows * rowH + (best.rows - 1) * W * GEOM.ROW_GAP;
  const top = Math.max(0, (height - blockH) / 2);
  const gap = W * GEOM.GAP;

  const tubes: TubeRect[] = [];
  let index = 0;
  rowCounts.forEach((count, row) => {
    const rowW = count * W + (count - 1) * gap;
    const left = (width - rowW) / 2;
    const shelfY = top + row * (rowH + W * GEOM.ROW_GAP) + rowH; // bottom of tubes in this row
    for (let k = 0; k < count; k++) {
      const cap = caps[index] ?? 4;
      const h = tubeHeight(W, cap);
      const x = left + k * (W + gap);
      const y = shelfY - h;
      const hitW = Math.max(W + gap, 44);
      const hitTop = shelfY - rowH;
      tubes.push({
        x,
        y,
        w: W,
        h,
        unit: W * GEOM.UNIT,
        capacity: cap,
        row,
        hit: { x: x + W / 2 - hitW / 2, y: hitTop, w: hitW, h: rowH },
      });
      index++;
    }
  });
  return { tubes, tubeW: W, unit: W * GEOM.UNIT, rows: best.rows, width, height };
}

/** Index of the tube whose hit box contains the point (nearest centre on overlap), or -1. */
export function hitTest(layout: BoardLayout, px: number, py: number): number {
  let best = -1;
  let bestD = Infinity;
  layout.tubes.forEach((t, i) => {
    const h = t.hit;
    if (px < h.x || px > h.x + h.w || py < h.y || py > h.y + h.h) return;
    const d = Math.abs(px - (t.x + t.w / 2));
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}
