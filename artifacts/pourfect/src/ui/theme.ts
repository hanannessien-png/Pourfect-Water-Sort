/**
 * "Gilded Night" design system: midnight-plum surfaces framed in polished gold, jewel-toned
 * accents, cream type. Display text uses Lilita One (chunky game face); body text Fredoka.
 * Spacing on an 8 dp grid.
 */
export const colors = {
  // Surfaces
  bgTop: '#120A26',
  bgMid: '#1C1036',
  bgBottom: '#0A0618',
  night: '#0B0720',
  plum: '#2B1850',
  plumLight: '#3D2470',
  plumDark: '#170C30',
  panelTop: '#33205C',
  panelBottom: '#1A0F35',
  inset: 'rgba(5,2,18,0.45)',
  scrim: 'rgba(4,2,14,0.72)',

  // Gold (top → bottom of a bevel)
  goldHi: '#FFF4C2',
  gold: '#F7C948',
  goldMid: '#E2A62B',
  goldDeep: '#B37415',
  goldEdge: '#6B3F07',

  // Jewel accents
  emerald: '#2EDB8F',
  emeraldDeep: '#0E8F57',
  emeraldEdge: '#064D2E',
  ruby: '#F0445E',
  rubyDeep: '#B01E3A',
  rubyEdge: '#5C0A1C',
  sapphire: '#4C8DFF',
  sapphireDeep: '#2251C9',
  sapphireEdge: '#0F2766',

  // Type
  text: '#FFF7E6',
  textMuted: 'rgba(255,240,215,0.74)',
  textFaint: 'rgba(255,240,215,0.46)',
  textOnGold: '#4A2A00',
  outline: '#2A0F00',

  // Game feedback
  star: '#FFD54A',
  starEmpty: 'rgba(255,240,215,0.18)',
  selectGlow: '#FFE38A',
  hint: '#7CF7E8',
  danger: '#F0445E',
  success: '#2EDB8F',

  // Legacy aliases kept for components not yet themed
  card: 'rgba(255,240,215,0.07)',
  cardStrong: 'rgba(255,240,215,0.12)',
  cardBorder: 'rgba(247,201,72,0.28)',
} as const;

export const gradients = {
  gold: [colors.goldHi, colors.gold, colors.goldMid, colors.goldDeep] as const,
  goldRim: ['#FFF6CF', '#E8B33A', '#9C6212', '#F2CB6A'] as const,
  emerald: ['#9CFFD0', colors.emerald, colors.emeraldDeep] as const,
  ruby: ['#FFB0BD', colors.ruby, colors.rubyDeep] as const,
  sapphire: ['#BFD6FF', colors.sapphire, colors.sapphireDeep] as const,
  plum: ['#4A2D85', colors.plum, colors.plumDark] as const,
  panel: [colors.panelTop, colors.panelBottom] as const,
};

export const space = (n: number): number => n * 8;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const fonts = {
  display: 'LilitaOne_400Regular',
  regular: 'Fredoka_400Regular',
  medium: 'Fredoka_500Medium',
  semibold: 'Fredoka_600SemiBold',
  bold: 'Fredoka_700Bold',
} as const;

/** Dark outline-style shadow used on display text over gold or busy backgrounds. */
export const textOutline = {
  textShadowColor: 'rgba(30,8,0,0.85)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 1,
} as const;

export const type = {
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.text },
  heading: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 26, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text },
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, color: colors.textMuted },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.textMuted },
} as const;

/** Minimum touch target (dp). */
export const MIN_TAP = 44;
