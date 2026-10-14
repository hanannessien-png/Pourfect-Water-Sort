/**
 * Scaffold-compatible tokens (used by the error fallback). The game's real design
 * system lives in src/ui/theme.ts; these mirror its "calm twilight" values.
 */
const colors = {
  light: {
    text: '#FFFFFF',
    tint: '#FF7A66',
    background: '#1B1442',
    foreground: '#FFFFFF',
    card: '#211B4F',
    cardForeground: '#FFFFFF',
    primary: '#FF7A66',
    primaryForeground: '#FFFFFF',
    secondary: '#2A2360',
    secondaryForeground: '#FFFFFF',
    muted: '#2A2360',
    mutedForeground: 'rgba(255,255,255,0.72)',
    accent: '#3FD6C6',
    accentForeground: '#05302B',
    destructive: '#FF5D73',
    destructiveForeground: '#FFFFFF',
    border: 'rgba(255,255,255,0.16)',
    input: 'rgba(255,255,255,0.16)',
  },
  radius: 16,
};

export default colors;
