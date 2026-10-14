/**
 * Liquid palettes: 16 colours each, index = game colour id. The low indices are the most
 * distinct, because small boards draw their colours from the start of the list.
 * (Phase 5 adds the full collection; Classic is the default equipped palette.)
 */
export interface LiquidPalette {
  id: string;
  colors: readonly string[];
}

export const CLASSIC: LiquidPalette = {
  id: 'classic',
  colors: [
    '#FF4757', // red
    '#3B82F6', // blue
    '#FFD43B', // yellow
    '#2ED47A', // green
    '#9B5CFF', // violet
    '#FF8A1F', // orange
    '#FF66C4', // pink
    '#2EE6F0', // cyan
    '#B5E61D', // lime
    '#A0673A', // brown
    '#F1F3F8', // white
    '#169C8C', // teal
    '#C2185B', // raspberry
    '#7D88FF', // periwinkle
    '#8A8F9C', // gray
    '#E8B87E', // sand
  ],
};

/** Parse "#RRGGBB" to [r,g,b] 0–255. */
export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1, 7), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function toHex(r: number, g: number, b: number): string {
  const c = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Mix towards white (amount > 0) or black (amount < 0). */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return toHex(r + (t - r) * a, g + (t - g) * a, b + (t - b) * a);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Relative luminance (0–1), used to pick dark or light symbol ink. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Precomputed shades per palette colour for liquid gradients. */
export interface LiquidShades {
  base: string;
  light: string;
  dark: string;
  /** Ink for colour-blind symbols. */
  ink: string;
}

export function paletteShades(p: LiquidPalette): LiquidShades[] {
  return p.colors.map((c) => ({
    base: c,
    light: shade(c, 0.28),
    dark: shade(c, -0.22),
    ink: luminance(c) > 0.6 ? 'rgba(20,16,50,0.78)' : 'rgba(255,255,255,0.92)',
  }));
}
