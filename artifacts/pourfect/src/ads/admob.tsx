import type { AdProvider } from './provider';

/** Web / tests: the native SDK does not exist here. The Android build uses admob.native.ts. */
export function createAdMobProvider(): AdProvider | null {
  return null;
}
