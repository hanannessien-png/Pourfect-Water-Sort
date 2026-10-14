/**
 * Core game model. Pure TypeScript — no React, no React Native.
 *
 * Public model (used by rendering/UI):
 *   Tube  { capacity, layers[] }  layers are ordered bottom → top
 *   Layer { color, hidden }
 *
 * Internal compact form (used by rules, solver and generator for speed):
 *   CompactBoard { caps[], tubes[] } where each tube is a string, bottom → top,
 *   one char per layer: 'a'..'p' = visible colour 0..15, 'A'..'P' = hidden colour 0..15.
 * Both forms are interconvertible through codec.ts, and every rule is implemented
 * exactly once (on the compact form) so the game, the solver and the generator can
 * never disagree.
 */

export const MAX_COLORS = 16;
export const MAX_TUBES = 18;
export const MAX_LAYERS = 100;
export const MIN_CAPACITY = 3;
export const MAX_CAPACITY = 8;

export interface Layer {
  readonly color: number;
  readonly hidden: boolean;
}

export interface Tube {
  readonly capacity: number;
  readonly layers: readonly Layer[];
}

export type Board = readonly Tube[];

export interface CompactBoard {
  readonly caps: readonly number[];
  readonly tubes: readonly string[];
}

/** A pour that has been applied; contains everything needed to undo it exactly. */
export interface Move {
  readonly from: number;
  readonly to: number;
  readonly count: number;
  readonly color: number;
  /** Bitmask of layer indices in the source tube that this pour revealed. */
  readonly srcReveal: number;
  /** Bitmask of layer indices in the target tube that this pour revealed. */
  readonly tgtReveal: number;
}

export interface PourRef {
  readonly from: number;
  readonly to: number;
}

export type PourRejection =
  | 'same-tube'
  | 'source-empty'
  | 'source-complete'
  | 'target-full'
  | 'color-mismatch'
  | 'bad-index';

export type PourCheck = { ok: true; count: number } | { ok: false; reason: PourRejection };

/** Ready-to-play level definition (fixed campaign, daily, or endless). */
export interface LevelDef {
  /** Stable id, e.g. "c:42", "d:2026-10-14", "e:345". */
  readonly id: string;
  readonly board: CompactBoard;
  /** Solver's best known move count. */
  readonly par: number;
  /** Difficulty score 0–100. */
  readonly difficulty: number;
  readonly hard: boolean;
  /** How many extra empty tubes the player may add with the Add Tube booster. */
  readonly maxAddTubes: number;
}
