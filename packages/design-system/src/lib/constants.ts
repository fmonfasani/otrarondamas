/**
 * Design system constants — derived from design tokens
 */

import {
  COLOR_TOKENS,
  TYPOGRAPHY_TOKENS,
  SPACING_TOKENS,
  SHADOW_TOKENS,
  BREAKPOINTS,
  type ButtonVariant,
  type ButtonSize,
  type CardVariant,
  type CornerStyle,
} from './design-tokens';

// ============================================================================
// COLOR CONSTANTS
// ============================================================================

export const COLORS = COLOR_TOKENS;

// ============================================================================
// BUTTON VARIANTS
// ============================================================================

export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand-primary text-brand-onPrimary hover:opacity-90 focus:ring-2 focus:ring-brand-focus',
  secondary: 'bg-brand-secondary text-brand-onSecondary hover:opacity-90 focus:ring-2 focus:ring-brand-focus',
  outline: 'border border-brand-border text-brand-onSurface hover:bg-brand-mutedSurface focus:ring-2 focus:ring-brand-focus',
  ghost: 'text-brand-onSurface hover:bg-brand-mutedSurface focus:ring-2 focus:ring-brand-focus',
  danger: 'bg-status-error text-white hover:opacity-90 focus:ring-2 focus:ring-status-error',
};

export const BUTTON_SIZES: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-tiny h-6',
  sm: 'px-3 py-2 text-small h-8',
  md: 'px-4 py-2 text-label h-10',
  lg: 'px-6 py-3 text-body h-12',
  xl: 'px-8 py-4 text-body h-14',
};

// ============================================================================
// CARD VARIANTS
// ============================================================================

export const CARD_VARIANTS: Record<CardVariant, string> = {
  elevated: 'bg-brand-surface shadow-lg border-0',
  outlined: 'bg-brand-surface shadow-sm border border-brand-border',
  filled: 'bg-brand-mutedSurface shadow-none border-0',
};

// ============================================================================
// CORNER STYLES
// ============================================================================

export const CORNER_STYLES: Record<CornerStyle, string> = {
  square: 'rounded-none',
  rounded: 'rounded-lg',
  pill: 'rounded-full',
};

// ============================================================================
// SPACING SCALE
// ============================================================================

export const SPACING = SPACING_TOKENS;

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const RESPONSIVE_BREAKPOINTS = BREAKPOINTS;

// ============================================================================
// TYPOGRAPHY SCALE
// ============================================================================

export const TYPOGRAPHY = TYPOGRAPHY_TOKENS;

// ============================================================================
// SHADOW SCALE
// ============================================================================

export const SHADOWS = SHADOW_TOKENS;

// ============================================================================
// ANIMATION/MOTION EASING
// ============================================================================

export const EASING = {
  easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
  easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
  easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
} as const;

// ============================================================================
// DURATION CONSTANTS
// ============================================================================

export const DURATIONS = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;
