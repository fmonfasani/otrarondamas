# P5-1: Design System Foundation Specification

**Status**: ✅ COMPLETE  
**Commit**: 4b14626  
**Date**: 2026-10-21

## Overview

P5-1 establishes the semantic design tokens and core configuration for the Wapsell design system.

## Design Tokens

### Colors (15)

| Name | Hex | Use |
|------|-----|-----|
| primary | #3B82F6 | CTAs, highlights |
| primary-dark | #1E40AF | Hover states |
| primary-light | #DBEAFE | Backgrounds |
| success | #10B981 | Positive actions, status |
| success-dark | #047857 | Hover states |
| danger | #EF4444 | Destructive actions, errors |
| danger-dark | #DC2626 | Hover states |
| warning | #F59E0B | Caution, alerts |
| warning-dark | #D97706 | Hover states |
| info | #06B6D4 | Information, neutral |
| info-dark | #0891B2 | Hover states |
| gray-50 | #F9FAFB | Light backgrounds |
| gray-100 | #F3F4F6 | Subtle backgrounds |
| gray-900 | #111827 | Dark text |
| white | #FFFFFF | Default background |

### Typography (8 scales)

| Scale | Size | Weight | Line Height |
|-------|------|--------|-------------|
| xs | 12px | Regular | 1.5 |
| sm | 14px | Regular | 1.5 |
| base | 16px | Regular | 1.5 |
| lg | 18px | Regular | 1.625 |
| xl | 20px | Semibold | 1.75 |
| 2xl | 24px | Bold | 1.75 |
| 3xl | 30px | Bold | 1.75 |
| 4xl | 36px | Bold | 1.75 |

### Spacing (5 units)

| Unit | Size | Use |
|------|------|-----|
| xs | 4px | Micro spacing |
| sm | 8px | Component padding |
| md | 16px | Content padding |
| lg | 24px | Section margins |
| xl | 32px | Page gutters |

### Shadows (5 levels)

- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.1)
- lg: 0 10px 15px rgba(0,0,0,0.1)
- xl: 0 20px 25px rgba(0,0,0,0.1)
- 2xl: 0 25px 50px rgba(0,0,0,0.25)

## Tailwind Configuration

**File**: `packages/design-system/src/lib/tailwind.config.ts`

Extends Tailwind's default configuration with custom tokens:

```typescript
export const tailwindConfig = {
  theme: {
    extend: {
      colors: designTokens.colors,
      fontSize: designTokens.typography,
      spacing: designTokens.spacing,
      boxShadow: designTokens.shadows,
    },
  },
};
```

## Utilities

### cn() - Class Merge

**File**: `packages/design-system/src/utils/cn.ts`

Combines clsx + tailwind-merge to safely merge Tailwind classes:

```typescript
import { cn } from '@wapsell/design-system/utils/cn';

cn('px-4 py-2', 'p-8'); // → 'p-8' (conflict resolved by tailwind-merge)
```

## Exports

- `tokens` → all design tokens
- `tailwindConfig` → Tailwind configuration
- `cn()` → utility function

---

## Testing

No testable exports; tokens are data. Validation done through:
- Component tests (Button, Input, etc.) verify token usage
- Tailwind config integration tests
- Visual regression in Storybook

---

## Accessibility

- Color tokens meet WCAG 2.1 AA contrast ratios (4.5:1 text, 3:1 graphics)
- Typography scales follow accessible line-height standards
- No reliance on color alone for meaning (always paired with text/icon)

---

## Next Phases

P5-2 builds core components using these tokens.
P5-3, P5-4, P5-5 extend with advanced components and hooks.

---

**Generated**: 2026-10-21  
**Author**: Federico Monfasani
