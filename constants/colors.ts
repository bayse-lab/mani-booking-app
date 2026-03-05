export const Colors = {
  // Maní Brand Palette — from Design Manual
  primary: '#1F1A15',        // Obsidian
  primaryLight: '#2e261e',
  accent: '#C4A97D',         // Gold — primary CTA accent
  accentDark: '#A8905F',
  accentLight: '#D4BC9A',
  sand: '#F0CDA9',           // Parchment
  sandLight: '#F5E8D5',      // Sand — main background
  sandDark: '#E8D4B8',       // Sand-Mid — cards, borders
  brown: '#6b4c2f',          // Medium brown
  taupe: '#B8A898',          // Brand taupe — dividers
  cream: '#F5E8D5',          // Sand (no near-whites)
  gold: '#C4A97D',           // Explicit gold token
  warmGrey: '#8A7D70',       // Body text / supporting
  tierRed: '#C8201A',        // ONLY for Maní Red tier badge

  // Semantic
  background: '#F5E8D5',     // Sand
  surface: '#F5E8D5',        // Sand
  surfaceElevated: '#F0CDA9', // Parchment
  text: '#1F1A15',           // Obsidian
  textSecondary: '#8A7D70',  // Warm-Grey
  textTertiary: '#B8A898',   // Taupe
  textOnPrimary: '#C4A97D',  // Gold on Obsidian
  textOnAccent: '#1F1A15',   // Obsidian on Gold
  border: '#E8D4B8',         // Sand-Mid
  borderLight: '#F0CDA9',    // Parchment
  error: '#C8201A',          // Functional error only
  errorLight: '#F5E8D5',     // Sand-toned error bg
  success: '#6b9e6b',        // Muted green
  successLight: '#F5E8D5',
  warning: '#C4A97D',        // Gold
  warningLight: '#F5E8D5',
  intensity: {
    1: '#6b9e6b',
    2: '#8aad5a',
    3: '#C4A97D',
    4: '#c87a3a',
    5: '#8A7D70',
  } as Record<number, string>,
  spots: {
    available: '#6b9e6b',
    limited: '#c87a3a',
    full: '#8A7D70',
  },
};
