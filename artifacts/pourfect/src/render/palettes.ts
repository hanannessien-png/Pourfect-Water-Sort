/**
 * Liquid palettes: 16 colours each, index = game colour id. The low indices are the most
 * distinct, because small boards draw their colours from the start of the list.
 */
export interface LiquidPalette {
  id: string;
  colors: readonly string[];
}

/** Default palette: deep, saturated gem tones. Index order (= colour ids) must not change. */
export const JEWEL: LiquidPalette = {
  id: 'jewel',
  colors: [
    '#EE2B47', // red — ruby
    '#2F6BFF', // blue — sapphire
    '#FFC928', // yellow — citrine
    '#17C964', // green — emerald
    '#9A4DFF', // violet — amethyst
    '#FF7A1A', // orange — amber
    '#FF4FB0', // pink — rose quartz
    '#22D3EE', // cyan — aquamarine
    '#A6E22E', // lime — peridot
    '#9A5B2E', // brown — bronze
    '#F4F1EA', // white — pearl
    '#0E9F8E', // teal — jade
    '#B0174A', // raspberry — garnet
    '#7C83FF', // periwinkle — tanzanite
    '#8C93A3', // gray — silver
    '#E9C58F', // sand — champagne
  ],
};

/** Bright sweet-shop colours. Same hue order as JEWEL so colour ids keep their meaning. */
export const CANDY: LiquidPalette = {
  id: 'candy',
  colors: [
    '#FF5A6E', '#4DA3FF', '#FFE14D', '#4BE38A', '#B57BFF', '#FF9A3D', '#FF8AD4', '#5CF1FF',
    '#CBF25A', '#C27A4A', '#FFFFFF', '#2CC7B2', '#E03A7A', '#9CA3FF', '#B4BAC6', '#F7DDB0',
  ],
};

/** Electric colours that glow against dark backgrounds. */
export const NEON: LiquidPalette = {
  id: 'neon',
  colors: [
    '#FF1F4B', '#1F5BFF', '#FFF01F', '#1FFF6A', '#B31FFF', '#FF8A00', '#FF2BD6', '#00F0FF',
    '#B6FF00', '#B5651D', '#EDEDED', '#00C2A8', '#D4005A', '#6E7BFF', '#9AA0AE', '#FFD08A',
  ],
};

/** Soft, muted gemstones (pastel but still well separated). */
export const SUNSET: LiquidPalette = {
  id: 'sunset',
  colors: [
    '#F2545B', '#3E7CB1', '#F6D04D', '#5CB85C', '#8E5EBF', '#F4874B', '#F28BB8', '#56C8D8',
    '#B5D334', '#8C5A3C', '#FBF3E4', '#2E9C8A', '#A8325E', '#8A8FE0', '#9C9AA6', '#E8C79A',
  ],
};

export const PALETTES: Record<string, LiquidPalette> = { jewel: JEWEL, candy: CANDY, neon: NEON, sunset: SUNSET };

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
    light: shade(c, 0.32),
    dark: shade(c, -0.3),
    ink: luminance(c) > 0.6 ? 'rgba(20,16,50,0.78)' : 'rgba(255,255,255,0.92)',
  }));
}
