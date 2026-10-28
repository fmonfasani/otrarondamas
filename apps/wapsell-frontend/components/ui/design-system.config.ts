/**
 * Wapsell Design System Configuration
 *
 * Central definition of design tokens used across all components.
 * Update this file to maintain consistency across the design system.
 */

export const COLORS = {
  // Primary
  primary: '#D97757',
  primaryDark: '#C86543',
  primaryDarker: '#B85533',
  primaryLight: '#FFE5DC',

  // Neutral
  dark: '#1A1815',
  light: '#FAF9F5',

  // Grays
  gray100: '#F3F1ED',
  gray200: '#E8E5E0',
  gray300: '#D4D0C8',
  gray400: '#CCCCCC',
  gray500: '#999999',
  gray600: '#666666',

  // Semantic
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  danger: '#DC2626',
  info: '#3B82F6',

  // Utilities
  transparent: 'transparent',
  black: '#000000',
  white: '#FFFFFF',
} as const;

export const TYPOGRAPHY = {
  // Font family
  fontFamily: {
    sans: ['system-ui', '-apple-system', 'sans-serif'],
  },

  // Font sizes (px)
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
  },

  // Font weights
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const SPACING = {
  // Base unit: 4px
  unit: 4,
  xs: '2px', // 0.5 unit
  sm: '8px', // 2 units
  md: '12px', // 3 units
  lg: '16px', // 4 units
  xl: '24px', // 6 units
  '2xl': '32px', // 8 units
  '3xl': '48px', // 12 units
} as const;

export const RADIUS = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  full: '9999px',
} as const;

export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
} as const;

export const TRANSITIONS = {
  // Duration (ms)
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },

  // Easing functions
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    linear: 'linear',
  },
} as const;

export const BREAKPOINTS = {
  xs: '0px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

export const COMPONENT_STYLES = {
  // Button
  button: {
    base: 'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2',
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded',
      md: 'px-4 py-2 text-base rounded',
      lg: 'px-6 py-3 text-lg rounded',
    },
    variants: {
      primary: 'bg-[#D97757] hover:bg-[#C86543] active:bg-[#B85533] text-white',
      secondary: 'bg-[#F3F1ED] hover:bg-[#E8E5E0] active:bg-[#D4D0C8] text-[#1A1815]',
      danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white',
      ghost: 'bg-transparent hover:bg-[#F3F1ED] active:bg-[#E8E5E0] text-[#1A1815]',
      outline:
        'border-2 border-[#D97757] bg-transparent hover:bg-[#FFF5F2] active:bg-[#FFE5DC] text-[#D97757]',
    },
  },

  // Input
  input: {
    base: 'w-full border-2 border-[#E8E5E0] rounded focus:outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-colors duration-200 disabled:bg-[#F3F1ED] disabled:cursor-not-allowed',
    sizes: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-4 py-3 text-lg',
    },
    error: 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20',
  },

  // Card
  card: {
    base: 'rounded-lg',
    variants: {
      default: 'bg-white border border-[#E8E5E0]',
      elevated: 'bg-white shadow-md',
      outlined: 'bg-[#FAF9F5] border-2 border-[#E8E5E0]',
    },
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      none: 'p-0',
    },
  },

  // Badge
  badge: {
    base: 'inline-flex items-center gap-2 font-medium transition-opacity duration-200 rounded-full',
    sizes: {
      sm: 'px-2 py-1 text-xs',
      md: 'px-3 py-1.5 text-sm',
      lg: 'px-4 py-2 text-base',
    },
    variants: {
      default: 'bg-[#F3F1ED] text-[#1A1815] border border-[#E8E5E0]',
      primary: 'bg-[#D97757] text-white',
      success: 'bg-[#10B981] text-white',
      warning: 'bg-[#F59E0B] text-white',
      danger: 'bg-[#EF4444] text-white',
      info: 'bg-[#3B82F6] text-white',
    },
  },

  // Modal
  modal: {
    backdrop: 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4',
    dialog: 'bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto',
    sizes: {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-2xl',
    },
    header: 'flex items-center justify-between border-b border-[#E8E5E0] p-6',
    content: 'p-6',
    footer: 'border-t border-[#E8E5E0] p-6 bg-[#FAF9F5]',
  },

  // Dropdown
  dropdown: {
    base: 'relative inline-block',
    menu: 'absolute top-full mt-2 bg-white rounded-lg shadow-xl z-50 border border-[#E8E5E0] py-1',
    item: 'w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors duration-150',
    sizes: {
      sm: 'min-w-[150px]',
      md: 'min-w-[200px]',
      lg: 'min-w-[280px]',
    },
  },

  // Toast
  toast: {
    base: 'px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px]',
    types: {
      success: 'bg-[#10B981] text-white',
      error: 'bg-[#EF4444] text-white',
      warning: 'bg-[#F59E0B] text-white',
      info: 'bg-[#3B82F6] text-white',
    },
    container: {
      positions: {
        'top-left': 'top-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'top-right': 'top-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
        'bottom-right': 'bottom-4 right-4',
      },
    },
  },

  // Navigation
  navigation: {
    base: 'transition-colors duration-200 font-medium',
    variants: {
      default: {
        container: 'flex gap-1',
        item: 'px-3 py-2 rounded hover:bg-[#F3F1ED]',
      },
      pills: {
        container: 'flex gap-2',
        item: 'px-4 py-2 rounded-full hover:bg-[#F3F1ED]',
      },
      underline: {
        container: 'flex gap-4 border-b border-[#E8E5E0]',
        item: 'px-1 py-2 border-b-2 border-transparent',
      },
    },
  },

  // Header
  header: {
    base: 'transition-colors duration-200',
    variants: {
      default: 'bg-white border-b border-[#E8E5E0]',
      transparent: 'bg-transparent',
    },
    sticky: 'sticky top-0 z-40',
    shadow: 'shadow-sm',
    content: 'max-w-7xl mx-auto px-4 py-4',
  },

  // Footer
  footer: {
    base: 'transition-colors duration-200',
    variants: {
      default: 'bg-[#1A1815] text-white',
      minimal: 'bg-white border-t border-[#E8E5E0] text-[#1A1815]',
    },
    container: 'max-w-7xl mx-auto px-4 py-6',
  },
} as const;

// Utility function to merge component styles
export function getComponentClasses(
  component: keyof typeof COMPONENT_STYLES,
  variant?: string,
  size?: string,
): Record<string, string> {
  const styles = COMPONENT_STYLES[component];
  if (!styles) return {};

  const styledComponent = styles as {
    base?: string;
    variants?: Record<string, string>;
    sizes?: Record<string, string>;
  };
  const result: Record<string, string> = {
    base: styledComponent.base || '',
  };

  if (variant && styledComponent.variants?.[variant]) {
    result.variant = styledComponent.variants[variant];
  }

  if (size && styledComponent.sizes?.[size]) {
    result.size = styledComponent.sizes[size];
  }

  return result;
}

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  SHADOWS,
  TRANSITIONS,
  BREAKPOINTS,
  COMPONENT_STYLES,
};
