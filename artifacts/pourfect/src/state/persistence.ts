import { defaultSave, parseSave, type SaveData } from './saveData';

/**
 * Save storage with a rolling backup: every write stores the new save under the main key
 * and the previous good save under the backup key. If the main save cannot be parsed,
 * the backup is restored and the player is told.
 */
export const SAVE_KEY = 'save_v1';
export const BACKUP_KEY = 'save_v1_backup';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  multiSet(pairs: [string, string][]): Promise<void>;
  multiRemove(keys: string[]): Promise<void>;
}

export type LoadSource = 'main' | 'backup' | 'fresh' | 'reset';

export interface LoadResult {
  data: SaveData;
  source: LoadSource;
}

export class SaveStore {
  private lastGood: string | null = null;

  constructor(private readonly kv: KeyValueStore) {}

  async load(now: number): Promise<LoadResult> {
    const main = await this.kv.getItem(SAVE_KEY).catch(() => null);
    if (main !== null) {
      try {
        const data = parseSave(main, now);
        this.lastGood = main;
        return { data, source: 'main' };
      } catch {
        /* fall through to backup */
      }
    }
    const backup = await this.kv.getItem(BACKUP_KEY).catch(() => null);
    if (backup !== null) {
      try {
        const data = parseSave(backup, now);
        this.lastGood = backup;
        return { data, source: main === null ? 'main' : 'backup' };
      } catch {
        /* fall through */
      }
    }
    return { data: defaultSave(now), source: main === null && backup === null ? 'fresh' : 'reset' };
  }

  async write(data: SaveData): Promise<void> {
    const json = JSON.stringify(data);
    const pairs: [string, string][] = [[SAVE_KEY, json]];
    if (this.lastGood !== null && this.lastGood !== json) pairs.unshift([BACKUP_KEY, this.lastGood]);
    await this.kv.multiSet(pairs);
    this.lastGood = json;
  }

  async wipe(): Promise<void> {
    this.lastGood = null;
    await this.kv.multiRemove([SAVE_KEY, BACKUP_KEY]);
  }
}
