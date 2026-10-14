/** Small deterministic PRNG utilities (mulberry32 + FNV-1a string hashing). */

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [0, n). */
  int(n: number): number;
  /** Integer in [lo, hi] inclusive. */
  range(lo: number, hi: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: T[]): T[];
  chance(p: number): boolean;
}

export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0 || 0x9e3779b9;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (n: number): number => Math.floor(next() * n);
  return {
    next,
    int,
    range: (lo, hi) => lo + int(hi - lo + 1),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list');
      return items[int(items.length)] as (typeof items)[number];
    },
    shuffle: (items) => {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        const tmp = items[i] as (typeof items)[number];
        items[i] = items[j] as (typeof items)[number];
        items[j] = tmp;
      }
      return items;
    },
    chance: (p) => next() < p,
  };
}
