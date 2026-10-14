import { DEFAULT_EQUIPPED, FREE_ITEMS, cosmetic, type CosmeticKind } from '@/src/config/cosmetics';
import { ECONOMY } from '@/src/config/economy';
import type { Move } from '@/src/game/types';

/**
 * One versioned save object. New fields get defaults through `sanitizeSave`, so adding a
 * field does not need a version bump; structural changes add a step to MIGRATIONS.
 */
export const SAVE_VERSION = 2;

export type GraphicsQuality = 'high' | 'low';
export type MotionPref = 'auto' | 'on' | 'off';
export type PlayMode = 'campaign' | 'endless';

export interface ResumeState {
  mode: PlayMode;
  level: number;
  /** LevelDef fields (endless boards are stored so resuming never regenerates). */
  board: string;
  par: number;
  difficulty: number;
  hard: boolean;
  maxAddTubes: number;
  history: Move[];
  addedTubes: number;
  hintsUsed: number;
  undosUsed: number;
  restarts: number;
  poursMade: number;
  elapsedMs: number;
}

export interface SaveData {
  version: number;
  createdAt: number;
  lastSeenAt: number;
  wallet: { coins: number; gems: number };
  tokens: { undo: number; hint: number; tube: number };
  progress: {
    /** Highest unlocked level (the "current" level on Home). */
    current: number;
    /** stars[level - 1] = 0..3 */
    stars: number[];
    /** bestMoves[level - 1] = fewest moves (0 = never cleared). */
    bestMoves: number[];
  };
  settings: {
    haptics: boolean;
    colorBlind: boolean;
    reduceMotion: MotionPref;
    graphics: GraphicsQuality;
  };
  cosmetics: {
    equipped: { tube: string; liquid: string; background: string; effect: string; cap: string };
    owned: string[];
  };
  tutorial: { handDone: number[]; tooltipsSeen: string[] };
  /** Daily limits. Day keys are local calendar days, "YYYY-MM-DD". */
  daily: { giftDay: string; videoDay: string; videosWatched: number };
  stats: {
    levelsWon: number;
    pours: number;
    threeStars: number;
    hintsUsed: number;
    undosUsed: number;
    tubesAdded: number;
    coinsEarned: number;
  };
  resume: ResumeState | null;
}

export function defaultSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeenAt: now,
    wallet: { coins: 0, gems: 0 },
    tokens: { ...ECONOMY.startingTokens },
    progress: { current: 1, stars: [], bestMoves: [] },
    settings: { haptics: true, colorBlind: false, reduceMotion: 'auto', graphics: 'high' },
    cosmetics: {
      equipped: { ...DEFAULT_EQUIPPED, effect: 'fx.sparkle', cap: 'cap.cork' },
      owned: [...FREE_ITEMS],
    },
    tutorial: { handDone: [], tooltipsSeen: [] },
    daily: { giftDay: '', videoDay: '', videosWatched: 0 },
    stats: { levelsWon: 0, pours: 0, threeStars: 0, hintsUsed: 0, undosUsed: 0, tubesAdded: 0, coinsEarned: 0 },
    resume: null,
  };
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, d: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.floor(v))) : d;
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const str = (v: unknown, d: string): string => (typeof v === 'string' && v.length > 0 ? v : d);
const oneOf = <T extends string>(v: unknown, opts: readonly T[], d: T): T => (opts.includes(v as T) ? (v as T) : d);
const numArr = (v: unknown, max: number): number[] =>
  Array.isArray(v) ? v.map((x) => num(x, 0, 0, max)) : [];
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

function sanitizeMove(v: unknown): Move | null {
  if (!isObj(v)) return null;
  const m = {
    from: num(v.from, -1, -1, 30),
    to: num(v.to, -1, -1, 30),
    count: num(v.count, 0, 0, 8),
    color: num(v.color, 0, 0, 15),
    srcReveal: num(v.srcReveal, 0, 0, 255),
    tgtReveal: num(v.tgtReveal, 0, 0, 255),
  };
  return m.from >= 0 && m.to >= 0 && m.count > 0 ? m : null;
}

function sanitizeResume(v: unknown): ResumeState | null {
  if (!isObj(v) || typeof v.board !== 'string') return null;
  const history = Array.isArray(v.history) ? v.history.map(sanitizeMove) : [];
  if (history.some((m) => m === null)) return null;
  return {
    mode: oneOf(v.mode, ['campaign', 'endless'] as const, 'campaign'),
    level: num(v.level, 1, 1),
    board: v.board,
    par: num(v.par, 1, 1),
    difficulty: num(v.difficulty, 0, 0, 100),
    hard: bool(v.hard, false),
    maxAddTubes: num(v.maxAddTubes, 1, 0, 3),
    history: history as Move[],
    addedTubes: num(v.addedTubes, 0, 0, 3),
    hintsUsed: num(v.hintsUsed, 0),
    undosUsed: num(v.undosUsed, 0),
    restarts: num(v.restarts, 0),
    poursMade: num(v.poursMade, 0),
    elapsedMs: num(v.elapsedMs, 0),
  };
}

/** Fill missing/invalid fields with defaults. Never throws for object input. */
export function sanitizeSave(raw: Obj, now: number): SaveData {
  const d = defaultSave(now);
  const w = isObj(raw.wallet) ? raw.wallet : {};
  const t = isObj(raw.tokens) ? raw.tokens : {};
  const p = isObj(raw.progress) ? raw.progress : {};
  const s = isObj(raw.settings) ? raw.settings : {};
  const c = isObj(raw.cosmetics) ? raw.cosmetics : {};
  const eq = isObj(c.equipped) ? c.equipped : {};
  const tu = isObj(raw.tutorial) ? raw.tutorial : {};
  const st = isObj(raw.stats) ? raw.stats : {};
  const owned = Array.from(new Set([...d.cosmetics.owned, ...strArr(c.owned)]));
  const dy = isObj(raw.daily) ? raw.daily : {};
  /** Equipped item must exist, be of the right kind and be owned; otherwise the default. */
  const equip = (v: unknown, kind: CosmeticKind, fallback: string): string => {
    const id = str(v, fallback);
    const it = cosmetic(id);
    return it && it.kind === kind && owned.includes(id) ? id : fallback;
  };
  return {
    version: SAVE_VERSION,
    createdAt: num(raw.createdAt, d.createdAt),
    lastSeenAt: num(raw.lastSeenAt, d.lastSeenAt),
    wallet: { coins: num(w.coins, 0), gems: num(w.gems, 0) },
    tokens: { undo: num(t.undo, d.tokens.undo), hint: num(t.hint, d.tokens.hint), tube: num(t.tube, d.tokens.tube) },
    progress: {
      current: num(p.current, 1, 1),
      stars: numArr(p.stars, 3),
      bestMoves: numArr(p.bestMoves, 100000),
    },
    settings: {
      haptics: bool(s.haptics, d.settings.haptics),
      colorBlind: bool(s.colorBlind, d.settings.colorBlind),
      reduceMotion: oneOf(s.reduceMotion, ['auto', 'on', 'off'] as const, d.settings.reduceMotion),
      graphics: oneOf(s.graphics, ['high', 'low'] as const, d.settings.graphics),
    },
    cosmetics: {
      equipped: {
        tube: equip(eq.tube, 'tube', d.cosmetics.equipped.tube),
        liquid: equip(eq.liquid, 'liquid', d.cosmetics.equipped.liquid),
        background: equip(eq.background, 'background', d.cosmetics.equipped.background),
        effect: str(eq.effect, d.cosmetics.equipped.effect),
        cap: str(eq.cap, d.cosmetics.equipped.cap),
      },
      owned,
    },
    tutorial: { handDone: numArr(tu.handDone, 100000), tooltipsSeen: strArr(tu.tooltipsSeen) },
    daily: {
      giftDay: typeof dy.giftDay === 'string' ? dy.giftDay : '',
      videoDay: typeof dy.videoDay === 'string' ? dy.videoDay : '',
      videosWatched: num(dy.videosWatched, 0, 0, 1000),
    },
    stats: {
      levelsWon: num(st.levelsWon, 0),
      pours: num(st.pours, 0),
      threeStars: num(st.threeStars, 0),
      hintsUsed: num(st.hintsUsed, 0),
      undosUsed: num(st.undosUsed, 0),
      tubesAdded: num(st.tubesAdded, 0),
      coinsEarned: num(st.coinsEarned, 0),
    },
    resume: sanitizeResume(raw.resume),
  };
}

/** Step n migrates a save of version n to n + 1. */
export const MIGRATIONS: Record<number, (s: Obj) => Obj> = {
  // v1 → v2: the "Gilded Night" redesign replaced the placeholder cosmetics; equip the new defaults.
  1: (s) => ({ ...s, version: 2, cosmetics: { equipped: { ...DEFAULT_EQUIPPED }, owned: [] } }),
};

export class SaveFormatError extends Error {}

/** Parse + migrate + sanitize. Throws SaveFormatError when the text is not a save. */
export function parseSave(text: string, now: number): SaveData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SaveFormatError('Save is not valid JSON');
  }
  if (!isObj(raw) || typeof raw.version !== 'number') throw new SaveFormatError('Save has no version');
  let obj: Obj = raw;
  let version = raw.version;
  if (version > SAVE_VERSION) throw new SaveFormatError(`Save version ${version} is newer than this app`);
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveFormatError(`No migration from version ${version}`);
    obj = step(obj);
    version++;
  }
  return sanitizeSave(obj, now);
}
