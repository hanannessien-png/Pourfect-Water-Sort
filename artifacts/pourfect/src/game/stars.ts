/** Stars: 3★ ≤ 1.5× par, 2★ ≤ 2.5× par, else 1★. Moves = pours kept (undone pours do not count). */
export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  const p = Math.max(1, par);
  if (moves <= Math.floor(1.5 * p)) return 3;
  if (moves <= Math.floor(2.5 * p)) return 2;
  return 1;
}

/** Move count needed for each star tier (for the HUD). */
export function starThresholds(par: number): { three: number; two: number } {
  const p = Math.max(1, par);
  return { three: Math.floor(1.5 * p), two: Math.floor(2.5 * p) };
}
