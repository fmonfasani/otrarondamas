# Wapsell Design Tokens Documentation

**Version:** 1.0.0  
**Updated:** 2026-10-27  
**Status:** PRODUCTION  
**Source:** Figma Design System v4

---

## Overview

This document defines all design tokens for the Wapsell multi-business platform frontend. Design tokens are the **single source of truth** for visual design, ensuring consistency across all interfaces and enabling tenant-specific branding customization.

## Token Categories

### 1. Color Tokens

#### Primary Brand Colors

The primary brand palette (Orange) is used for:
- Primary action buttons
- Links and navigation highlights
- Focused states
- Brand identity

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-50` | #FFF5F0 | Hover background for primary elements |
| `--color-primary-100` | #FFE8DD | Light backgrounds |
| `--color-primary-200` | #FFD4C4 | Input focus backgrounds |
| `--color-primary-300` | #FFC0AB | Secondary states |
| `--color-primary-400` | #FFAC92 | Medium emphasis |
| `--color-primary-500` | #F9945A | Primary action base |
| `--color-primary-600` | #E87D47 | Hover state |
| `--color-primary-700` | #D97757 | **Brand primary (DEFAULT)** |
| `--color-primary-800` | #C26244 | Pressed state |
| `--color-primary-900` | #AB4B31 | Dark emphasis |

**Tailwind Classes:**
```css
bg-primary-700, text-primary-700, border-primary-500, hover:bg-primary-600
```

#### Dark/Text Colors

Used for text, typography, and dark backgrounds.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-dark-800` | #1A1815 | **Primary text color** |
| `--color-dark-700` | #3A2A1F | Secondary text |
| `--color-dark-600` | #5A4A3F | Tertiary text |
| `--color-dark-500` | #7A6A5F | Disabled text |

**Tailwind Classes:**
```css
text-dark-800, text-dark-700, bg-dark-800
```

#### Light/Background Colors

Used for backgrounds and light surfaces.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-light-100` | #FAF9F5 | **Primary page background** |
| `--color-light-200` | #F3F1ED | Secondary background |
| `--color-light-300` | #E8E5E0 | Tertiary background |

**Tailwind Classes:**
```css
bg-light-100, bg-light-200, bg-white
```

#### Gray Scale

Neutral colors for borders, dividers, and secondary elements.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-gray-100` | #F3F1ED | Light borders |
| `--color-gray-200` | #E8E5E0 | Medium borders |
| `--color-gray-500` | #999999 | Disabled state text |
| `--color-gray-700` | #666666 | Secondary text |

**Tailwind Classes:**
```css
border-gray-200, text-gray-700, bg-gray-100
```

#### Status Colors

Semantic colors for system feedback and states.

**Success (Green)**
- Primary: `#22C55E`
- Used for: Order confirmations, successful operations
- Tailwind: `bg-success-500, text-success-600`

**Warning (Amber)**
- Primary: `#F59E0B`
- Used for: Alerts, pending states
- Tailwind: `bg-warning-500, text-warning-600`

**Error (Red)**
- Primary: `#EF4444`
- Used for: Errors, deletions, warnings
- Tailwind: `bg-error-500, text-error-600`

**Info (Blue)**
- Primary: `#3B82F6`
- Used for: Information, help, disabled states
- Tailwind: `bg-info-500, text-info-600`

#### Secondary & Accent Colors

**Secondary (Purple)**
- Base: `#9333EA`
- Used for: Secondary actions, badges
- Tailwind: `bg-secondary-500, text-secondary-600`

**Accent (Teal)**
- Base: `#14B8A6`
- Used for: Highlights, accents, decorative elements
- Tailwind: `bg-accent-500, text-accent-600`

---

### 2. Typography Tokens

#### Font Families

| Token | Value | Usage |
|-------|-------|-------|
| `--font-sans` | Inter, system-ui | Body text, UI elements |
| `--font-heading` | Plus Jakarta Sans, system-ui | Headings (H1-H6) |
| `--font-mono` | Fira Code, monospace | Code blocks, technical content |

**Tailwind Classes:**
```css
font-sans, font-heading, font-mono
```

#### Font Sizes

| Token | Value | Line Height | Weight | Usage |
|-------|-------|-------------|--------|-------|
| `--text-h1` | 2.25rem | 2.75rem | 700 | Page headings |
| `--text-h2` | 1.875rem | 2.25rem | 700 | Section headings |
| `--text-h3` | 1.5rem | 1.875rem | 600 | Subsection headings |
| `--text-h4` | 1.25rem | 1.5rem | 600 | Small headings |
| `--text-h5` | 1.125rem | 1.5rem | 600 | Minor headings |
| `--text-h6` | 1rem | 1.5rem | 600 | Tiny headings |
| `--text-lg` | 1.125rem | 1.75rem | 400 | Large body text |
| `--text-base` | 1rem | 1.5rem | 400 | **Default body text** |
| `--text-sm` | 0.875rem | 1.25rem | 400 | Small text, labels |
| `--text-xs` | 0.75rem | 1rem | 400 | Tiny text, captions |

**Tailwind Classes:**
```css
text-h1, text-h2, text-body-base, text-label-sm
```

#### Font Weights

| Token | Value | Usage |
|-------|-------|-------|
| `font-light` | 300 | Light text emphasis |
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, emphasis |
| `font-semibold` | 600 | Headings, buttons |
| `font-bold` | 700 | Strong emphasis |

#### Line Heights

| Token | Value | Usage |
|-------|-------|-------|
| `--line-height-tight` | 1.2 | Compact headings |
| `--line-height-snug` | 1.375 | Subheadings |
| `--line-height-normal` | 1.5 | **Default body text** |
| `--line-height-relaxed` | 1.625 | Reading-heavy content |
| `--line-height-loose` | 2 | Accessible long text |

---

### 3. Spacing Tokens

Wapsell uses an 8px baseline spacing scale for consistency.

| Token | Value | Usage |
|-------|-------|-------|
| `--spacing-1` | 0.25rem (2px) | Minimal spacing |
| `--spacing-2` | 0.5rem (4px) | Tight spacing |
| `--spacing-3` | 0.75rem (6px) | Compact spacing |
| `--spacing-4` | 1rem (8px) | **Standard spacing** |
| `--spacing-5` | 1.25rem (10px) | Breathing room |
| `--spacing-6` | 1.5rem (12px) | Component spacing |
| `--spacing-8` | 2rem (16px) | Section spacing |
| `--spacing-10` | 2.5rem (20px) | Large spacing |
| `--spacing-12` | 3rem (24px) | Section breaks |
| `--spacing-16` | 4rem (32px) | Major layout spacing |

**Tailwind Classes:**
```css
p-4, m-8, gap-6, px-4, py-3, mb-6
```

---

### 4. Border Radius Tokens

Flexible corner styles supporting multiple aesthetic preferences.

| Token | Value | Usage |
|-------|-------|-------|
| `--border-radius-sm` | 0.25rem | Minimal rounding |
| `--border-radius-base` | 0.375rem | Subtle rounding |
| `--border-radius-md` | 0.5rem | **Standard rounding** |
| `--border-radius-lg` | 0.75rem | Card rounding |
| `--border-radius-xl` | 1rem | Larger elements |
| `--border-radius-2xl` | 1.5rem | Prominent rounding |
| `--border-radius-3xl` | 2rem | Maximum rounding |
| `--border-radius-full` | 9999px | Pill shape, circles |

**Tailwind Classes:**
```css
rounded-md, rounded-lg, rounded-full
```

**Component-Specific Tokens:**
- `--border-radius-card-md`: Standard card corners
- `--border-radius-card-lg`: Large card corners

---

### 5. Shadow Tokens

Elevation system for depth and hierarchy.

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `--shadow-base` | 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06) | **Default shadow** |
| `--shadow-md` | 0 4px 6px -1px rgba(0,0,0,0.1) | Medium elevation |
| `--shadow-lg` | 0 10px 15px -3px rgba(0,0,0,0.1) | Large elevation |
| `--shadow-xl` | 0 20px 25px -5px rgba(0,0,0,0.1) | Extra large |
| `--shadow-2xl` | 0 25px 50px -12px rgba(0,0,0,0.25) | Maximum elevation |
| `--shadow-primary` | 0 4px 12px rgba(217,119,87,0.2) | Brand shadow |
| `--shadow-primary-lg` | 0 8px 24px rgba(217,119,87,0.25) | Large brand shadow |
| `--shadow-inset` | inset 0 2px 4px rgba(0,0,0,0.05) | Inset shadow |

**Tailwind Classes:**
```css
shadow, shadow-lg, shadow-primary
```

---

### 6. Transition & Animation Tokens

#### Duration

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | 150ms | Quick feedback |
| `--duration-base` | 200ms | **Standard animation** |
| `--duration-slow` | 300ms | Deliberate motion |
| `--duration-slower` | 500ms | Entrance effects |

#### Animations

Pre-built animations for common interactions:

- `fade-in`: Opacity transition (200ms)
- `fade-out`: Opacity exit (200ms)
- `slide-in`: Entrance from top (300ms)
- `pulse-soft`: Gentle pulsing effect (2s loop)

**Usage:**
```css
animate-fade-in, animate-slide-in
```

---

### 7. Z-Index Scale

Consistent stacking order throughout the application.

| Token | Value | Usage |
|-------|-------|-------|
| `--z-dropdown` | 1000 | Dropdown menus |
| `--z-sticky` | 1100 | Sticky headers/footers |
| `--z-fixed` | 1200 | Fixed navigation |
| `--z-modal-backdrop` | 1300 | Modal background |
| `--z-modal` | 1400 | Modal content |
| `--z-popover` | 1500 | Popovers, tooltips-adjacent |
| `--z-tooltip` | 1600 | **Top tooltips** |

---

## Implementation Guidelines

### Using CSS Variables

Direct CSS variable usage:

```css
.component {
  color: var(--color-dark-800);
  background-color: var(--color-light-100);
  padding: var(--spacing-4);
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-base);
}
```

### Using Tailwind Classes

Preferred approach via Tailwind utility classes:

```jsx
<div className="p-4 rounded-lg bg-light-100 shadow-base">
  <h1 className="text-h3 text-dark-800 mb-4">Heading</h1>
  <p className="text-body-base text-dark-700">Body text</p>
</div>
```

### Responsive Design

Tailwind breakpoints for mobile-first design:

| Breakpoint | Value | Device |
|-----------|-------|--------|
| `xs` | 320px | Extra small phone |
| `sm` | 640px | Small phone |
| `md` | 768px | Tablet |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large desktop |

**Example:**
```jsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text size
</div>
```

---

## Semantic Color Usage

### For Backgrounds

```css
.surface { background: var(--color-light-100); }           /* Main bg */
.surface-secondary { background: var(--color-gray-100); }  /* Secondary bg */
.surface-tertiary { background: var(--color-gray-200); }   /* Tertiary bg */
```

### For Text

```css
.text-primary { color: var(--color-dark-800); }     /* Main text */
.text-secondary { color: var(--color-dark-700); }   /* Secondary text */
.text-tertiary { color: var(--color-gray-700); }    /* Tertiary text */
```

### For Borders

```css
.border { border-color: var(--color-gray-200); }       /* Standard border */
.border-light { border-color: var(--color-gray-100); } /* Light border */
.border-dark { border-color: var(--color-gray-500); }  /* Dark border */
```

---

## Component Token Combinations

### Button (Primary)

```jsx
<button className="
  px-4 py-2.5 rounded-lg
  bg-primary-700 text-white
  font-medium
  hover:bg-primary-600
  shadow-primary hover:shadow-primary-lg
  transition-all duration-base
">
  Primary Action
</button>
```

### Card

```jsx
<div className="
  rounded-lg
  bg-white
  shadow-base
  border border-gray-200
  p-6
">
  Card content
</div>
```

### Input Field

```jsx
<input
  className="
  w-full px-3 py-2
  rounded-md
  border border-gray-200
  focus:outline-none
  focus:ring-2 focus:ring-primary-500
  transition-all duration-base
"
  placeholder="Enter text..."
/>
```

### Badge

```jsx
<span className="
  inline-flex items-center
  px-2.5 py-0.5
  rounded-full
  text-sm font-medium
  bg-primary-100 text-primary-800
">
  Badge Label
</span>
```

---

## Tenant Customization

### Overridable Tokens (Per-Tenant)

The following tokens can be customized per tenant via `Empresa.configuracion`:

- `--color-primary-*`: Brand primary color
- `--color-secondary-*`: Brand secondary color  
- `--color-accent-*`: Brand accent color
- `--font-heading`: Heading font
- `--font-sans`: Body font

**Example tenant override:**
```json
{
  "theme": {
    "primary": "#FF6B35",
    "secondary": "#004E89",
    "accent": "#00A86B",
    "font_heading": "Playfair Display",
    "font_body": "Lato"
  }
}
```

### Protected Tokens

These tokens **cannot be overridden** to preserve functionality and accessibility:

- All status colors (success, warning, error, info)
- Focus ring colors
- Shadow and elevation system
- Spacing and sizing scale
- Border radius for component consistency
- Z-index scale
- Line height and letter spacing for readability

---

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards (4.5:1 for text):

✅ Dark text on light backgrounds  
✅ Light text on dark backgrounds  
✅ Status colors validated against white and gray backgrounds

### Focus States

All interactive elements include visible focus indicators:

```css
:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
}
```

### Motion

Animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Performance Optimization

### CSS Variable Loading

CSS variables are loaded once at `:root` level, reducing overall CSS bundle size compared to Tailwind-only approach.

### Dark Mode Support

Dark theme variables are conditionally loaded via media query, minimizing unused CSS.

### Caching Strategy

- Design tokens are cached by the browser
- Token changes require cache invalidation (versioning in deployment)
- CSS variables enable dynamic theming without JavaScript

---

## Maintenance & Updates

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-10-27 | Initial production release |

### Update Procedure

1. Update tokens in `tailwind.config.ts`
2. Update CSS variables in `globals.css`
3. Update this documentation
4. Test across all responsive breakpoints
5. Verify accessibility (color contrast, focus states)
6. Deploy with cache invalidation

### Deprecation Policy

Tokens will be marked deprecated 2 versions before removal, with migration guide provided.

---

## References

- **Design System:** Figma Design System v4
- **Specification:** `06-BRANDING-AND-EXPERIENCE-SPEC.md`
- **Decision Record:** `D-004-branding-design-system.md`
- **Implementation:** `tailwind.config.ts`, `globals.css`

---

## Support

For questions or suggestions regarding design tokens:

1. Check this documentation
2. Review component examples in storybook (if available)
3. Consult the Figma design file
4. Open an issue in the repository
