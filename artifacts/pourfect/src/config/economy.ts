/** Every economy number lives here. */
export const ECONOMY = {
  startingTokens: { undo: 10, hint: 5, tube: 3 },
  win: {
    base: 10,
    /** + min(level / 10, levelBonusCap) */
    levelBonusCap: 20,
    starBonus: { 1: 0, 2: 5, 3: 10 } as Record<1 | 2 | 3, number>,
    hardMultiplier: 2,
  },
  /** Restart asks for confirmation at this many moves or more. */
  restartConfirmMoves: 5,
} as const;

/** Coins for clearing a level for the first time. Replays earn no coins. */
export function winCoins(level: number, stars: 1 | 2 | 3, hard: boolean): number {
  const w = ECONOMY.win;
  const coins = w.base + Math.min(Math.floor(level / 10), w.levelBonusCap) + w.starBonus[stars];
  return hard ? coins * w.hardMultiplier : coins;
}
