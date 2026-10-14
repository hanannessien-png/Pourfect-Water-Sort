import { winCoins } from '@/src/config/economy';
import { starsFor } from '@/src/game/stars';
import type { SaveData } from './saveData';

/** Pure save transitions for level results (unit-tested). */

export interface WinResult {
  save: SaveData;
  stars: 1 | 2 | 3;
  coins: number;
  firstClear: boolean;
  newBest: boolean;
}

export interface WinInput {
  level: number;
  moves: number;
  par: number;
  hard: boolean;
  hintsUsed: number;
  undosUsed: number;
  tubesAdded: number;
  pours: number;
}

export function starsOf(save: SaveData, level: number): number {
  return save.progress.stars[level - 1] ?? 0;
}

export function recordWin(save: SaveData, input: WinInput): WinResult {
  const { level, moves, par, hard } = input;
  const stars = starsFor(moves, par);
  const prevStars = starsOf(save, level);
  const firstClear = prevStars === 0;
  const coins = firstClear ? winCoins(level, stars, hard) : 0;
  const starsArr = save.progress.stars.slice();
  const best = save.progress.bestMoves.slice();
  while (starsArr.length < level) starsArr.push(0);
  while (best.length < level) best.push(0);
  starsArr[level - 1] = Math.max(prevStars, stars);
  const prevBest = best[level - 1] ?? 0;
  const newBest = prevBest === 0 || moves < prevBest;
  if (newBest) best[level - 1] = moves;
  return {
    stars,
    coins,
    firstClear,
    newBest: newBest && !firstClear,
    save: {
      ...save,
      wallet: { ...save.wallet, coins: save.wallet.coins + coins },
      progress: {
        current: Math.max(save.progress.current, level + 1),
        stars: starsArr,
        bestMoves: best,
      },
      stats: {
        ...save.stats,
        levelsWon: save.stats.levelsWon + 1,
        pours: save.stats.pours + input.pours,
        threeStars: save.stats.threeStars + (stars === 3 && prevStars < 3 ? 1 : 0),
        coinsEarned: save.stats.coinsEarned + coins,
      },
      resume: null,
    },
  };
}

export type TokenKind = 'undo' | 'hint' | 'tube';

export function spendToken(save: SaveData, kind: TokenKind): SaveData | null {
  if (save.tokens[kind] <= 0) return null;
  const statKey = kind === 'undo' ? 'undosUsed' : kind === 'hint' ? 'hintsUsed' : 'tubesAdded';
  return {
    ...save,
    tokens: { ...save.tokens, [kind]: save.tokens[kind] - 1 },
    stats: { ...save.stats, [statKey]: save.stats[statKey] + 1 },
  };
}
