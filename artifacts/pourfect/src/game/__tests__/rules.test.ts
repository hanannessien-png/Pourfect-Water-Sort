import { decodeBoard, encodeBoard, fromModel, toModel } from '../codec';
import {
  applyPour,
  canSelect,
  checkPour,
  colorTotals,
  isTubeComplete,
  isWon,
  legalPours,
  topRun,
  undoPour,
} from '../rules';
import { starsFor, starThresholds } from '../stars';

const b = (text: string) => decodeBoard(text);

describe('codec', () => {
  it('round-trips compact and model forms', () => {
    const board = b('4:aBcd,4:ab,5:,4:dddd');
    expect(encodeBoard(board)).toBe('4:aBcd,4:ab,5:,4:dddd');
    const model = toModel(board);
    expect(model[0]?.layers[1]).toEqual({ color: 1, hidden: true });
    expect(model[2]?.capacity).toBe(5);
    expect(fromModel(model)).toEqual(board);
  });

  it('rejects malformed boards', () => {
    expect(() => decodeBoard('4:abcde')).toThrow();
    expect(() => decodeBoard('9:ab')).toThrow();
    expect(() => decodeBoard('4ab')).toThrow();
  });
});

describe('pour rules', () => {
  it('moves the whole top run into an empty tube', () => {
    const board = b('4:abb,4:');
    const totals = colorTotals(board);
    const r = applyPour(board, 0, 1, totals);
    expect(r?.board.tubes).toEqual(['a', 'bb']);
    expect(r?.move.count).toBe(2);
  });

  it('partial pour when the target has less room than the run', () => {
    const board = b('4:abbb,4:cbb');
    const totals = colorTotals(board);
    const check = checkPour(board, 0, 1, totals);
    expect(check).toEqual({ ok: true, count: 1 });
    const r = applyPour(board, 0, 1, totals);
    expect(r?.board.tubes).toEqual(['abb', 'cbbb']);
  });

  it('rejects colour mismatch, full target, empty source and same tube', () => {
    const board = b('4:ab,4:ca,4:dddc,4:');
    const totals = colorTotals(board);
    expect(checkPour(board, 0, 1, totals)).toEqual({ ok: false, reason: 'color-mismatch' });
    expect(checkPour(board, 1, 2, totals)).toEqual({ ok: false, reason: 'target-full' });
    expect(checkPour(board, 3, 0, totals)).toEqual({ ok: false, reason: 'source-empty' });
    expect(checkPour(board, 0, 0, totals)).toEqual({ ok: false, reason: 'same-tube' });
  });

  it('locks completed tubes', () => {
    const board = b('4:aaaa,4:b,4:bbb');
    const totals = colorTotals(board);
    expect(isTubeComplete('aaaa', totals)).toBe(true);
    expect(canSelect(board, 0, totals)).toBe(false);
    expect(checkPour(board, 0, 1, totals)).toEqual({ ok: false, reason: 'source-complete' });
    expect(legalPours(board, totals).some((m) => m.from === 0)).toBe(false);
  });

  it('a hidden layer stops the run and is revealed when it becomes the top', () => {
    const board = b('4:cAaa,4:');
    expect(topRun('cAaa')).toBe(2);
    const totals = colorTotals(board);
    const r = applyPour(board, 0, 1, totals);
    expect(r?.board.tubes).toEqual(['ca', 'aa']);
    expect(r?.move.srcReveal).toBe(0b10);
  });

  it('reveals hidden layers when a tube becomes complete, and undo re-hides them', () => {
    const board = b('4:AAa,4:cca,4:cc');
    const totals = colorTotals(board);
    const r = applyPour(board, 1, 0, totals);
    expect(r?.board.tubes[0]).toBe('aaaa');
    expect(r?.move.tgtReveal).toBe(0b11);
    const back = undoPour(r!.board, r!.move);
    expect(back.tubes).toEqual(board.tubes);
  });

  it('undo restores the exact previous board for every legal pour', () => {
    const board = b('4:aBcd,4:dcBa,4:Cabd,4:,4:');
    const totals = colorTotals(board);
    for (const m of legalPours(board, totals)) {
      const r = applyPour(board, m.from, m.to, totals);
      expect(r).not.toBeNull();
      expect(undoPour(r!.board, r!.move)).toEqual(board);
    }
  });

  it('detects a win only when every tube is empty or complete', () => {
    expect(isWon(b('4:aaaa,4:bbbb,4:'), colorTotals(b('4:aaaa,4:bbbb,4:')))).toBe(true);
    const split = b('4:aa,4:aa,4:bbbb');
    expect(isWon(split, colorTotals(split))).toBe(false);
    const mixed = b('5:aaa,4:bbbb,6:cccccc');
    expect(isWon(mixed, colorTotals(mixed))).toBe(true);
  });
});

describe('stars', () => {
  it('uses 1.5× and 2.5× par thresholds', () => {
    expect(starsFor(15, 10)).toBe(3);
    expect(starsFor(16, 10)).toBe(2);
    expect(starsFor(25, 10)).toBe(2);
    expect(starsFor(26, 10)).toBe(1);
    expect(starThresholds(10)).toEqual({ three: 15, two: 25 });
  });
});
