/**
 * Wapsell Design System — Design Tokens
 *
 * Semantic tokens for the canonical Wapsell Design System Core.
 * These tokens form the basis for all brand theme configurations.
 *
 * Note: This is the MVP baseline. Canonical color selection is OPEN
 * per SPEC-BRAND-001 section 5.3 and resolution of CON-012.
 * The palette below uses derived semantic roles per section 5.2.
 */

// ============================================================================
// COLOR TOKENS (15 semantic roles)
// ============================================================================

export const COLOR_TOKENS = {
  // Primary brand color
  brand_primary: '#F9D82E', // Warm yellow (from tienda-online baseline)
  brand_onPrimary: '#111111', // High contrast text on primary

  // Secondary brand color
  brand_secondary: '#6B5B4D', // Warm brown
  brand_onSecondary: '#FFFFFF', // Text on secondary

  // Surface colors
  brand_surface: '#FFFFFF', // Primary background
  brand_onSurface: '#1F1F1F', // Primary text
  brand_mutedSurface: '#F5F5F2', // Soft background (from Ventas baseline)
  brand_border: '#E8E8E8', // Border color

  // Focus and interaction
  brand_focus: '#F9D82E', // Focus indicator (links to primary)

  // Status colors (system semantics, not tenant-customizable)
  status_success: '#10B981', // Success state
  status_warning: '#F59E0B', // Warning state
  status_error: '#EF4444', // Error state
  status_info: '#3B82F6', // Information state

  // Neutral grays
  neutral_50: '#F9FAFB',
  neutral_900: '#111827',
} as const;

// ============================================================================
// TYPOGRAPHY TOKENS (8 scales)
// ============================================================================

export const TYPOGRAPHY_TOKENS = {
  display: {
    fontSize: '32px',
    fontWeight: 600,
    lineHeight: '1.2',
  },
  h1: {
    fontSize: '28px',
    fontWeight: 600,
    lineHeight: '1.3',
  },
  h2: {
    fontSize: '24px',
    fontWeight: 600,
    lineHeight: '1.3',
  },
  h3: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '1.4',
  },
  body: {
    fontSize: '16px',
    fontWeight: 400,
    lineHeight: '1.5',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '1.4',
  },
  small: {
    fontSize: '12px',
    fontWeight: 400,
    lineHeight: '1.4',
  },
  tiny: {
    fontSize: '11px',
    fontWeight: 400,
    lineHeight: '1.3',
  },
} as const;

// ============================================================================
// SPACING TOKENS (5 scale)
// ============================================================================

export const SPACING_TOKENS = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const;

// ============================================================================
// SHADOW TOKENS (5 depth levels)
// ============================================================================

export const SHADOW_TOKENS = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  xxl: '0 25px 50px rgba(0, 0, 0, 0.15)',
} as const;

// ============================================================================
// COMPONENT VARIANT TYPES
// ============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type CardVariant = 'elevated' | 'outlined' | 'filled';
export type CornerStyle = 'square' | 'rounded' | 'pill';

// ============================================================================
// RESPONSIVE BREAKPOINTS
// ============================================================================

export const BREAKPOINTS = {
  xs: '320px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  xxl: '1536px',
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;
