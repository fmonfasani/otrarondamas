# Authentication Flow Documentation - Wapsell Remix

## Overview

Wapsell implements a complete authentication system using Remix with server-side session management, JWT tokens, and multi-tenant support. The flow integrates with NestJS backend endpoints for authentication.

## Architecture

### Components

1. **Session Storage** (`app/services/auth.server.ts`)
   - Cookie-based session storage using Remix `createCookieSessionStorage`
   - JWT token stored in `__session` cookie
   - httpOnly, secure (production), sameSite=Lax
   - 7-day expiration (matches JWT lifetime)

2. **Auth Service** (`app/services/auth.server.ts`)
   - `loginWithNestJS()` - POST to /auth/login
   - `registerWithNestJS()` - POST to /auth/register
   - `validateJWT()` - Validates token with API
   - `getCurrentUser()` - Fetches fresh user from API
   - `logout()` - Clears session
   - `requireAuth()` - Middleware guard for protected routes

3. **Routes**
   - `$lang.auth.login.tsx` - Login form + action
   - `$lang.auth.register.tsx` - Register form + action
   - `$lang.auth.logout.tsx` - Logout action
   - `$lang.dashboard.*` - Protected routes

4. **Components**
   - `LoginForm.tsx` - Email/password form with i18n
   - `RegisterForm.tsx` - Full registration with terms agreement

5. **Route Guards** (`app/utils/route-guards.server.ts`)
   - `requireAuthContext()` - Full auth + tenant validation
   - `createProtectedLoader()` - Higher-order for protected loaders
   - `createProtectedAction()` - Higher-order for protected actions
   - `redirectIfNotAuth()` - Simple redirect to login
   - `redirectIfAuth()` - Redirect if already logged in

## Authentication Flow

### Login Flow

```
User fills login form
    ↓
POST /{lang}/auth/login (LoginForm action)
    ↓
Validate email/password format
    ↓
Call loginWithNestJS()
    │
    └─→ POST {API_URL}/auth/login
        ↓
        ← Returns { access_token, user, empresas }
    ↓
Create session with:
  - jwt: access_token
  - userId: user.id
  - empresas: empresas[]
  - empresaId: first empresa.id
    ↓
Set-Cookie: __session={encrypted_session}
    ↓
Redirect to /{lang}/dashboard
    ↓
Dashboard loader receives session cookie
    ↓
requireAuth() extracts JWT from session
    ↓
User authenticated + logged in
```

### Register Flow

```
User fills registration form
    ↓
POST /{lang}/auth/register (RegisterForm action)
    ↓
Validate all fields:
  - nombre: 2+ chars
  - email: valid format
  - password: 6+ chars
  - confirmPassword: matches password
    ↓
Call registerWithNestJS()
    │
    └─→ POST {API_URL}/auth/register
        ↓
        ← Returns { access_token, user, empresas }
    ↓
Auto-login: Create session (same as login)
    ↓
Set-Cookie: __session={encrypted_session}
    ↓
Redirect to /{lang}/dashboard
```

### Logout Flow

```
User clicks logout link/button
    ↓
POST /{lang}/auth/logout (Form submission)
    ↓
logout() called from auth.server.ts
    ↓
destroySession() clears cookie
    ↓
Set-Cookie: __session=""
    ↓
Redirect to /{lang}/
```

### Protected Route Access

```
User navigates to /{lang}/dashboard
    ↓
Dashboard loader runs:
  requireAuth(request)
    ↓
    - Extract session from cookie
    - Get JWT from session.get('jwt')
    - If no JWT → throw 401 → Redirect to /login
    ↓
    - Validate JWT with API (validateJWT)
    - If invalid → throw 401 → Redirect to /login
    ↓
    - Return token for API calls
    ↓
Dashboard renders with authenticated user
```

## Session Management

### Session Storage Configuration

```typescript
// File: app/services/auth.server.ts
createCookieSessionStorage({
  cookie: {
    name: '__session',              // Cookie name in browser
    httpOnly: true,                 // JS cannot access (security)
    maxAge: 60 * 60 * 24 * 7,      // 7 days
    path: '/',                      // Available on all routes
    sameSite: 'lax',               // CSRF protection
    secrets: [SESSION_SECRET],      // Encryption key
    secure: NODE_ENV === 'production', // HTTPS only in prod
  },
});
```

### Session Data Structure

```typescript
{
  jwt: string;              // JWT token from API
  userId: string;           // User ID from API
  empresas: Empresa[];      // Array of accessible companies
  empresaId: string;        // Current/default company ID
}
```

### JWT Validation

```typescript
// Happens on every protected route load
validateJWT(token: string): Promise<boolean>
  ↓
  POST {API_URL}/auth/validate
  Headers: Authorization: Bearer {token}
  ↓
  200 OK → Valid
  401 Unauthorized → Expired/Invalid
```

## API Endpoints

All endpoints are NestJS-based at `{VITE_API_URL}` (default: http://localhost:8600)

### POST /auth/login
**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "empresas": [
    {
      "id": "uuid",
      "name": "Company Name"
    }
  ]
}
```

**Errors:**
- 401: Invalid email/password
- 404: User not found
- 400: Validation error

### POST /auth/register
**Request:**
```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "User Name"
}
```

**Response (200):**
- Same as login response
- Auto-creates empresa with company_name (if provided)

**Errors:**
- 409: Email already registered
- 400: Invalid data
  - Password < 8 chars
  - Invalid email
  - Missing fields

### POST /auth/validate
**Request:**
```json
Headers: Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "valid": true
}
```

**Errors:**
- 401: Invalid/expired token

### GET /auth/me
**Request:**
```json
Headers: Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "empresas": [...]
}
```

## Error Handling

### Login/Register Errors

| Status | Error | UI Display |
|--------|-------|-----------|
| 400 | Validation failed | "El correo electrónico no es válido" |
| 401 | Invalid credentials | "Email o contraseña incorrectos" |
| 404 | User not found | "Usuario no encontrado" |
| 409 | Email exists | "Email ya registrado" |
| Network | Connection timeout | "Conexión fallida. Intenta de nuevo" |

### Protected Route Errors

| Condition | Action |
|-----------|--------|
| No JWT in session | Redirect to /{lang}/auth/login |
| JWT expired | Clear session, redirect to login |
| JWT invalid | Clear session, redirect to login |
| Network error | Return error state for error boundary |

## Multi-Tenant Scoping

### Tenant Context

Extracted from JWT and session:

```typescript
interface TenantContext {
  userId: string;        // From JWT sub claim
  email: string;         // From JWT email claim
  empresaId: string;     // From JWT empresaId claim
  name?: string;         // Optional
  isExpired?: boolean;   // Token expiration status
}
```

### Protected Routes with Tenant Validation

```typescript
// File: app/routes/$lang.dashboard.tsx
export const loader = createProtectedLoader(
  async (context) => {
    // context.tenantContext ensures user can access this empresa
    const { empresaId } = context.tenantContext;
    
    // Fetch data scoped to empresaId
    return json({ data: ... });
  },
  {
    requiredEmpresaId: 'specific-empresa-id' // Optional
  }
);
```

## Security Features

### 1. JWT-based Authentication
- Issued by NestJS API
- Contains user ID, email, empresa ID
- 7-day expiration
- Validated on every protected route

### 2. Session Cookies
- httpOnly: JavaScript cannot access
- secure: HTTPS only in production
- sameSite=lax: CSRF protection
- Encrypted: Uses SESSION_SECRET

### 3. Tenant Isolation
- JWT includes empresaId
- Routes validate tenant context
- API enforces company scoping
- Cross-tenant access prevented at DB level

### 4. Password Security
- NestJS: bcryptjs hashing (10 rounds)
- Remix: Validated format (6+ chars for register, custom for API)
- Never stored in session

### 5. Token Management
- No token refresh endpoint (implement if needed)
- Validation on every protected route access
- Automatic session cleanup on token expiry

## Usage Examples

### Protected Loader with Tenant Context

```typescript
// File: app/routes/$lang.dashboard.pedidos.tsx
import { createProtectedLoader } from '~/utils/route-guards.server';

export const loader = createProtectedLoader(
  async (context) => {
    const { token, tenantContext } = context;
    const { empresaId } = tenantContext;

    // Fetch orders for current empresa
    const response = await fetch(`${API_URL}/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Empresa-Id': empresaId,
      },
    });

    return json({
      orders: await response.json(),
      tenantContext,
    });
  }
);
```

### Protected Action with Auth

```typescript
// File: app/routes/$lang.dashboard.pedidos.tsx
import { createProtectedAction } from '~/utils/route-guards.server';

export const action = createProtectedAction(
  async (context) => {
    const { request, token, tenantContext } = context;
    const formData = await request.formData();
    const orderId = formData.get('orderId');

    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Empresa-Id': tenantContext.empresaId,
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    return json({ success: response.ok });
  },
  {
    allowedMethods: ['POST', 'PATCH'],
  }
);
```

### Logout Link in Component

```tsx
import { Form } from '@remix-run/react';

export function LogoutButton() {
  return (
    <Form action="/es/auth/logout" method="post">
      <button type="submit">Cerrar Sesión</button>
    </Form>
  );
}
```

## Environment Variables

```bash
# API configuration
VITE_API_URL=http://localhost:8600        # NestJS API URL
VITE_API_TIMEOUT=30000                    # Request timeout (ms)

# Session configuration
SESSION_SECRET=your-secret-key-here       # Encryption key (min 32 chars in prod)
NODE_ENV=development|production           # Determines secure cookie flag
```

## Testing

### E2E Test: Register → Login → Redirect

```typescript
describe('Authentication Flow', () => {
  test('Register → Login → Dashboard', async () => {
    // 1. Register
    const response = await fetch('/es/auth/register', {
      method: 'POST',
      body: formData('nombre=Test', 'email=test@example.com', 'password=Test123456'),
    });
    
    expect(response.status).toBe(302); // Redirect
    expect(response.headers.get('Set-Cookie')).toContain('__session');
    
    // 2. Follow redirect to dashboard
    const dashboard = await fetch(response.headers.get('Location'), {
      headers: { 'Cookie': response.headers.get('Set-Cookie') },
    });
    
    expect(dashboard.status).toBe(200);
    expect(dashboard.text()).toContain('Dashboard');
  });

  test('Logout clears session', async () => {
    const response = await fetch('/es/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': '__session=...' },
    });
    
    expect(response.status).toBe(302); // Redirect
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0');
  });

  test('Protected route redirects if no session', async () => {
    const response = await fetch('/es/dashboard', {
      redirect: 'manual',
    });
    
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('/es/auth/login');
  });
});
```

## Troubleshooting

### Session Not Persisting
- Check `SESSION_SECRET` is set
- Verify cookie is being set: Check Response headers for `Set-Cookie`
- Ensure browser allows cookies
- Check cookie path is `/`

### Redirect Loop (Login → Dashboard → Login)
- JWT validation failing: Check token in API request
- API not responding: Check `VITE_API_URL`
- Token expired: Implement refresh endpoint or re-login

### 401 on Protected Routes
- Session cookie not being sent: Check `httpOnly=false` for debugging
- JWT invalid: Validate token format
- API endpoint requires auth: Add `Authorization` header

### CORS Errors
- API running on different domain: Configure CORS in NestJS
- Missing `credentials: 'include'` in fetch: Add for cross-domain auth

## Future Enhancements

1. **Token Refresh**
   - Implement refresh token endpoint
   - Auto-refresh before expiry
   - Longer session persistence

2. **Two-Factor Authentication**
   - Email verification
   - TOTP support
   - Backup codes

3. **Social Auth**
   - Google OAuth
   - GitHub OAuth
   - Continue existing accounts

4. **Role-Based Access**
   - Server-side role validation
   - Per-route role requirements
   - Permission matrix

5. **Session Management**
   - List active sessions
   - Revoke sessions
   - Device tracking

## File Structure

```
apps/wapsell-remix/
├── app/
│   ├── routes/
│   │   ├── $lang.auth.login.tsx          # Login route + action
│   │   ├── $lang.auth.register.tsx       # Register route + action
│   │   ├── $lang.auth.logout.tsx         # Logout route
│   │   └── $lang.dashboard.*             # Protected routes
│   │
│   ├── components/auth/
│   │   ├── LoginForm.tsx                 # Login form component
│   │   └── RegisterForm.tsx              # Register form component
│   │
│   ├── services/
│   │   └── auth.server.ts                # Auth service + session storage
│   │
│   ├── utils/
│   │   ├── route-guards.server.ts        # Route protection utilities
│   │   └── tenant-context.server.ts      # Tenant context extraction
│   │
│   └── types/
│       └── auth.ts                       # TypeScript interfaces
```

## Related Documentation

- [Route Guards](./app/utils/route-guards.server.ts)
- [Tenant Context](./app/utils/tenant-context.server.ts)
- [Auth Service](./app/services/auth.server.ts)
- [NestJS API Auth](../../api/src/auth/auth.controller.ts)
