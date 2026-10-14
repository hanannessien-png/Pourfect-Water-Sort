import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { SaveStore, type KeyValueStore, type LoadSource } from './persistence';
import { defaultSave, type SaveData } from './saveData';

/**
 * Global save store. `update` applies a pure transition; persistence is debounced
 * (500 ms) or immediate for economy changes and level completion. `flush` runs when
 * the app goes to the background.
 */
const DEBOUNCE_MS = 500;
const storage = new SaveStore(AsyncStorage as unknown as KeyValueStore);
let timer: ReturnType<typeof setTimeout> | null = null;
let writing: Promise<void> = Promise.resolve();

export type PersistMode = 'debounced' | 'now';

interface SaveState {
  save: SaveData;
  ready: boolean;
  loadSource: LoadSource | null;
  hydrate: () => Promise<void>;
  update: (fn: (s: SaveData) => SaveData, mode?: PersistMode) => void;
  flush: () => Promise<void>;
  resetAll: () => Promise<void>;
  clearLoadNotice: () => void;
}

function persist(get: () => SaveState): Promise<void> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  const data = { ...get().save, lastSeenAt: Date.now() };
  writing = writing.then(() => storage.write(data)).catch((e: unknown) => console.warn('Save failed', e));
  return writing;
}

export const useSaveStore = create<SaveState>((set, get) => ({
  save: defaultSave(Date.now()),
  ready: false,
  loadSource: null,

  hydrate: async () => {
    const { data, source } = await storage.load(Date.now());
    set({ save: data, ready: true, loadSource: source });
    if (source !== 'main') await persist(get);
  },

  update: (fn, mode = 'debounced') => {
    const next = fn(get().save);
    if (next === get().save) return;
    set({ save: next });
    if (!get().ready) return;
    if (mode === 'now') {
      void persist(get);
      return;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void persist(get), DEBOUNCE_MS);
  },

  flush: () => (get().ready ? persist(get) : Promise.resolve()),

  resetAll: async () => {
    if (timer) clearTimeout(timer);
    timer = null;
    await writing;
    await storage.wipe();
    set({ save: defaultSave(Date.now()) });
    await persist(get);
  },

  clearLoadNotice: () => set({ loadSource: 'main' }),
}));

/** Read the current save outside React. */
export const getSave = (): SaveData => useSaveStore.getState().save;
