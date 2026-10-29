# Landing Page Implementation Guide

## Overview

This document describes the public landing page implementation for the Wapsell platform at `/es` and `/en` routes.

**Route:** `apps/wapsell-remix/app/routes/$lang._index.tsx`

## Architecture

### Route Structure

```
$lang._index.tsx           # Landing page route
  ├── Header              # Fixed navigation
  ├── HeroSection         # Hero with CTA
  ├── FeaturesGrid        # 4 feature cards
  ├── SocialProof         # Trust indicators
  ├── FAQAccordion        # 5+ FAQ items
  ├── CTASection          # Final CTA
  └── Footer              # Links and copyright
```

### Components

All landing page components are located in `apps/wapsell-remix/app/components/landing/`:

#### 1. **Header.tsx**
- Fixed navigation bar
- Logo linking to homepage
- Login/Register links (locale-aware)
- Properties:
  - `locale: 'es' | 'en'` - Current language
  - `showLogo?: boolean` - Show W icon
  - `companyName?: string` - Company name display

#### 2. **HeroSection.tsx**
- Large headline
- Supporting subtitle
- Two CTA buttons (primary + secondary)
- Gradient background
- Properties:
  - `title: string` - Main headline
  - `subtitle: string` - Subheading
  - `ctaText: string` - Primary button text
  - `ctaLink: string` - Primary button destination
  - `locale: 'es' | 'en'` - Secondary button uses locale

#### 3. **FeaturesGrid.tsx**
- 4 feature cards in responsive grid
- Icon + title + description
- Hover effects (shadow, background color)
- Properties:
  - `title: string` - Section heading
  - `features: Feature[]` - Feature array with icon, title, description

#### 4. **FAQAccordion.tsx**
- Expandable FAQ items
- One item open by default
- Keyboard accessible
- Properties:
  - `title: string` - Section heading
  - `items: FAQItem[]` - FAQ items with question/answer

#### 5. **SocialProof.tsx**
- Trust indicators (stats)
- Company logos optional
- Properties:
  - `title: string` - Section heading
  - `stats?: Array<{label, value}>` - Statistics to display
  - `companies?: string[]` - Company names

#### 6. **CTASection.tsx**
- Large gradient container
- Centered call-to-action
- Two buttons (primary + secondary)
- Properties:
  - `title: string` - Section heading
  - `subtitle: string` - Supporting text
  - `ctaText: string` - Primary button
  - `ctaLink: string` - Primary destination
  - `locale: 'es' | 'en'`

#### 7. **Footer.tsx**
- Company info
- Multiple footer sections with links
- Copyright notice
- Properties:
  - `copyright: string` - Copyright text
  - `sections: FooterSection[]` - Organized links
  - `companyName?: string` - Branding
  - `companyDescription?: string` - Company description
  - `locale: 'es' | 'en'`

## Internationalization (i18n)

### Translation Files

- **Spanish:** `apps/wapsell-remix/public/locales/es.json`
- **English:** `apps/wapsell-remix/public/locales/en.json`

### Keys Added to i18n

Landing page translations are under `landing.*` namespace:

```json
{
  "landing": {
    "hero": {
      "title": "...",
      "subtitle": "...",
      "cta": "..."
    },
    "features": {
      "title": "...",
      "aiChat": { "title": "...", "description": "..." },
      "catalog": { "title": "...", "description": "..." },
      "leads": { "title": "...", "description": "..." },
      "analytics": { "title": "...", "description": "..." }
    },
    "socialProof": { "title": "..." },
    "faq": { 
      "title": "...",
      "q1": "...", "a1": "...",
      ... (5-6 Q&A pairs)
    },
    "ctaSection": {
      "title": "...",
      "subtitle": "...",
      "button": "..."
    },
    "footer": {
      "copyright": "...",
      "company": "...",
      "about": "...",
      "contact": "...",
      "legal": "...",
      "privacy": "...",
      "terms": "..."
    }
  }
}
```

### Locale Detection

The route parameter `$lang` is used:
- `/es` → Spanish
- `/en` → English
- `/` → Redirects to `/es` (default)

Root `_index.tsx` redirects to `/es` for backwards compatibility.

## Styling

### Tailwind CSS

- **Colors:** Uses brand palette (blue-600, purple-600, etc.)
- **Responsive:** Mobile-first approach
  - `sm:` tablets
  - `md:` small laptops
  - `lg:` desktops
- **Spacing:** Consistent padding/margin
- **Typography:** Scales with viewport

### Design System

- Header: Fixed, white background
- Sections: Padding 20px (py-20)
- Cards: Rounded corners, hover effects
- CTAs: Blue primary, gray secondary
- Footer: Dark background

## Features

### Responsive Design

- **Mobile:** Single column, touch-friendly buttons
- **Tablet:** 2-column grid for features
- **Desktop:** 4-column grid, fixed header

### Accessibility

- ✅ Semantic HTML (header, section, footer)
- ✅ Proper heading hierarchy (h1, h2, h3)
- ✅ ARIA labels on interactive elements
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Color contrast meets WCAG AA
- ✅ No external images (SVG only)

### Performance

- ✅ No external API calls
- ✅ No heavy JavaScript (FAQ accordion only)
- ✅ Automatically code-split by Remix
- ✅ No image optimization needed (SVG)
- ✅ Fast initial page load

### Interactivity

- **FAQ Accordion:** Click to expand/collapse
- **Links:** Navigate to auth pages
- **Hover Effects:** Shadow, color changes on cards

## Navigation Flow

### Hero CTA Buttons
- Primary: `/[locale]/auth/register` (Start Free)
- Secondary: `/[locale]/auth/login` (Sign In)

### Feature Cards
- Non-interactive, informational only

### FAQ Accordion
- Expand on click to reveal answer
- One item open by default

### Final CTA Section
- Primary: `/[locale]/auth/register` (Sign Up Free)
- Secondary: `/[locale]/auth/login` (Sign In)

### Footer Links
- Company links: Placeholder (#)
- Privacy/Terms: Placeholder (#)

## Meta Tags

The route includes proper meta tags for SEO:

```typescript
export const meta: MetaFunction = ({ params }) => {
  const locale = (params.lang || 'es') as 'es' | 'en';
  return [
    { title: '...' },
    { name: 'description', content: '...' }
  ];
};
```

## Testing

### Unit Tests
- Location: `apps/wapsell-remix/app/routes/__tests__/$lang._index.test.tsx`
- Verifies component structure and functionality

### Manual Testing Checklist

- [ ] `/es` loads Spanish content
- [ ] `/en` loads English content
- [ ] Mobile view (< 640px) is responsive
- [ ] Tablet view (640px - 1024px) shows 2-column grid
- [ ] Desktop view (> 1024px) shows 4-column grid
- [ ] Header is fixed while scrolling
- [ ] FAQ items expand/collapse on click
- [ ] All links navigate correctly
- [ ] No console errors
- [ ] No missing images
- [ ] Forms validation works (if present)

### E2E Tests

Playwright test for landing page accessibility:

```bash
npm run test:e2e -- --grep "landing"
```

## Development

### Adding New Content

#### Add a Feature

1. Edit `$lang._index.tsx`:
   ```typescript
   const features: Feature[] = [
     // ... existing features
     {
       icon: '🎯',
       title: isSpanish ? 'New Feature' : 'New Feature',
       description: isSpanish ? 'Description' : 'Description',
     }
   ];
   ```

2. Adjust grid columns if needed:
   ```tsx
   <FeaturesGrid 
     features={features}
     columns={5} // or adjust className
   />
   ```

#### Add FAQ Questions

1. Edit `$lang._index.tsx`:
   ```typescript
   const faqItems: FAQItem[] = [
     // ... existing items
     {
       question: isSpanish ? '¿Nueva pregunta?' : 'New question?',
       answer: isSpanish ? 'Respuesta' : 'Answer',
     }
   ];
   ```

#### Update Translations

1. Edit `public/locales/es.json` or `public/locales/en.json`
2. Add keys under `landing.*` namespace
3. Reference in component using `t.landing.section.key`

### Component Props

Each component exports its interface for type safety:

```typescript
import { 
  Header,
  HeroSection,
  FeaturesGrid,
  FAQAccordion,
  SocialProof,
  CTASection,
  Footer,
  type Feature,
  type FAQItem,
  type FooterSection,
} from '~/components/landing';
```

## Deployment

### Build

```bash
npm run build
```

This compiles the landing page and all components.

### Routing

- Public route (no auth required)
- Serves at `/es` and `/en`
- Root `/` redirects to `/es`

### Environment

- No environment variables needed
- No external API dependencies
- Works on staging and production

## Troubleshooting

### Components not found

- Verify files exist in `app/components/landing/`
- Check import paths use `~/components/landing`
- Run `npm run build` to catch import errors

### Translations missing

- Check both `es.json` and `en.json` have same keys
- Verify path in `$lang._index.tsx` matches JSON structure
- Look for typos in key names

### Styling not applied

- Verify Tailwind CSS is configured correctly
- Check `app/app.css` includes `@tailwind` directives
- Clear build cache if needed

### Links not working

- Verify route paths are correct
- Check `locale` parameter is 'es' or 'en'
- Test both `/es/auth/register` and `/en/auth/register` exist

## Future Enhancements

- [ ] Add dark mode support (data-theme attribute)
- [ ] Add newsletter signup form
- [ ] Add video hero section
- [ ] Add testimonials carousel
- [ ] Add pricing table
- [ ] Add blog link
- [ ] Add language selector in header
- [ ] Add analytics tracking
- [ ] Add API integration for company count
- [ ] Add email notifications for signup

## Related Files

- Route: `apps/wapsell-remix/app/routes/$lang._index.tsx`
- Components: `apps/wapsell-remix/app/components/landing/`
- Translations: `apps/wapsell-remix/public/locales/{es,en}.json`
- Tests: `apps/wapsell-remix/app/routes/__tests__/$lang._index.test.tsx`
- Config: `apps/wapsell-remix/tailwind.config.js`
