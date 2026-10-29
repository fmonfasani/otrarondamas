# Wapsell Remix Route Structure

## Overview

Complete unified Remix route structure for the Wapsell multi-tenant SaaS platform. Organized by feature domain with built-in authentication, authorization, and tenant isolation.

## Route Organization

### 1. Public Routes (No Auth Required)

#### Landing Pages
- **`/:lang._index`** - Landing page with features and CTAs
  - File: `routes/$lang._index.tsx`
  - Supports: `/es`, `/en`
  - Features: Hero section, feature showcase, footer

#### Authentication Routes
- **`/:lang/auth/login`** - User login form
  - File: `routes/$lang.auth.login.tsx`
  - Validates credentials against NestJS API
  - Stores JWT in session (httpOnly cookie)
  - Redirects to dashboard on success

- **`/:lang/auth/register`** - User registration form
  - File: `routes/$lang.auth.register.tsx`
  - Creates new user account
  - Auto-login after registration
  - Redirects to onboarding

- **`/:lang/auth/onboarding`** - Post-registration setup flow
  - File: `routes/$lang.auth.onboarding.tsx`
  - Multi-step wizard (business info → team invite → ready)
  - Tenant (empresa) creation and configuration
  - Optional team member invitation

- **`/:lang/auth`** - Auth layout
  - File: `routes/$lang.auth.tsx`
  - Outlet parent for all auth routes
  - Styled auth container

#### Public Store Routes
- **`/:lang/tienda`** - Customer-facing online store
  - File: `routes/$lang.tienda._index.tsx`
  - No authentication required
  - Browse products and manage cart
  - Public facing interface

### 2. Protected Routes (Auth Required + Tenant Validation)

#### Dashboard Routes
- **`/:lang/dashboard`** - Dashboard layout & home
  - File: `routes/$lang.dashboard.tsx`
  - Protected parent layout for all dashboard routes
  - Navigation sidebar with tenant context
  - User authentication guard

- **`/:lang/dashboard` (index)** - Dashboard home
  - File: `routes/$lang.dashboard._index.tsx`
  - KPI cards and recent activity
  - Quick action links

- **`/:lang/dashboard/pedidos`** - Orders list
  - File: `routes/$lang.dashboard.pedidos.tsx`
  - List all orders for current tenant
  - Filters and pagination

- **`/:lang/dashboard/pedidos/:id`** - Order detail
  - File: `routes/$lang.dashboard.pedidos.$id.tsx`
  - Single order view
  - Order timeline and actions

- **`/:lang/dashboard/productos`** - Product management
  - File: `routes/$lang.dashboard.productos.tsx`
  - CRUD operations on products
  - Inventory management

- **`/:lang/dashboard/negocios`** - Business management
  - File: `routes/$lang.dashboard.negocios.tsx`
  - Tenant/empresa switcher
  - Business settings

#### POS Terminal Routes
- **`/:lang/pos`** - POS terminal interface
  - File: `routes/$lang.pos._index.tsx`
  - Protected: Authentication required
  - Point of Sale system
  - Product selection, order creation, payment processing

- **`/:lang/pos/orders`** - POS order history
  - Completed orders from POS terminal

#### Admin Routes
- **`/:lang/admin`** - Admin panel layout
  - File: `routes/$lang.admin._index.tsx`
  - Protected: Admin role required (future)
  - System administration interface

- **`/:lang/admin/usuarios`** - User management
  - CRUD operations on users
  - Role assignment

- **`/:lang/admin/permisos`** - Permission management
  - Role and permission configuration

- **`/:lang/admin/configuracion`** - System settings
  - Global system configuration

- **`/:lang/admin/auditoria`** - Audit logs
  - System activity logs
  - Security audits

### 3. Session Management

- **`/:lang/logout`** - Logout action
  - File: `routes/logout.ts`
  - Clears session and JWT cookie
  - Redirects to login

### 4. API Routes

- **`/api/health`** - Health check endpoint
  - File: `routes/api.health.ts`
  - Public endpoint
  - Returns 200 OK

- **`/api/stream`** - Server-sent events stream
  - File: `routes/api.stream.ts`
  - Real-time updates

## Route Guards & Middleware

### Tenant Context Extraction

**File:** `utils/tenant-context.server.ts`

Extract and manage tenant context from JWT and session:

```typescript
// Get tenant context from request
const tenantContext = await getTenantContext(request);

// TenantContext structure
interface TenantContext {
  userId: string;
  email: string;
  empresaId: string;
  name?: string;
  isExpired?: boolean;
}

// Validate context
if (validateTenantContext(tenantContext)) {
  // Safe to use
}
```

### Route Protection Utilities

**File:** `utils/route-guards.server.ts`

Create protected loaders and actions with built-in auth & tenant validation:

#### Protected Loader

```typescript
export const loader = createProtectedLoader(
  async (context) => {
    // context.token - JWT token
    // context.tenantContext - Tenant info
    // context.request - HTTP request
    // context.params - Route params
    
    return { customData: 'value' };
  },
  {
    requiredEmpresaId: 'specific-tenant-id', // Optional
    fallbackLocale: 'es',
  }
);
```

#### Protected Action

```typescript
export const action = createProtectedAction(
  async (context) => {
    // Same context as loader
    
    // Perform mutations
    return json({ success: true });
  },
  {
    requiredEmpresaId: 'specific-tenant-id', // Optional
    allowedMethods: ['POST', 'PUT'],
  }
);
```

#### Require Authentication Context

```typescript
try {
  const authContext = await requireAuthContext(request, params);
  // authContext.token
  // authContext.tenantContext
  // authContext.request
  // authContext.params
} catch (error) {
  // 401 or 403 response thrown
}
```

#### Require Tenant Access

```typescript
const empresaId = await requireTenant(tenantContext, 'optional-specific-id');
```

### Role-Based Access Control (RBAC)

```typescript
// Check if user has specific role
// Note: Role validation requires API call in production
const hasRole = await requireRole(
  tenantContext,
  ['owner', 'admin'],
  token
);
```

## Locale Support

All routes support multi-language URLs:

- Spanish (default): `/:lang` = `/es/...`
- English: `/:lang` = `/en/...`

Locale is extracted from:
1. URL parameter (`$lang`)
2. Accept-Language header (fallback)
3. Default to Spanish

### Locale Usage in Components

```typescript
import { useParams } from '@remix-run/react';

export default function MyComponent() {
  const { lang } = useParams();
  const locale = (lang || 'es') as 'es' | 'en';
  
  // Use locale for translations
  const message = locale === 'es' ? 'Hola' : 'Hello';
}
```

## Type Definitions

**File:** `types/routes.ts`

Pre-defined route constants and helpers:

```typescript
import { ROUTES, navigate, isProtectedRoute } from '~/types/routes';

// Use route constants
const loginUrl = ROUTES.AUTH.LOGIN('es');
const dashboardUrl = ROUTES.DASHBOARD.HOME('en');

// Navigate helpers
navigate.login() // '/es/auth/login'
navigate.dashboard('en') // '/en/dashboard'

// Check route type
isProtectedRoute('/es/dashboard') // true
isPublicRoute('/es') // true
```

## Session Management

**File:** `services/auth.server.ts`

JWT-based session with httpOnly cookies:

```typescript
// Get session from request
const session = await getSessionFromRequest(request);
const jwt = session.get('jwt');

// Require authentication
const token = await requireAuth(request); // Throws 401 if not authenticated

// Get authenticated user
const user = await getAuthenticatedUser(request);

// Logout (destroy session)
const response = await logout(request);
```

## Protected Route Pattern

### Pattern 1: Basic Protection

```typescript
export const loader = createProtectedLoader();

export default function MyRoute() {
  const { tenantContext, locale } = useLoaderData();
  
  return <div>{tenantContext.empresaId}</div>;
}
```

### Pattern 2: Custom Loader

```typescript
export const loader = createProtectedLoader(
  async (context) => {
    // Fetch additional data
    const data = await fetchData(context.tenantContext.empresaId);
    
    return { data };
  }
);

export default function MyRoute() {
  const { tenantContext, data, locale } = useLoaderData();
  
  return <div>{data}</div>;
}
```

### Pattern 3: Protected Action

```typescript
export const action = createProtectedAction(
  async (context) => {
    const formData = await context.request.formData();
    
    // Create/update/delete in protected context
    await apiCall(context.tenantContext.empresaId, formData);
    
    return json({ success: true });
  },
  { allowedMethods: ['POST', 'PUT', 'DELETE'] }
);
```

## Error Handling

Root error boundary handles uncaught errors:

```typescript
// App.tsx
export function ErrorBoundary() {
  // Displays error page with locale support
  // Provides "Go Home" button
}
```

## Future Enhancements

1. **Role-based route protection** - Verify user roles via API before rendering
2. **Tenant switching** - Seamless switching between managed tenants
3. **Deep linking with context** - Preserve tenant context across navigation
4. **Route prefetching** - Optimize performance with intelligent prefetching
5. **Analytics integration** - Track route navigation and user behavior
6. **API error handling** - Unified error handling for all API calls

## File Structure

```
app/
├── routes/
│   ├── $lang._index.tsx           # Landing page
│   ├── $lang.auth.tsx             # Auth layout
│   ├── $lang.auth.login.tsx       # Login form
│   ├── $lang.auth.register.tsx    # Registration form
│   ├── $lang.auth.onboarding.tsx  # Onboarding wizard
│   ├── $lang.dashboard.tsx        # Dashboard layout
│   ├── $lang.dashboard._index.tsx # Dashboard home
│   ├── $lang.dashboard.pedidos.tsx
│   ├── $lang.dashboard.pedidos.$id.tsx
│   ├── $lang.dashboard.productos.tsx
│   ├── $lang.dashboard.negocios.tsx
│   ├── $lang.pos._index.tsx       # POS terminal
│   ├── $lang.tienda._index.tsx    # Online store
│   ├── $lang.admin._index.tsx     # Admin panel
│   ├── logout.ts                  # Logout action
│   ├── api.health.ts              # Health check
│   └── api.stream.ts              # SSE stream
├── utils/
│   ├── tenant-context.server.ts   # Tenant helpers
│   ├── route-guards.server.ts     # Protection utilities
│   └── protected-route.ts         # Legacy protection
├── services/
│   └── auth.server.ts             # Authentication service
├── types/
│   └── routes.ts                  # Route type definitions
├── root.tsx                       # Root layout
└── remix.config.ts               # Remix configuration
```

## Testing Routes

Example test patterns for protected routes:

```typescript
// Create mock protected context
const mockContext = {
  token: 'test-jwt-token',
  tenantContext: {
    userId: 'user-123',
    email: 'user@test.com',
    empresaId: 'empresa-456',
    name: 'Test User',
  },
  request: new Request('http://localhost/'),
  params: { lang: 'es' },
};

// Mock session
const session = new MockSession({
  jwt: 'test-token',
  userId: 'user-123',
  empresaId: 'empresa-456',
});
```

## Configuration

### Environment Variables

```env
VITE_API_URL=http://localhost:8600
SESSION_SECRET=your-secret-key-change-in-production
VITE_API_TIMEOUT=30000
NODE_ENV=production
```

### Remix Config

- **Server module format:** ESM
- **Assets directory:** `public/build/`
- **Ignored files:** `.*`, `*.test.*`, `*.spec.*`
- **Watched paths:** `app/**`, `../packages/**`
