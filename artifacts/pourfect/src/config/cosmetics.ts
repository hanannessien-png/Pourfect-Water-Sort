/**
 * Shop catalogue: tube skins, liquid palettes and backgrounds, plus booster packs and the
 * rewarded-video economy. Every price lives here. Ids are stored in saves — never rename one.
 */
import type { ImageSourcePropType } from 'react-native';

export type CosmeticKind = 'tube' | 'liquid' | 'background';

export interface TubeSkin {
  id: string;
  kind: 'tube';
  name: string;
  price: number;
  /** Bottom of the tube: round test tube or flat-bottomed vial. */
  bottom: 'round' | 'flat';
  /** Back-glass tint. */
  glass: string;
  /** Glass outline. */
  edge: string;
  /** Outline width as a fraction of the tube width. */
  edgeW: number;
  /** Lip ring gradient, top → bottom. */
  rim: readonly [string, string, string];
  /** Gloss streak opacity. */
  gloss: number;
  /** Completion cap gradient, top → bottom. */
  cap: readonly [string, string, string];
}

export interface LiquidItem {
  id: string;
  kind: 'liquid';
  name: string;
  price: number;
  palette: string;
}

export interface BackgroundItem {
  id: string;
  kind: 'background';
  name: string;
  price: number;
  image: ImageSourcePropType;
  /** Dark wash over the image so liquids stay readable (0–1). */
  dim: number;
}

export type CosmeticItem = TubeSkin | LiquidItem | BackgroundItem;

const GOLD_RIM = ['#FFF3BF', '#E7B238', '#8E560C'] as const;
const GOLD_CAP = ['#FFE79A', '#D99A26', '#7A4708'] as const;
const SILVER_RIM = ['#FFFFFF', '#C9CFDB', '#6C7385'] as const;
const SILVER_CAP = ['#F4F6FA', '#AEB5C4', '#5A6172'] as const;
const ROSE_RIM = ['#FFE1D6', '#E6A08A', '#8C4A3A'] as const;
const ROSE_CAP = ['#FFD9CC', '#D98C76', '#7A3B2C'] as const;

export const TUBE_SKINS: readonly TubeSkin[] = [
  { id: 'tube.gilded', kind: 'tube', name: 'Gilded', price: 0, bottom: 'round', glass: 'rgba(255,236,190,0.08)', edge: 'rgba(255,226,150,0.85)', edgeW: 0.04, rim: GOLD_RIM, gloss: 0.3, cap: GOLD_CAP },
  { id: 'tube.classic', kind: 'tube', name: 'Clear Glass', price: 0, bottom: 'round', glass: 'rgba(255,255,255,0.07)', edge: 'rgba(255,255,255,0.7)', edgeW: 0.035, rim: SILVER_RIM, gloss: 0.28, cap: SILVER_CAP },
  { id: 'tube.crystal', kind: 'tube', name: 'Crystal', price: 300, bottom: 'round', glass: 'rgba(150,210,255,0.14)', edge: 'rgba(190,230,255,0.95)', edgeW: 0.045, rim: SILVER_RIM, gloss: 0.45, cap: ['#E6F6FF', '#8FC9F0', '#3B6E94'] },
  { id: 'tube.rose', kind: 'tube', name: 'Rose Gold', price: 500, bottom: 'round', glass: 'rgba(255,190,170,0.1)', edge: 'rgba(255,196,176,0.9)', edgeW: 0.04, rim: ROSE_RIM, gloss: 0.32, cap: ROSE_CAP },
  { id: 'tube.vial', kind: 'tube', name: 'Royal Vial', price: 700, bottom: 'flat', glass: 'rgba(255,236,190,0.08)', edge: 'rgba(255,226,150,0.9)', edgeW: 0.045, rim: GOLD_RIM, gloss: 0.3, cap: ['#FF8FA0', '#D21F45', '#6E0A1E'] },
  { id: 'tube.obsidian', kind: 'tube', name: 'Obsidian', price: 900, bottom: 'round', glass: 'rgba(0,0,0,0.38)', edge: 'rgba(255,214,120,0.9)', edgeW: 0.05, rim: GOLD_RIM, gloss: 0.18, cap: ['#5A5A66', '#22222A', '#000000'] },
  { id: 'tube.emerald', kind: 'tube', name: 'Emerald Flask', price: 1200, bottom: 'flat', glass: 'rgba(60,220,150,0.13)', edge: 'rgba(120,255,190,0.85)', edgeW: 0.045, rim: GOLD_RIM, gloss: 0.34, cap: ['#9CFFD0', '#17A86A', '#05472B'] },
  { id: 'tube.amethyst', kind: 'tube', name: 'Amethyst', price: 1500, bottom: 'round', glass: 'rgba(170,110,255,0.16)', edge: 'rgba(214,180,255,0.92)', edgeW: 0.045, rim: GOLD_RIM, gloss: 0.36, cap: ['#E2C8FF', '#8A4DE0', '#3A1475'] },
  { id: 'tube.frost', kind: 'tube', name: 'Frost', price: 2000, bottom: 'flat', glass: 'rgba(230,245,255,0.16)', edge: 'rgba(255,255,255,0.95)', edgeW: 0.055, rim: SILVER_RIM, gloss: 0.5, cap: SILVER_CAP },
];

export const LIQUIDS: readonly LiquidItem[] = [
  { id: 'liquid.jewel', kind: 'liquid', name: 'Jewels', price: 0, palette: 'jewel' },
  { id: 'liquid.candy', kind: 'liquid', name: 'Candy', price: 400, palette: 'candy' },
  { id: 'liquid.sunset', kind: 'liquid', name: 'Sunset', price: 600, palette: 'sunset' },
  { id: 'liquid.neon', kind: 'liquid', name: 'Neon', price: 900, palette: 'neon' },
];

export const BACKGROUNDS: readonly BackgroundItem[] = [
  { id: 'bg.royal', kind: 'background', name: 'Royal Velvet', price: 0, image: require('@/assets/backgrounds/royal.jpg'), dim: 0.25 },
  { id: 'bg.gilded', kind: 'background', name: 'Gilded Night', price: 200, image: require('@/assets/backgrounds/gilded.jpg'), dim: 0.25 },
  { id: 'bg.observatory', kind: 'background', name: 'Observatory', price: 300, image: require('@/assets/backgrounds/observatory.jpg'), dim: 0.25 },
  { id: 'bg.emerald', kind: 'background', name: 'Emerald Hall', price: 400, image: require('@/assets/backgrounds/emerald.jpg'), dim: 0.3 },
  { id: 'bg.ruby', kind: 'background', name: 'Ruby Chamber', price: 500, image: require('@/assets/backgrounds/ruby.jpg'), dim: 0.3 },
  { id: 'bg.sapphire', kind: 'background', name: 'Sapphire Cave', price: 600, image: require('@/assets/backgrounds/sapphire.jpg'), dim: 0.25 },
  { id: 'bg.ocean', kind: 'background', name: 'Deep Ocean', price: 700, image: require('@/assets/backgrounds/ocean.jpg'), dim: 0.25 },
  { id: 'bg.amethyst', kind: 'background', name: 'Amethyst Geode', price: 800, image: require('@/assets/backgrounds/amethyst.jpg'), dim: 0.3 },
  { id: 'bg.garden', kind: 'background', name: 'Moon Garden', price: 900, image: require('@/assets/backgrounds/garden.jpg'), dim: 0.25 },
  { id: 'bg.aurora', kind: 'background', name: 'Aurora', price: 1000, image: require('@/assets/backgrounds/aurora.jpg'), dim: 0.25 },
  { id: 'bg.arabian', kind: 'background', name: 'Desert Palace', price: 1200, image: require('@/assets/backgrounds/arabian.jpg'), dim: 0.3 },
  { id: 'bg.obsidian', kind: 'background', name: 'Black Marble', price: 1500, image: require('@/assets/backgrounds/obsidian.jpg'), dim: 0.2 },
];

export const DEFAULT_EQUIPPED = { tube: 'tube.gilded', liquid: 'liquid.jewel', background: 'bg.royal' } as const;
export const FREE_ITEMS: readonly string[] = [...TUBE_SKINS, ...LIQUIDS, ...BACKGROUNDS].filter((i) => i.price === 0).map((i) => i.id);

const ALL = new Map<string, CosmeticItem>([...TUBE_SKINS, ...LIQUIDS, ...BACKGROUNDS].map((i) => [i.id, i]));

export function cosmetic(id: string): CosmeticItem | undefined {
  return ALL.get(id);
}

export function tubeSkin(id: string): TubeSkin {
  const it = ALL.get(id);
  return it && it.kind === 'tube' ? it : TUBE_SKINS[0]!;
}

export function backgroundItem(id: string): BackgroundItem {
  const it = ALL.get(id);
  return it && it.kind === 'background' ? it : BACKGROUNDS[0]!;
}

export function liquidItem(id: string): LiquidItem {
  const it = ALL.get(id);
  return it && it.kind === 'liquid' ? it : LIQUIDS[0]!;
}

// ---- Boosters and rewards ----------------------------------------------------------------

export type BoosterKind = 'undo' | 'hint' | 'tube';

export interface BoosterPack {
  id: string;
  booster: BoosterKind;
  amount: number;
  price: number;
}

export const BOOSTER_PACKS: readonly BoosterPack[] = [
  { id: 'pack.undo5', booster: 'undo', amount: 5, price: 100 },
  { id: 'pack.hint3', booster: 'hint', amount: 3, price: 150 },
  { id: 'pack.tube2', booster: 'tube', amount: 2, price: 200 },
  { id: 'pack.undo15', booster: 'undo', amount: 15, price: 250 },
  { id: 'pack.hint10', booster: 'hint', amount: 10, price: 400 },
  { id: 'pack.tube6', booster: 'tube', amount: 6, price: 500 },
];

export const REWARDS = {
  /** Coins for one "free coins" video. */
  videoCoins: 40,
  /** Rewarded videos per calendar day (all placements together). */
  videosPerDay: 20,
  /** Daily gift coins. */
  dailyGift: 50,
  /** A booster video gives this many of the booster. */
  videoBooster: 1,
} as const;
