import type { Board, CompactBoard, Layer, Tube } from './types';
import { MAX_CAPACITY, MAX_COLORS, MIN_CAPACITY } from './types';

const LOWER_A = 97;
const UPPER_A = 65;

export function layerChar(color: number, hidden: boolean): string {
  return String.fromCharCode((hidden ? UPPER_A : LOWER_A) + color);
}

/** Colour index of a layer char code (works for visible and hidden). */
export function codeColor(code: number): number {
  return code >= LOWER_A ? code - LOWER_A : code - UPPER_A;
}

export function codeHidden(code: number): boolean {
  return code < LOWER_A;
}

export function toModel(board: CompactBoard): Board {
  return board.tubes.map((t, i): Tube => {
    const layers: Layer[] = [];
    for (let k = 0; k < t.length; k++) {
      const code = t.charCodeAt(k);
      layers.push({ color: codeColor(code), hidden: codeHidden(code) });
    }
    return { capacity: board.caps[i] ?? 0, layers };
  });
}

export function fromModel(board: Board): CompactBoard {
  return {
    caps: board.map((t) => t.capacity),
    tubes: board.map((t) => t.layers.map((l) => layerChar(l.color, l.hidden)).join('')),
  };
}

/** Serialise a board to the level-file format: "4:abca,4:bcab,4:". */
export function encodeBoard(board: CompactBoard): string {
  return board.tubes.map((t, i) => `${board.caps[i]}:${t}`).join(',');
}

export class BoardFormatError extends Error {}

export function decodeBoard(text: string): CompactBoard {
  const caps: number[] = [];
  const tubes: string[] = [];
  for (const part of text.split(',')) {
    const sep = part.indexOf(':');
    if (sep <= 0) throw new BoardFormatError(`Bad tube "${part}"`);
    const cap = Number(part.slice(0, sep));
    const layers = part.slice(sep + 1);
    if (!Number.isInteger(cap) || cap < MIN_CAPACITY || cap > MAX_CAPACITY) {
      throw new BoardFormatError(`Bad capacity in "${part}"`);
    }
    if (layers.length > cap) throw new BoardFormatError(`Overfull tube "${part}"`);
    for (let k = 0; k < layers.length; k++) {
      const c = codeColor(layers.charCodeAt(k));
      if (c < 0 || c >= MAX_COLORS) throw new BoardFormatError(`Bad layer in "${part}"`);
    }
    caps.push(cap);
    tubes.push(layers);
  }
  return { caps, tubes };
}

/** Canonical key: tubes are interchangeable, so order does not matter. */
export function canonicalKey(caps: readonly number[], tubes: readonly string[], uniformCap: boolean): string {
  const parts = new Array<string>(tubes.length);
  if (uniformCap) {
    for (let i = 0; i < tubes.length; i++) parts[i] = tubes[i] as string;
  } else {
    for (let i = 0; i < tubes.length; i++) parts[i] = `${caps[i]}${tubes[i]}`;
  }
  parts.sort();
  return parts.join('|');
}
