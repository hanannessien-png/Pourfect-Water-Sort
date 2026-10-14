import * as Haptics from 'expo-haptics';
import { getSave } from '@/src/state/useSaveStore';

/** Haptic feedback, gated by the Settings toggle. Failures are ignored (no vibrator). */
const enabled = (): boolean => getSave().settings.haptics;

export const haptics = {
  select(): void {
    if (enabled()) void Haptics.selectionAsync().catch(() => undefined);
  },
  pour(): void {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  complete(): void {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
  },
  invalid(): void {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
  win(): void {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  button(): void {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft).catch(() => undefined);
  },
};
