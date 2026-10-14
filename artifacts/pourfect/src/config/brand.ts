/**
 * Product identity. The display name and Android package id live here and in app.json
 * (Expo reads app.json statically; keep both in sync).
 */
export const BRAND = {
  /** Google Play title (≤ 30 chars). */
  title: 'Pourfect: Water Sort Puzzle',
  /** Launcher / short name. */
  shortName: 'Pourfect',
  /** Android application id — cannot change after the first Play upload. */
  androidPackage: 'com.apexinteractive.pourfect',
  developer: 'Apex Interactive',
  contactEmail: 'hanannessien@gmail.com',
  version: '1.0.0',
} as const;
