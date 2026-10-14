import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { decodeBoard } from '../codec';
import { hasTrap } from '../traps';

describe('hasTrap', () => {
  it('finds the one-move dead end on a 2-colour, 1-empty board', () => {
    // Pouring the top red into the empty tube leaves no way to finish.
    expect(hasTrap(decodeBoard('4:eede,4:dedd,4:'))).toBe(true);
  });

  it('accepts a board with two spare tubes', () => {
    expect(hasTrap(decodeBoard('4:dede,4:eded,4:,4:'))).toBe(false);
  });

  it('the shipped tutorial levels 1–2 have no traps', () => {
    const file = JSON.parse(readFileSync(resolve(__dirname, '../../data/levels.fixed.json'), 'utf8')) as { levels: { n: number; b: string }[] };
    for (const row of file.levels.slice(0, 2)) expect(hasTrap(decodeBoard(row.b))).toBe(false);
  });
});
