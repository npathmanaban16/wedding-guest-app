export const Colors = {
  // Primary palette — warm champagne & dusty rose
  primary: '#8B5E52',        // dusty rose
  primaryLight: '#C4907F',   // light rose
  secondary: '#C9A96E',      // champagne gold
  secondaryLight: '#E8D5B0', // soft gold

  // Backgrounds
  background: '#FBF7F4',     // warm ivory
  surface: '#FFFFFF',
  surfaceWarm: '#FFF8F5',    // warm white

  // Text
  textPrimary: '#2C2014',    // dark warm brown
  textSecondary: '#7A6852',  // medium warm brown
  textMuted: '#B0A090',      // muted

  // Accents
  sage: '#8FA68E',           // sage green
  sageDark: '#5E7A5C',
  sageLight: '#C8D9C6',

  // Neutrals
  border: '#E8DDD4',
  divider: '#F0E8E0',
  white: '#FFFFFF',
  black: '#000000',

  // Status
  success: '#5E7A5C',
  error: '#C05C5C',
  warning: '#C9A96E',
};

export const Typography = {
  // Font families — using system fonts; update with custom fonts as desired
  serif: 'Georgia',          // for headings
  sans: 'System',            // for body

  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  small: {
    shadowColor: '#2C2014',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2C2014',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#2C2014',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};
