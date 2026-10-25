/**
 * Wapsell Design System — Tailwind Configuration
 *
 * Extends Tailwind with semantic design tokens from the Wapsell Design System.
 * Does not override default utilities; only extends with custom tokens.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand
        'brand-primary': 'var(--color-brand-primary)',
        'brand-onPrimary': 'var(--color-brand-onPrimary)',

        // Secondary brand
        'brand-secondary': 'var(--color-brand-secondary)',
        'brand-onSecondary': 'var(--color-brand-onSecondary)',

        // Surfaces
        'brand-surface': 'var(--color-brand-surface)',
        'brand-onSurface': 'var(--color-brand-onSurface)',
        'brand-mutedSurface': 'var(--color-brand-mutedSurface)',
        'brand-border': 'var(--color-brand-border)',

        // Focus
        'brand-focus': 'var(--color-brand-focus)',

        // Status
        'status-success': 'var(--color-status-success)',
        'status-warning': 'var(--color-status-warning)',
        'status-error': 'var(--color-status-error)',
        'status-info': 'var(--color-status-info)',

        // Neutral
        'neutral-50': 'var(--color-neutral-50)',
        'neutral-900': 'var(--color-neutral-900)',
      },

      fontFamily: {
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      },

      fontSize: {
        display: ['var(--font-display-size)', { lineHeight: 'var(--font-display-lineHeight)', fontWeight: 'var(--font-display-weight)' }],
        h1: ['var(--font-h1-size)', { lineHeight: 'var(--font-h1-lineHeight)', fontWeight: 'var(--font-h1-weight)' }],
        h2: ['var(--font-h2-size)', { lineHeight: 'var(--font-h2-lineHeight)', fontWeight: 'var(--font-h2-weight)' }],
        h3: ['var(--font-h3-size)', { lineHeight: 'var(--font-h3-lineHeight)', fontWeight: 'var(--font-h3-weight)' }],
        body: ['var(--font-body-size)', { lineHeight: 'var(--font-body-lineHeight)', fontWeight: 'var(--font-body-weight)' }],
        label: ['var(--font-label-size)', { lineHeight: 'var(--font-label-lineHeight)', fontWeight: 'var(--font-label-weight)' }],
        small: ['var(--font-small-size)', { lineHeight: 'var(--font-small-lineHeight)', fontWeight: 'var(--font-small-weight)' }],
        tiny: ['var(--font-tiny-size)', { lineHeight: 'var(--font-tiny-lineHeight)', fontWeight: 'var(--font-tiny-weight)' }],
      },

      spacing: {
        xs: 'var(--spacing-xs)',
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
        xl: 'var(--spacing-xl)',
      },

      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        xxl: 'var(--shadow-xxl)',
      },

      animation: {
        slideIn: 'slideIn 300ms cubic-bezier(0.215, 0.61, 0.355, 1)',
        fadeIn: 'fadeIn 200ms cubic-bezier(0.645, 0.045, 0.355, 1)',
      },

      keyframes: {
        slideIn: {
          '0%': {
            transform: 'translateY(10px)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
          },
          '100%': {
            opacity: '1',
          },
        },
      },

      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
};
