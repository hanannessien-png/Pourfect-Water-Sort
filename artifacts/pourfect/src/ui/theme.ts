/**
 * "Calm twilight" design system: deep indigo → teal backdrop, frosted cards,
 * coral/gold accents, white Fredoka type. Spacing on an 8 dp grid.
 */
export const colors = {
  bgTop: '#1B1442',
  bgMid: '#252062',
  bgBottom: '#0E4A5A',
  card: 'rgba(255,255,255,0.09)',
  cardStrong: 'rgba(255,255,255,0.14)',
  cardBorder: 'rgba(255,255,255,0.16)',
  sheet: '#211B4F',
  sheetBorder: 'rgba(255,255,255,0.12)',
  scrim: 'rgba(8,6,28,0.62)',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.72)',
  textFaint: 'rgba(255,255,255,0.48)',
  coral: '#FF7A66',
  coralDark: '#E2543F',
  gold: '#FFC94D',
  goldDark: '#E0A21F',
  teal: '#3FD6C6',
  tealDark: '#1FA597',
  danger: '#FF5D73',
  success: '#5EE6A8',
  star: '#FFD54A',
  starEmpty: 'rgba(255,255,255,0.22)',
  selectGlow: '#FFE38A',
  hint: '#7CF7E8',
} as const;

export const space = (n: number): number => n * 8;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

export const type = {
  display: { fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, color: colors.text },
  title: { fontFamily: fonts.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.textMuted },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textMuted },
} as const;

/** Minimum touch target (dp). */
export const MIN_TAP = 44;
