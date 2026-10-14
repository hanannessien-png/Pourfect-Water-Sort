/** Keyframe sampling helpers for UI-thread worklets (no allocations). */

export function sampleAt(arr: readonly number[], t: number): number {
  'worklet';
  const n = arr.length;
  if (n === 0) return 0;
  if (n === 1) return arr[0] as number;
  const f = (t < 0 ? 0 : t > 1 ? 1 : t) * (n - 1);
  let i = Math.floor(f);
  if (i > n - 2) i = n - 2;
  const a = arr[i] as number;
  const b = arr[i + 1] as number;
  return a + (b - a) * (f - i);
}

/** levels is row-major [sample][boundary]; j is 1-based boundary index. */
export function sampleLevel(levels: readonly number[], samples: number, layerCount: number, j: number, t: number): number {
  'worklet';
  if (layerCount === 0 || samples === 0) return 0;
  const f = (t < 0 ? 0 : t > 1 ? 1 : t) * (samples - 1);
  let i = Math.floor(f);
  if (i > samples - 2) i = samples - 2;
  if (i < 0) i = 0;
  const a = levels[i * layerCount + (j - 1)] as number;
  const b = samples > 1 ? (levels[(i + 1) * layerCount + (j - 1)] as number) : a;
  return a + (b - a) * (f - i);
}
