# Wapsell UI Components Library

Production-ready, reusable component library for Wapsell frontend built with Next.js, React, and Tailwind CSS.

## Design System

### Colors
- **Primary**: `#D97757` (Coral)
- **Dark**: `#1A1815` (Nearly Black)
- **Light**: `#FAF9F5` (Off-white)
- **Gray 100**: `#F3F1ED`
- **Gray 200**: `#E8E5E0`
- **Success**: `#10B981`
- **Warning**: `#F59E0B`
- **Danger**: `#EF4444` / `#DC2626`
- **Info**: `#3B82F6`

### Typography
- **Font Family**: System UI (`system-ui`, `-apple-system`, `sans-serif`)
- **Font Sizes**: sm (12px), base (16px), lg (18px), xl (20px)
- **Font Weights**: Regular (400), Medium (500), Bold (700)

### Spacing
- **Base unit**: 4px
- **Padding sizes**: sm (12px), md (16px), lg (24px)
- **Gap sizes**: 2 (8px), 3 (12px), 4 (16px), 6 (24px)

### Borders & Radius
- **Border color**: `#E8E5E0` (light gray)
- **Border width**: 1px (default), 2px (focus/active)
- **Border radius**: Default (6px), Full (9999px for pills)

## Components

### Button

Primary action component with multiple variants and sizes.

```tsx
import { Button } from '@/components/ui';

export function Example() {
  return (
    <>
      <Button variant="primary">Click me</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Delete</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button isLoading>Loading...</Button>
      <Button disabled>Disabled</Button>
    </>
  );
}
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `isLoading`: boolean (default: false)
- `disabled`: boolean (default: false)
- Standard HTML button attributes

### Input

Text input with support for labels, errors, helper text, and icons.

```tsx
import { Input } from '@/components/ui';

export function Example() {
  const [value, setValue] = React.useState('');

  return (
    <>
      <Input
        label="Email"
        type="email"
        placeholder="user@example.com"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Input
        label="Password"
        type="password"
        error="Password is required"
      />
      <Input
        label="Search"
        startIcon={<SearchIcon />}
        endIcon={<ClearIcon />}
      />
      <Input
        label="Phone"
        type="tel"
        helperText="Format: (123) 456-7890"
      />
      <Input size="sm" placeholder="Small input" />
      <Input size="lg" placeholder="Large input" />
      <Input fullWidth label="Full width input" />
    </>
  );
}
```

**Props:**
- `label`: string (optional)
- `type`: 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url' (default: 'text')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `error`: string (optional, shows error state)
- `helperText`: string (optional)
- `startIcon`: ReactNode (optional)
- `endIcon`: ReactNode (optional)
- `fullWidth`: boolean (default: false)
- Standard HTML input attributes

### Card

Container component for grouping related content.

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

export function Example() {
  return (
    <>
      <Card>
        <CardHeader>
          <h2>Card Title</h2>
        </CardHeader>
        <CardBody>
          <p>Card content goes here</p>
        </CardBody>
        <CardFooter>
          <button>Action</button>
        </CardFooter>
      </Card>

      <Card variant="elevated">Elevated card</Card>
      <Card variant="outlined">Outlined card</Card>
      <Card padding="lg">Large padding</Card>
    </>
  );
}
```

**Props:**
- `variant`: 'default' | 'elevated' | 'outlined' (default: 'default')
- `padding`: 'sm' | 'md' | 'lg' | 'none' (default: 'md')
- Standard HTML div attributes

### Badge

Small label to highlight important information.

```tsx
import { Badge } from '@/components/ui';

export function Example() {
  return (
    <>
      <Badge variant="primary">New</Badge>
      <Badge variant="success">Completed</Badge>
      <Badge variant="warning">Pending</Badge>
      <Badge variant="danger">Error</Badge>
      <Badge size="sm">Small badge</Badge>
      <Badge dismissible onDismiss={() => console.log('dismissed')}>
        Dismissible
      </Badge>
      <Badge icon={<CheckIcon />}>With icon</Badge>
    </>
  );
}
```

**Props:**
- `variant`: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' (default: 'default')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `icon`: ReactNode (optional)
- `dismissible`: boolean (default: false)
- `onDismiss`: () => void (optional)
- Standard HTML div attributes

### Modal

Dialog overlay for important content and user interactions.

```tsx
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui';

export function Example() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Modal Title"
        size="md"
        footer={
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => setIsOpen(false)}>
              Confirm
            </Button>
          </div>
        }
      >
        <p>Modal content goes here</p>
      </Modal>
    </>
  );
}
```

**Props:**
- `isOpen`: boolean (required)
- `onClose`: () => void (required)
- `title`: string (optional)
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `closeOnBackdropClick`: boolean (default: true)

### Dropdown

Menu component for displaying a list of actions.

```tsx
import { Dropdown } from '@/components/ui';

export function Example() {
  const items = [
    { id: '1', label: 'Edit', onClick: () => console.log('Edit') },
    { id: '2', label: 'Delete', onClick: () => console.log('Delete') },
    { id: '3', divider: true },
    { id: '4', label: 'Export', onClick: () => console.log('Export') },
  ];

  return (
    <Dropdown
      trigger={<button>Actions</button>}
      items={items}
      align="right"
      size="md"
    />
  );
}
```

**Props:**
- `trigger`: ReactNode (required) - Button or element that opens the dropdown
- `items`: DropdownItem[] (required)
- `align`: 'left' | 'right' (default: 'left')
- `size`: 'sm' | 'md' | 'lg' (default: 'md')
- `onClose`: () => void (optional)

**DropdownItem:**
- `id`: string (required)
- `label`: string (required)
- `icon`: ReactNode (optional)
- `onClick`: () => void (optional)
- `disabled`: boolean (optional)
- `divider`: boolean (optional)

### Toast

Notification message that appears temporarily.

```tsx
import { Toast, ToastContainer } from '@/components/ui';

export function Example() {
  const [toasts, setToasts] = React.useState<Array<any>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    const id = Date.now();
    setToasts([...toasts, { id, message, type, duration: 5000 }]);
  };

  return (
    <>
      <button onClick={() => showToast('Success!', 'success')}>
        Success Toast
      </button>

      <ToastContainer
        position="bottom-right"
        toasts={toasts}
        onRemove={(id) => setToasts(toasts.filter(t => t.id !== id))}
      />
    </>
  );
}
```

**Toast Props:**
- `message`: string (required)
- `type`: 'success' | 'error' | 'warning' | 'info' (default: 'info')
- `duration`: number in ms (default: 5000, set to 0 for no auto-close)
- `onClose`: () => void (optional)
- `action`: { label: string; onClick: () => void } (optional)

**ToastContainer Props:**
- `position`: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' (default: 'bottom-right')
- `toasts`: Toast[] (required)
- `onRemove`: (id: string) => void (required)

### Navigation

Link-based navigation component.

```tsx
import { Navigation } from '@/components/ui';

export function Example() {
  const items = [
    { href: '/', label: 'Home', active: true },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];

  return (
    <>
      <Navigation items={items} orientation="horizontal" variant="default" />
      <Navigation items={items} variant="pills" />
      <Navigation items={items} variant="underline" />
    </>
  );
}
```

**Props:**
- `items`: NavItem[] (required)
- `orientation`: 'horizontal' | 'vertical' (default: 'horizontal')
- `variant`: 'default' | 'pills' | 'underline' (default: 'default')

**NavItem:**
- `href`: string (required)
- `label`: string (required)
- `icon`: ReactNode (optional)
- `active`: boolean (optional)
- `target`: string (optional)

### Header

Page header component with optional title, subtitle, and actions.

```tsx
import { Header, HeaderContent } from '@/components/ui';
import { Button } from '@/components/ui';

export function Example() {
  return (
    <Header sticky shadow variant="default">
      <HeaderContent
        title="Dashboard"
        subtitle="Welcome back!"
        actions={<Button size="sm">New Item</Button>}
      />
    </Header>
  );
}
```

**Header Props:**
- `variant`: 'default' | 'transparent' (default: 'default')
- `sticky`: boolean (default: false)
- `shadow`: boolean (default: true)

**HeaderContent Props:**
- `title`: ReactNode (optional)
- `subtitle`: string (optional)
- `actions`: ReactNode (optional)
- `leading`: ReactNode (optional) - Left side element
- `trailing`: ReactNode (optional) - Right side element

### Footer

Page footer component with sections, links, and social media.

```tsx
import { Footer } from '@/components/ui';

export function Example() {
  const sections = [
    {
      title: 'Product',
      links: [
        { label: 'Features', href: '#' },
        { label: 'Pricing', href: '#' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About', href: '#' },
        { label: 'Blog', href: '#' },
      ],
    },
  ];

  return (
    <Footer
      sections={sections}
      copyright="© 2026 Wapsell"
      variant="default"
    />
  );
}
```

**Props:**
- `sections`: FooterSection[] (optional)
- `copyright`: string (optional)
- `socialLinks`: Array<{ icon: ReactNode; href: string; label: string }> (optional)
- `variant`: 'default' | 'minimal' (default: 'default')

## Usage Patterns

### Form Example

```tsx
'use client';

import React, { useState } from 'react';
import { Button, Input, Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // API call
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      // Success
    } catch (error) {
      setErrors({ submit: 'Invalid credentials' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card variant="elevated">
      <CardHeader>
        <h2 className="text-xl font-bold">Sign In</h2>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardBody className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            required
          />

          {errors.submit && (
            <div className="p-3 bg-[#FEE2E2] border border-[#DC2626] rounded text-[#DC2626] text-sm">
              {errors.submit}
            </div>
          )}
        </CardBody>

        <CardFooter>
          <Button
            type="submit"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading}
          >
            Sign In
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **Keyboard navigation**: All interactive elements are keyboard accessible
- **Focus management**: Visible focus indicators on all buttons and inputs
- **ARIA labels**: Appropriate ARIA labels and roles
- **Color contrast**: All color combinations meet contrast requirements
- **Semantic HTML**: Proper use of semantic elements

## Tailwind Configuration

Components use the following Tailwind configuration:

```ts
// tailwind.config.ts
const config: Config = {
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#D97757',
        dark: '#1A1815',
        light: '#FAF9F5',
        'gray-100': '#F3F1ED',
        'gray-200': '#E8E5E0',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## Migration Guide

If you're refactoring existing components to use this library:

1. **Replace inline styles**: Convert hardcoded color/size values to component props
2. **Centralize state**: Use React hooks or context for shared state
3. **Test variants**: Ensure all button/input variants work as expected
4. **Update imports**: Change from scattered components to `components/ui`

## Future Enhancements

- [ ] Storybook documentation
- [ ] Component snapshot tests
- [ ] Design tokens export
- [ ] Dark mode support
- [ ] Animation library integration
- [ ] Form builder utilities
- [ ] Data table component
- [ ] Sidebar navigation
- [ ] Breadcrumb component
- [ ] Checkbox/Radio components
- [ ] Select dropdown component
- [ ] Pagination component
- [ ] Tabs component
- [ ] Accordion component

## Support

For issues or questions about components:

1. Check the examples in this README
2. Review component source code for props
3. Test in browser dev tools
4. Create an issue with reproduction steps

---

**Last Updated**: 2026-10-27  
**Version**: 1.0.0  
**Wapsell Frontend**
