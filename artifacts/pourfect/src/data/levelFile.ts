/** On-disk format of src/data/levels.fixed.json. */
export interface FixedLevelRow {
  /** Level number (1-based). */
  n: number;
  /** Board, encoded with codec.encodeBoard ("4:abca,4:bcab,4:"). */
  b: string;
  /** Par (solver's best known move count). */
  p: number;
  /** Difficulty score 0–100. */
  d: number;
  /** 1 = Hard level. */
  h: 0 | 1;
  /** Add Tube boosters allowed on this level. */
  a: number;
}

export interface FixedLevelFile {
  version: 1;
  count: number;
  levels: FixedLevelRow[];
}
