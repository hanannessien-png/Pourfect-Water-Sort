import { useReducedMotion } from 'react-native-reanimated';
import { backgroundItem, liquidItem, tubeSkin } from '@/src/config/cosmetics';
import { JEWEL, PALETTES, paletteShades, type LiquidShades } from '@/src/render/palettes';
import { useSaveStore } from './useSaveStore';

const SHADES = new Map<string, LiquidShades[]>();
function shadesFor(paletteId: string): LiquidShades[] {
  let s = SHADES.get(paletteId);
  if (!s) {
    s = paletteShades(PALETTES[paletteId] ?? JEWEL);
    SHADES.set(paletteId, s);
  }
  return s;
}

/** Resolved visual preferences and equipped cosmetics (system reduce-motion applies on Auto). */
export function usePrefs() {
  const settings = useSaveStore((s) => s.save.settings);
  const equipped = useSaveStore((s) => s.save.cosmetics.equipped);
  const systemReduce = useReducedMotion();
  const reduceMotion = settings.reduceMotion === 'auto' ? systemReduce : settings.reduceMotion === 'on';
  return {
    reduceMotion,
    lowGfx: settings.graphics === 'low',
    colorBlind: settings.colorBlind,
    shades: shadesFor(liquidItem(equipped.liquid).palette),
    skin: tubeSkin(equipped.tube),
    background: backgroundItem(equipped.background),
  };
}

export { shadesFor };
