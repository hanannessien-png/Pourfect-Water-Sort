import { BackHandler, Platform } from 'react-native';

/**
 * Subscribe to the Android hardware/gesture back button. Return true from the handler to
 * consume the event. No-op on other platforms (the web dev preview has no back button).
 */
export function onHardwareBack(handler: () => boolean): () => void {
  if (Platform.OS !== 'android') return () => {};
  const sub = BackHandler.addEventListener('hardwareBackPress', handler);
  return () => sub.remove();
}

export function exitApp(): void {
  if (Platform.OS === 'android') BackHandler.exitApp();
}
