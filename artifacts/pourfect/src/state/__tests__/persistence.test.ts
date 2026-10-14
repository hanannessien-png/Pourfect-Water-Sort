import { BACKUP_KEY, SAVE_KEY, SaveStore, type KeyValueStore } from '../persistence';
import { defaultSave, parseSave, sanitizeSave, SAVE_VERSION, SaveFormatError } from '../saveData';

class MemoryKV implements KeyValueStore {
  map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  async multiSet(pairs: [string, string][]) {
    for (const [k, v] of pairs) this.map.set(k, v);
  }
  async multiRemove(keys: string[]) {
    for (const k of keys) this.map.delete(k);
  }
}

const NOW = 1_700_000_000_000;

describe('SaveStore', () => {
  it('starts fresh, then round-trips a written save', async () => {
    const kv = new MemoryKV();
    const store = new SaveStore(kv);
    const first = await store.load(NOW);
    expect(first.source).toBe('fresh');
    expect(first.data).toEqual(defaultSave(NOW));

    const save = { ...first.data, wallet: { coins: 42, gems: 1 } };
    await store.write(save);
    const again = await new SaveStore(kv).load(NOW);
    expect(again.source).toBe('main');
    expect(again.data.wallet).toEqual({ coins: 42, gems: 1 });
  });

  it('keeps the previous good save as a backup and restores it when the main save is corrupt', async () => {
    const kv = new MemoryKV();
    const store = new SaveStore(kv);
    await store.load(NOW);
    await store.write({ ...defaultSave(NOW), wallet: { coins: 10, gems: 0 } });
    await store.write({ ...defaultSave(NOW), wallet: { coins: 20, gems: 0 } });
    expect(JSON.parse(kv.map.get(BACKUP_KEY)!).wallet.coins).toBe(10);

    kv.map.set(SAVE_KEY, '{"version":1,"wallet":'); // truncated write
    const res = await new SaveStore(kv).load(NOW);
    expect(res.source).toBe('backup');
    expect(res.data.wallet.coins).toBe(10);
  });

  it('resets when both saves are unreadable, and wipes cleanly', async () => {
    const kv = new MemoryKV();
    kv.map.set(SAVE_KEY, 'garbage');
    kv.map.set(BACKUP_KEY, '[]');
    const store = new SaveStore(kv);
    const res = await store.load(NOW);
    expect(res.source).toBe('reset');
    expect(res.data.progress.current).toBe(1);
    await store.write(res.data);
    await store.wipe();
    expect(kv.map.size).toBe(0);
  });
});

describe('save parsing', () => {
  it('rejects non-saves and saves from a newer app', () => {
    expect(() => parseSave('nope', NOW)).toThrow(SaveFormatError);
    expect(() => parseSave('{"coins":3}', NOW)).toThrow(SaveFormatError);
    expect(() => parseSave(JSON.stringify({ version: SAVE_VERSION + 1 }), NOW)).toThrow(SaveFormatError);
  });

  it('fills missing fields and clamps bad values', () => {
    const s = sanitizeSave(
      {
        version: 1,
        wallet: { coins: -5, gems: 'x' },
        tokens: { undo: 3.7 },
        progress: { current: 0, stars: [3, 9, -1] },
        settings: { reduceMotion: 'sometimes', haptics: false },
      },
      NOW,
    );
    expect(s.wallet).toEqual({ coins: 0, gems: 0 });
    expect(s.tokens.undo).toBe(3);
    expect(s.tokens.hint).toBe(defaultSave(NOW).tokens.hint);
    expect(s.progress.current).toBe(1);
    expect(s.progress.stars).toEqual([3, 3, 0]);
    expect(s.settings.reduceMotion).toBe('auto');
    expect(s.settings.haptics).toBe(false);
    expect(s.cosmetics.owned).toContain('tube.classic');
  });

  it('drops a resume with corrupt moves', () => {
    const s = sanitizeSave(
      { version: 1, resume: { level: 3, board: '4:ab,4:', history: [{ from: 0, to: 1, count: 1, color: 0 }, { from: 'x' }] } },
      NOW,
    );
    expect(s.resume).toBeNull();
    const ok = sanitizeSave({ version: 1, resume: { level: 3, board: '4:ab,4:', history: [] } }, NOW);
    expect(ok.resume?.level).toBe(3);
  });
});
