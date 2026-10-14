import { useReducedMotion } from 'react-native-reanimated';
import { CLASSIC, paletteShades } from '@/src/render/palettes';
import { useSaveStore } from './useSaveStore';

const CLASSIC_SHADES = paletteShades(CLASSIC);

/** Resolved visual preferences (system reduce-motion applies when the setting is Auto). */
export function usePrefs() {
  const settings = useSaveStore((s) => s.save.settings);
  const systemReduce = useReducedMotion();
  const reduceMotion = settings.reduceMotion === 'auto' ? systemReduce : settings.reduceMotion === 'on';
  return {
    reduceMotion,
    lowGfx: settings.graphics === 'low',
    colorBlind: settings.colorBlind,
    // Phase 5 swaps this for the equipped palette.
    shades: CLASSIC_SHADES,
  };
}
