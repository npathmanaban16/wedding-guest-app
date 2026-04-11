export const Colors = {
  // Core palette — warm cream and sand (matching neha-naveen.com)
  primary: '#7A6A55',         // warm dark sand — buttons, active states
  primaryLight: '#C4B49A',    // light sand
  gold: '#C9A870',            // champagne gold accent

  background: '#F5F0E8',      // warm cream — user likes this, keeping it
  surface: '#FFFFFF',
  surfaceWarm: '#FAF8F4',     // warm white for cards

  textPrimary: '#1C1810',     // near-black warm — headings
  textSecondary: '#5A4A38',   // medium warm brown — body
  textMuted: '#9A8A78',       // muted — captions, hints

  accent: '#3A4D3A',          // deep forest green
  accentLight: '#EBF0EB',     // very pale green

  border: '#E4D9CC',          // subtle warm border
  divider: '#EDE5D8',         // very subtle divider

  error: '#A0483A',
  success: '#3A4D3A',
  white: '#FFFFFF',
  black: '#000000',
};

export const Fonts = {
  serif: 'CormorantGarant_400Regular',
  serifItalic: 'CormorantGarant_400Regular_Italic',
  serifMedium: 'CormorantGarant_500Medium',
  serifSemiBold: 'CormorantGarant_600SemiBold',
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
};

export const Typography = {
  // Kept for legacy references — use Fonts.* for new code
  serif: 'CormorantGarant_600SemiBold',
  sans: 'DMSans_400Regular',

  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 21,
  xl: 26,
  xxl: 34,
  xxxl: 46,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  small: {
    shadowColor: '#1C1810',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#1C1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#1C1810',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
  },
};
