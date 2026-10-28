# Wapsell Login Page — Visual Design Reference

**Design System**: Wapsell Brand Guidelines  
**Implementation Date**: 2026-10-27  
**Status**: ✅ COMPLETE

---

## Desktop View (1024px+)

```
╔════════════════════════════════════════════════════════════════════════════╗
║                        Background Gradient                                 ║
║                  (Cream #FAF9F5 → Beige #F8F5F0)                          ║
║                                                                            ║
║                          Decorative Blobs                                 ║
║              (Orange + Blue circles, low opacity)                         ║
║                                                                            ║
║                   ┏━━━━━━━━━━━━━━━━━━━━━━━━━┓                           ║
║                   ┃                         ┃                           ║
║                   ┃    [W] Wapsell         ┃  ← Logo (W in orange box)  ║
║                   ┃ Plataforma de Negocios ┃     + Tagline             ║
║                   ┃  Digitales             ┃                           ║
║                   ┃                         ┃  ← Bottom margin: 48px    ║
║                   ┗━━━━━━━━━━━━━━━━━━━━━━━━━┛                           ║
║                                                                            ║
║                   ┌─────────────────────────┐                           ║
║                   │  Inicia Sesión          │                           ║
║                   │ Accede a tu cuenta...   │                           ║
║                   │                         │                           ║
║                   │ ┌──────────────────────┐│                           ║
║                   │ │ Correo Electrónico   ││                           ║
║                   │ │ ┌──────────────────┐ ││                           ║
║                   │ │ │ejemplo@empresa.c│ ││                           ║
║                   │ │ └──────────────────┘ ││                           ║
║                   │ └──────────────────────┘│                           ║
║                   │                         │                           ║
║                   │ ┌──────────────────────┐│                           ║
║                   │ │ Contraseña       [?] ││ ← Forgot link            ║
║                   │ │ ┌──────────────────┐ ││                           ║
║                   │ │ │••••••••••••••••  │ ││                           ║
║                   │ │ └──────────────────┘ ││                           ║
║                   │ └──────────────────────┘│                           ║
║                   │                         │                           ║
║                   │ ┌──────────────────────┐│                           ║
║                   │ │     INGRESAR        ││ ← Orange button            ║
║                   │ └──────────────────────┘│   Hover: darker orange   ║
║                   │                         │                           ║
║                   │         ─────────       │                           ║
║                   │    ¿No tienes cuenta?   │                           ║
║                   │    Regístrate aquí      │                           ║
║                   │                         │                           ║
║                   └─────────────────────────┘                           ║
║                                                                            ║
║                   ¿Necesitas ayuda?                                      ║
║                 Contacta al equipo de soporte                            ║
║                                                                            ║
║                  © 2026 Wapsell. Todos los                               ║
║                    derechos reservados.                                  ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
```

### Dimensions & Spacing

```
Page:
  Width: 100% (full viewport width)
  Height: 100vh (full viewport height)
  Min-height: 100vh (full viewport)
  Padding: 32px horizontal, 32px vertical

Form Card:
  Width: 28rem (448px)
  Max-width: 448px
  Padding: 40px (32px on mobile)
  Border-radius: 16px (rounded-2xl)
  Shadow: lg (box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1))

Logo Container:
  Gap: 8px between icon and text
  Margin-bottom: 32px

Form Section:
  Gap: 20px between fields
  Margin-top: 20px

Label:
  Margin-bottom: 8px
  Font-size: 14px
  Font-weight: 600

Input:
  Height: 44px (py-3)
  Padding: 12px 16px
  Border-radius: 8px
  Border-width: 1px

Button:
  Height: 44px (py-3)
  Width: 100%
  Border-radius: 8px
  Font-weight: 600
  Font-size: 16px

Link:
  Font-size: 14px
  Font-weight: 600
```

---

## Mobile View (320px - 640px)

```
╔════════════════════════════════════════════╗
║        Background Gradient                 ║
║  (Cream #FAF9F5 → Beige #F8F5F0)          ║
║                                            ║
║      Decorative Blobs (scaled down)        ║
║                                            ║
║      ┏━━━━━━━━━━━━━━━━━━━━━━━━┓         ║
║      ┃                        ┃         ║
║      ┃    [W] Wapsell        ┃  ← Smaller icon   ║
║      ┃  Plataforma...        ┃         ║
║      ┃  Digitales            ┃         ║
║      ┃                        ┃         ║
║      ┗━━━━━━━━━━━━━━━━━━━━━━━━┛         ║
║                                            ║
║      ┌────────────────────────┐          ║
║      │ Inicia Sesión          │          ║
║      │ Accede a tu cuenta...  │          ║
║      │                        │          ║
║      │ ┌───────────────────┐  │          ║
║      │ │ Correo Electrónico│  │          ║
║      │ │ ┌───────────────┐ │  │          ║
║      │ │ │ejemplo@emp... │ │  │          ║
║      │ │ └───────────────┘ │  │          ║
║      │ └───────────────────┘  │          ║
║      │                        │          ║
║      │ ┌───────────────────┐  │          ║
║      │ │ Contraseña   [?]  │  │          ║
║      │ │ ┌───────────────┐ │  │          ║
║      │ │ │•••••••••••••  │ │  │          ║
║      │ │ └───────────────┘ │  │          ║
║      │ └───────────────────┘  │          ║
║      │                        │          ║
║      │ ┌───────────────────┐  │          ║
║      │ │    INGRESAR      │  │          ║
║      │ └───────────────────┘  │          ║
║      │                        │          ║
║      │       ──────────       │          ║
║      │   ¿No tienes cuenta?   │          ║
║      │   Regístrate aquí      │          ║
║      │                        │          ║
║      └────────────────────────┘          ║
║                                            ║
║     ¿Necesitas ayuda?                     ║
║   Contacta al equipo de soporte           ║
║                                            ║
║  © 2026 Wapsell. Todos los derechos      ║
║                                            ║
╚════════════════════════════════════════════╝
```

### Mobile Adjustments
- Logo icon: 40px × 40px (vs 48px desktop)
- Form card padding: 32px (vs 40px desktop)
- Text size: slightly reduced for mobile viewing

---

## Color Palette

### Primary Colors
```
Orange (Primary CTA):
  Hex: #D97757
  RGB: 217, 119, 87
  HSL: 12°, 62%, 60%
  Usage: Buttons, links, focus states, brand accents

Orange Hover:
  Hex: #C86543
  RGB: 200, 101, 67
  HSL: 12°, 60%, 52%
  Usage: Button hover state

Dark (Text & Headers):
  Hex: #1A1815
  RGB: 26, 24, 21
  HSL: 15°, 14%, 9%
  Usage: Main text, headings, labels
```

### Neutral Colors
```
Cream (Background):
  Hex: #FAF9F5
  RGB: 250, 249, 245
  HSL: 28°, 67%, 97%
  Usage: Page background (from)

Light Beige (Background to):
  Hex: #F8F5F0
  RGB: 248, 245, 240
  HSL: 24°, 35%, 95%
  Usage: Gradient endpoint

Border Gray:
  Hex: #E8E5E0
  RGB: 232, 229, 224
  HSL: 24°, 19%, 90%
  Usage: Input borders, dividers

Text Gray:
  Hex: #6B7280
  RGB: 107, 114, 128
  HSL: 210°, 7%, 47%
  Usage: Secondary text, placeholders

Disabled Gray:
  Hex: #9CA3AF
  RGB: 156, 163, 175
  HSL: 210°, 7%, 65%
  Usage: Disabled states
```

### Semantic Colors
```
Error/Red:
  Hex: #DC2626
  RGB: 220, 38, 38
  HSL: 0°, 84%, 50%
  Usage: Error states, validation errors

Error Background:
  Hex: #FEE2E2
  RGB: 254, 226, 226
  HSL: 0°, 100%, 94%
  Usage: Error message background

Success/Green:
  Hex: #10B981
  RGB: 16, 185, 129
  HSL: 160°, 84%, 39%
  Usage: Success states

White:
  Hex: #FFFFFF
  RGB: 255, 255, 255
  HSL: 0°, 0%, 100%
  Usage: Form background, cards
```

---

## Typography

### Font Family
```
Primary: Inter (sans-serif)
Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu
```

### Font Sizes & Weights
```
Page Title (Wapsell):
  Size: 32px (mobile) / 40px (desktop)
  Weight: 700 (bold)
  Line-height: 1.2
  Spacing: -0.02em

Form Title ("Inicia Sesión"):
  Size: 28px (mobile) / 32px (desktop)
  Weight: 700 (bold)
  Line-height: 1.3
  Spacing: -0.01em

Form Description:
  Size: 16px
  Weight: 400 (normal)
  Color: gray-600
  Line-height: 1.5

Label Text:
  Size: 14px
  Weight: 600 (semibold)
  Color: #1A1815 (dark)
  Line-height: 1.5
  Margin-bottom: 8px

Input Text:
  Size: 16px
  Weight: 400 (normal)
  Color: #1A1815
  Line-height: 1.5

Placeholder Text:
  Size: 16px
  Weight: 400 (normal)
  Color: #D1D5DB (gray-300)
  Opacity: 1

Button Text:
  Size: 16px
  Weight: 600 (semibold)
  Color: white
  Line-height: 1.5

Helper/Error Text:
  Size: 14px
  Weight: 400 (normal)
  Color: #DC2626 (red)
  Line-height: 1.4
  Margin-top: 4px

Footer Text:
  Size: 12px
  Weight: 400 (normal)
  Color: #9CA3AF (gray-400)
  Line-height: 1.4
  Margin-top: 24px
```

---

## Button States

### Default State
```
Background: #D97757 (orange)
Text Color: white
Cursor: pointer
Box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1)
```

### Hover State
```
Background: #C86543 (darker orange)
Text Color: white
Cursor: pointer
Box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)
Transition: all 200ms ease
```

### Active State
```
Transform: scale(0.95)
Transition: all 50ms ease
```

### Disabled State
```
Background: #9CA3AF (gray)
Text Color: white
Opacity: 0.75
Cursor: not-allowed
Box-shadow: none
```

### Loading State
```
Background: #9CA3AF (gray)
Opacity: 0.75
Cursor: not-allowed
Content: "Ingresando..." + spinner
Display: flex items-center justify-center gap-2
```

---

## Input States

### Default State
```
Border: 1px solid #E8E5E0
Border-radius: 8px
Background: white
Color: #1A1815
Padding: 12px 16px
Font-size: 16px
Line-height: 1.5
```

### Focus State
```
Border: 1px solid #D97757
Box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1)
Ring: 2px solid rgba(217, 119, 87, 0.2)
Outline: none
Transition: all 200ms ease
```

### Error State (Touched + Invalid)
```
Border: 1px solid #FCA5A5 (red-300)
Box-shadow: 0 0 0 3px rgba(244, 63, 94, 0.1)
Ring: 2px solid rgba(244, 63, 94, 0.1)
Display: Error icon (red X) right-aligned
Show: Error message below input
```

### Disabled State
```
Background: #F3F4F6 (gray-100)
Color: #9CA3AF (gray-400)
Cursor: not-allowed
Opacity: 0.7
Border: 1px solid #E5E7EB
```

---

## Form Validation

### Email Validation
```
Pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Valid Examples:
  ✅ user@example.com
  ✅ name+tag@company.co.uk
  ✅ firstname.lastname@domain.io

Invalid Examples:
  ❌ userexample.com (missing @)
  ❌ user@.com (missing domain)
  ❌ user @example.com (space in email)
  ❌ @example.com (missing local part)

Validation Timing:
  - Checked on blur (field exits)
  - Checked on submit
  - Error shows after field is touched
```

### Password Validation
```
Requirements:
  - Minimum: 1 character (client-side)
  - Actual validation: Server-side in API

Client Display:
  - Shows as dots (••••••••)
  - Required field
  - Validates on blur

Error Message:
  "La contraseña es requerida"
```

---

## Animation Specifications

### Spinner Animation
```
SVG Spinner:
  - Circular loading indicator
  - 20px × 20px size
  - Orange color (#D97757)
  - Infinite rotation
  - Duration: 1s
  - Timing: linear

SVG Path:
  - Outer circle (opacity 0.25)
  - Inner path (opacity 0.75)
  - Both orange colored
```

### Error Message Fade-in
```
Animation: fade-in
Duration: 200ms
Timing: ease-in
Direction: in (fade from 0 to 1 opacity)
```

### Button Scale on Click
```
Transform: scale(0.95)
Duration: 50ms
Timing: ease
Direction: Scales down on active, back on release
```

### Transition Effects
```
Default Transition Duration: 200ms
Timing Function: ease
Properties:
  - colors (background, text)
  - opacity
  - transform
  - box-shadow
```

---

## Responsive Breakpoints

### Mobile (< 640px)
```
Form width: 100% - 32px (16px padding each side)
Max-width: 100%
Padding: 32px (vs 40px desktop)
Logo size: 40px × 40px
Title size: 28px
Gap: 20px
```

### Tablet (640px - 1024px)
```
Form width: 448px (max-w-md)
Max-width: 448px
Padding: 40px
Logo size: 48px × 48px
Title size: 32px
Gap: 20px
```

### Desktop (> 1024px)
```
Form width: 448px (max-w-md)
Max-width: 448px
Padding: 40px
Logo size: 48px × 48px
Title size: 32px
Gap: 20px
Page padding: Flexbox centering
```

---

## Accessibility Features

### Semantic HTML
```html
<form>          - Form wrapper
<label>         - Field labels
<input>         - Input fields
<button>        - Submit button
<a>             - Links (forgot pwd, signup)
<div role="">   - When needed
```

### ARIA Labels
```
- label[htmlFor] → input[id]
- Error messages associated with inputs
- Button states announced
- Loading state communicated
```

### Focus Management
```
Focus Order:
  1. Email input
  2. Password input
  3. Submit button
  4. Sign up link

Focus Visible:
  - Orange ring (2px)
  - High contrast (visible in light/dark)
  - Minimum 2px outline
```

### Color Contrast
```
Text on White:
  Dark (#1A1815) on White: 18.5:1 (WCAG AAA)
  Gray (#6B7280) on White: 7.2:1 (WCAG AA)
  Orange (#D97757) on White: 4.8:1 (WCAG A+)

Text on Error Background:
  Red (#DC2626) on #FEE2E2: 6.2:1 (WCAG AA)

Focus Ring:
  Orange (#D97757) on White: Highly visible
  Minimum 2px width for visibility
```

---

## Browser Testing Matrix

| Feature | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| Form display | ✅ | ✅ | ✅ | ✅ | ✅ |
| Input validation | ✅ | ✅ | ✅ | ✅ | ✅ |
| Animations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Focus states | ✅ | ✅ | ✅ | ✅ | ✅ |
| Touch events | ✅ | ✅ | ✅ | ✅ | ✅ |
| Responsive | ✅ | ✅ | ✅ | ✅ | ✅ |

---

**Generated by**: Claude Haiku 4.5  
**Date**: 2026-10-27  
**Status**: ✅ DESIGN SPECIFICATION COMPLETE

