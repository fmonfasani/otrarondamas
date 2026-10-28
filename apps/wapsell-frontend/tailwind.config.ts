import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      // WAPSELL DESIGN TOKENS - From Figma Design System v4
      // Semantic color palette - ensures consistency across tenants
      colors: {
        // Brand Primary - Orange (Used for CTAs, primary actions)
        primary: {
          50: '#FFF5F0',
          100: '#FFE8DD',
          200: '#FFD4C4',
          300: '#FFC0AB',
          400: '#FFAC92',
          500: '#F9945A', // Brand primary base
          600: '#E87D47',
          700: '#D97757', // Primary dark variant (from Figma)
          800: '#C26244',
          900: '#AB4B31',
        },

        // Neutral/Dark - Text and backgrounds
        dark: {
          50: '#F5F4F2',
          100: '#E8E5E0',
          200: '#D4CCC4',
          300: '#C0B4A8',
          400: '#9A8A7F',
          500: '#7A6A5F',
          600: '#5A4A3F',
          700: '#3A2A1F',
          800: '#1A1815', // Dark text (from Figma)
          900: '#0A0805',
        },

        // Light - Backgrounds, cards
        light: {
          50: '#FFFFFE',
          100: '#FAF9F5', // Light background (from Figma)
          200: '#F3F1ED',
          300: '#E8E5E0',
          400: '#D4CCC4',
        },

        // Gray scale - Borders, dividers, secondary text
        gray: {
          50: '#F9F9F9',
          100: '#F3F1ED', // Gray 100 (from Figma)
          200: '#E8E5E0', // Gray 200 (from Figma)
          300: '#D4CCC4',
          400: '#BFBAB4',
          500: '#999999', // Gray 500 (from Figma)
          600: '#808080',
          700: '#666666', // Gray 700 (from Figma)
          800: '#4D4D4D',
          900: '#333333',
        },

        // Status colors - Semantic meaning preserved
        success: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#145231',
        },

        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },

        error: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
          800: '#991B1B',
          900: '#7F1D1D',
        },

        info: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
        },

        // Brand secondary colors - Purple, Teal variants
        secondary: {
          50: '#F3F0FF',
          100: '#E9D5FF',
          200: '#D8B4FE',
          300: '#C084FC',
          400: '#A855F7',
          500: '#9333EA',
          600: '#7E22CE',
          700: '#6B21A8',
          800: '#581C87',
          900: '#3F0F5C',
        },

        // Accent - Teal/Green accent
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
      },

      // Typography - Font families and scales
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },

      fontSize: {
        // Heading scale
        h1: ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        h3: ['1.5rem', { lineHeight: '1.875rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        h4: ['1.25rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        h5: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        h6: ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],

        // Body text scale
        'body-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '400' }],
        'body-base': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        'body-xs': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],

        // Label scale
        'label-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
        'label-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
        'label-sm': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
      },

      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        extrabold: '800',
      },

      lineHeight: {
        tight: '1.2',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '2',
      },

      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0',
        wide: '0.02em',
        wider: '0.04em',
      },

      // Spacing scale - 8px base unit
      spacing: {
        0: '0',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        5: '1.25rem',
        6: '1.5rem',
        8: '2rem',
        10: '2.5rem',
        12: '3rem',
        16: '4rem',
        20: '5rem',
        24: '6rem',
        32: '8rem',
        40: '10rem',
        48: '12rem',
        56: '14rem',
        64: '16rem',
      },

      // Border radius - Flexible corner styles
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        base: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
        full: '9999px',
        // Card styles for tenants
        'card-sm': '0.5rem',
        'card-md': '0.75rem',
        'card-lg': '1rem',
      },

      // Box shadows - Depth system
      boxShadow: {
        // Elevation shadows
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

        // Brand shadows
        primary: '0 4px 12px 0 rgba(217, 119, 87, 0.2)',
        'primary-lg': '0 8px 24px 0 rgba(217, 119, 87, 0.25)',
        inset: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
      },

      // Transitions and animations
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
        slower: '500ms',
      },

      transitionTimingFunction: {
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      },

      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'fade-out': 'fadeOut 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '.8' },
        },
      },

      // Responsive breakpoints - Mobile-first design
      screens: {
        xs: '320px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },

      // Content width
      maxWidth: {
        xs: '20rem',
        sm: '24rem',
        md: '28rem',
        lg: '32rem',
        xl: '36rem',
        '2xl': '42rem',
        '3xl': '48rem',
        '4xl': '56rem',
        '5xl': '64rem',
        '6xl': '72rem',
        full: '100%',
        screen: '100vw',
      },

      // Container
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1rem',
          md: '1.5rem',
          lg: '2rem',
          xl: '2.5rem',
          '2xl': '3rem',
        },
      },

      // Opacity - Brand aware
      opacity: {
        0: '0',
        5: '0.05',
        10: '0.1',
        20: '0.2',
        30: '0.3',
        40: '0.4',
        50: '0.5',
        60: '0.6',
        70: '0.7',
        80: '0.8',
        90: '0.9',
        95: '0.95',
        100: '1',
      },

      // Z-index system
      zIndex: {
        auto: 'auto',
        0: '0',
        10: '10',
        20: '20',
        30: '30',
        40: '40',
        50: '50',
        75: '75',
        100: '100',
        dropdown: '1000',
        sticky: '1100',
        fixed: '1200',
        'modal-backdrop': '1300',
        modal: '1400',
        popover: '1500',
        tooltip: '1600',
      },
    },

    // Semantic color utilities
    backgroundColor: {
      // Accessible color combinations for buttons, cards, etc.
      surface: 'var(--color-light)',
      'surface-secondary': 'var(--color-gray-100)',
      'surface-tertiary': 'var(--color-gray-200)',
    },

    textColor: {
      // Text colors for readability
      primary: 'var(--color-dark)',
      secondary: 'var(--color-gray-700)',
      tertiary: 'var(--color-gray-500)',
    },

    borderColor: {
      // Border colors for inputs, dividers
      DEFAULT: 'var(--color-gray-200)',
      light: 'var(--color-gray-100)',
      dark: 'var(--color-gray-500)',
    },
  },

  // Plugins for enhanced functionality
  plugins: [
    // Custom utilities for brand-specific features
    function ({ addUtilities, theme }) {
      const newUtilities = {
        '.glass': {
          '@apply bg-white/80 backdrop-blur-md': {},
        },
        '.card-base': {
          '@apply rounded-lg bg-white shadow-base border border-gray-200': {},
        },
        '.button-base': {
          '@apply px-4 py-2.5 rounded-lg font-medium transition-all duration-base': {},
        },
        '.input-base': {
          '@apply w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent':
            {},
        },
        '.badge': {
          '@apply inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium': {},
        },
        '.text-truncate': {
          'white-space': 'nowrap',
          overflow: 'hidden',
          'text-overflow': 'ellipsis',
        },
        '.line-clamp-1': {
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: '1',
          WebkitBoxOrient: 'vertical',
        },
        '.line-clamp-2': {
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: '2',
          WebkitBoxOrient: 'vertical',
        },
        '.line-clamp-3': {
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: '3',
          WebkitBoxOrient: 'vertical',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;
