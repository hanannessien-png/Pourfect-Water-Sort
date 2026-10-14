import { ECONOMY, winCoins } from '@/src/config/economy';
import { recordWin, spendToken } from '../progress';
import { defaultSave } from '../saveData';

const NOW = 1_700_000_000_000;
const win = (level: number, moves: number, par: number, hard = false) => ({
  level,
  moves,
  par,
  hard,
  hintsUsed: 0,
  undosUsed: 0,
  tubesAdded: 0,
  pours: moves,
});

describe('recordWin', () => {
  it('pays coins and unlocks the next level on first clear', () => {
    const s0 = { ...defaultSave(NOW), resume: { level: 1 } as never };
    const r = recordWin(s0, win(1, 5, 5));
    expect(r.firstClear).toBe(true);
    expect(r.stars).toBe(3);
    expect(r.coins).toBe(winCoins(1, 3, false));
    expect(r.save.wallet.coins).toBe(r.coins);
    expect(r.save.progress.current).toBe(2);
    expect(r.save.progress.stars).toEqual([3]);
    expect(r.save.progress.bestMoves).toEqual([5]);
    expect(r.save.resume).toBeNull();
    expect(r.save.stats.levelsWon).toBe(1);
    expect(r.save.stats.threeStars).toBe(1);
  });

  it('pays nothing on replay, keeps the best stars and tracks a new best', () => {
    const first = recordWin(defaultSave(NOW), win(1, 12, 5)).save;
    expect(first.progress.stars[0]).toBeLessThan(3);
    const replay = recordWin(first, win(1, 5, 5));
    expect(replay.coins).toBe(0);
    expect(replay.firstClear).toBe(false);
    expect(replay.newBest).toBe(true);
    expect(replay.save.progress.stars[0]).toBe(3);
    expect(replay.save.progress.bestMoves[0]).toBe(5);
    const worse = recordWin(replay.save, win(1, 20, 5));
    expect(worse.save.progress.stars[0]).toBe(3);
    expect(worse.save.progress.bestMoves[0]).toBe(5);
    expect(worse.newBest).toBe(false);
  });

  it('does not move progress backwards when replaying an old level', () => {
    let s = defaultSave(NOW);
    for (let n = 1; n <= 4; n++) s = recordWin(s, win(n, 6, 5)).save;
    expect(s.progress.current).toBe(5);
    s = recordWin(s, win(2, 6, 5)).save;
    expect(s.progress.current).toBe(5);
  });

  it('doubles coins on hard levels', () => {
    expect(winCoins(40, 2, true)).toBe(2 * winCoins(40, 2, false));
    expect(winCoins(1000, 1, false)).toBe(ECONOMY.win.base + ECONOMY.win.levelBonusCap);
  });
});

describe('spendToken', () => {
  it('spends until empty and counts usage', () => {
    let s = { ...defaultSave(NOW), tokens: { undo: 1, hint: 0, tube: 2 } };
    expect(spendToken(s, 'hint')).toBeNull();
    s = spendToken(s, 'undo')!;
    expect(s.tokens.undo).toBe(0);
    expect(s.stats.undosUsed).toBe(1);
    expect(spendToken(s, 'undo')).toBeNull();
    s = spendToken(s, 'tube')!;
    expect(s.tokens.tube).toBe(1);
    expect(s.stats.tubesAdded).toBe(1);
  });
});
