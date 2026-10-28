/**
 * Wapsell Design System Tokens
 * Based on design specification for consistency across components
 */

export const COLORS = {
  // Primary
  primary: '#D97757', // Orange
  primaryDark: '#C86543',
  primaryLight: '#E8956D',

  // Neutrals
  dark: '#141413', // Deep dark
  darkGray: '#1A1815',
  mediumGray: '#666666',
  lightGray: '#999999',
  borderGray: '#E0E0E0',
  lightBg: '#FAF9F5', // Cream
  lighterBg: '#F3F1ED',

  // Accents
  success: '#A8DB85', // Green
  warning: '#F5E07A', // Yellow
  info: '#6A9BCC', // Blue
  error: '#D97757', // Red (same as primary for now)

  // UI
  white: '#FFFFFF',
  black: '#000000',
};

export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px
  '3xl': '4rem', // 64px
};

export const BORDER_RADIUS = {
  sm: '0.375rem', // 6px
  md: '0.625rem', // 10px
  lg: '0.875rem', // 14px
  xl: '1.25rem', // 20px
  '2xl': '1.75rem', // 28px
  full: '9999px',
};

export const TYPOGRAPHY = {
  fontFamily: {
    inter: 'Inter, system-ui, -apple-system, sans-serif',
  },
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
    '8xl': '6rem', // 96px
  },
  fontWeight: {
    thin: 100,
    extralight: 200,
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
};

export const SHADOWS = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
};

export const BREAKPOINTS = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

/**
 * Responsive utilities
 */
export const RESPONSIVE = {
  container: 'max-w-6xl mx-auto',
  sectionPadding: {
    mobile: 'px-4 py-16',
    tablet: 'sm:px-6 sm:py-24',
    desktop: 'lg:px-8 lg:py-32',
  },
};

/**
 * Animation
 */
export const TRANSITIONS = {
  fast: 'transition-all duration-150',
  base: 'transition-all duration-200',
  slow: 'transition-all duration-300',
  slower: 'transition-all duration-500',
};
