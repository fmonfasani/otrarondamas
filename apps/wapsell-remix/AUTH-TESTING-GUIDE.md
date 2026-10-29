# Authentication Testing Guide

## Manual Testing Checklist

### Prerequisites
- NestJS API running at `http://localhost:8600`
- Remix dev server running at `http://localhost:3000`
- `SESSION_SECRET` environment variable set

### Test 1: Register Flow

**Steps:**
1. Navigate to `http://localhost:3000/es/auth/register`
2. Fill in the form:
   - Nombre: "Test User"
   - Email: "test@example.com"
   - Password: "TestPassword123"
   - Confirm Password: "TestPassword123"
3. Check the terms checkbox
4. Click "Crear Cuenta"

**Expected Results:**
- Form submits successfully
- POST request to `/es/auth/register` succeeds (200)
- Session cookie `__session` is set in Response headers
- Redirects to `/es/dashboard` (302)
- Dashboard loads with user authenticated
- Page shows welcome message or user data

**Error Cases:**
- Email already exists: Shows "Email ya registrado"
- Password too short: Shows "La contraseña debe tener al menos 6 caracteres"
- Passwords don't match: Shows "Las contraseñas no coinciden"
- Name too short: Shows "El nombre debe tener al menos 2 caracteres"
- Invalid email format: Shows "El correo electrónico no es válido"

---

### Test 2: Login Flow

**Steps:**
1. Navigate to `http://localhost:3000/es/auth/login`
2. Fill in the form:
   - Email: "test@example.com" (from Test 1)
   - Password: "TestPassword123"
3. Click "Iniciar Sesión"

**Expected Results:**
- POST request to `/es/auth/login` succeeds (200)
- Session cookie `__session` is set
- Redirects to `/es/dashboard` (302)
- Dashboard loads with authenticated user
- Can see user-specific data

**Error Cases:**
- Invalid email: Shows "Email o contraseña incorrectos"
- Wrong password: Shows "Email o contraseña incorrectos"
- Email format invalid: Shows "El correo electrónico no es válido"

---

### Test 3: Already Logged In Redirect

**Steps:**
1. Login successfully (Test 2)
2. Navigate to `http://localhost:3000/es/auth/login`

**Expected Results:**
- Loader detects existing JWT in session
- Redirects to `/es/dashboard` (302)
- Never shows login form

---

### Test 4: Logout Flow

**Steps:**
1. Login successfully (Test 2)
2. Click logout button or navigate to `http://localhost:3000/es/auth/logout`
3. If via link, it should POST to `/es/auth/logout`

**Expected Results:**
- Session cookie `__session` is cleared (Max-Age=0)
- Redirects to `/es/` (302)
- Landing page shows (not dashboard)

---

### Test 5: Protected Route Access

**Steps:**
1. Without login, navigate to `http://localhost:3000/es/dashboard`

**Expected Results:**
- `requireAuth()` in loader throws 401
- Redirects to `/es/auth/login` (302)
- Login page shows

---

### Test 6: Session Persistence

**Steps:**
1. Login successfully
2. Close browser tab (or clear tab)
3. Re-open browser tab
4. Navigate to `http://localhost:3000/es/dashboard`

**Expected Results:**
- Session cookie `__session` is restored from browser storage
- JWT validated with API (validateJWT call)
- Dashboard loads without re-login
- User data shows

---

### Test 7: Token Expiration

**Steps:**
1. Login successfully
2. Wait 7 days OR modify session to have expired JWT
3. Try to access protected route

**Expected Results:**
- validateJWT returns false (401)
- Session is destroyed
- Redirects to login
- Must login again

---

### Test 8: Locale Support (ES ↔ EN)

**Steps:**
1. Navigate to `http://localhost:3000/en/auth/login`
2. Verify English text
3. Navigate to `http://localhost:3000/es/auth/register`
4. Verify Spanish text

**Expected Results:**
- Forms show correct language
- Validation messages in correct language
- Redirects maintain locale (e.g., logout goes to `/es/` not `/en/`)

---

### Test 9: Multi-Tenant Context

**Steps:**
1. Login with account that has multiple empresas
2. Check session data

**Expected Results:**
- Session contains `empresas` array
- `empresaId` is set to first empresa
- Protected loaders receive `tenantContext`
- API requests include correct `X-Empresa-Id` header

---

## Automated Testing (Vitest / Playwright)

### Unit Test: Auth Service

```typescript
// File: app/services/auth.server.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as authService from './auth.server';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_API_URL = 'http://localhost:8600';
    process.env.SESSION_SECRET = 'test-secret';
  });

  describe('loginWithNestJS', () => {
    it('should return token and user on successful login', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'eyJhbGc...',
            user: { id: '1', email: 'test@example.com', name: 'Test' },
            empresas: [{ id: '1', name: 'Company' }],
          }),
        } as Response)
      );

      const result = await authService.loginWithNestJS('test@example.com', 'password');

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
      expect(result.empresas).toHaveLength(1);
    });

    it('should throw error on invalid credentials', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        } as Response)
      );

      await expect(
        authService.loginWithNestJS('test@example.com', 'wrong')
      ).rejects.toThrow('Email o contraseña incorrectos');
    });

    it('should throw error on email already registered', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 409,
          json: () => Promise.resolve({ message: 'Email exists' }),
        } as Response)
      );

      await expect(
        authService.registerWithNestJS('test@example.com', 'password', 'Test')
      ).rejects.toThrow('Email ya registrado');
    });
  });

  describe('validateJWT', () => {
    it('should return true for valid token', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: true } as Response)
      );

      const result = await authService.validateJWT('valid-token');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({ ok: false, status: 401 } as Response)
      );

      const result = await authService.validateJWT('invalid-token');

      expect(result).toBe(false);
    });
  });
});
```

### Integration Test: Login Route

```typescript
// File: app/routes/$lang.auth.login.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequestHandler } from '@remix-run/node';

describe('Login Route', () => {
  describe('loader', () => {
    it('should return locale for unauthenticated user', async () => {
      const loader = require('./$lang.auth.login').loader;
      const request = new Request('http://localhost/es/auth/login');

      const result = await loader({ request, params: { lang: 'es' } });
      const data = await result.json();

      expect(data.locale).toBe('es');
    });

    it('should redirect to dashboard for authenticated user', async () => {
      const loader = require('./$lang.auth.login').loader;
      const request = new Request('http://localhost/es/auth/login', {
        headers: { Cookie: '__session=valid-session' },
      });

      const result = await loader({ request, params: { lang: 'es' } });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/es/dashboard');
    });
  });

  describe('action', () => {
    it('should create session and redirect on successful login', async () => {
      // Mock fetch for NestJS API
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            access_token: 'token',
            user: { id: '1', email: 'test@example.com' },
            empresas: [{ id: '1', name: 'Company' }],
          }),
        } as Response)
      );

      const action = require('./$lang.auth.login').action;
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'password');

      const request = new Request('http://localhost/es/auth/login', {
        method: 'POST',
        body: formData,
      });

      const result = await action({ request, params: { lang: 'es' } });

      expect(result.status).toBe(302);
      expect(result.headers.get('Location')).toContain('/es/dashboard');
      expect(result.headers.get('Set-Cookie')).toContain('__session');
    });

    it('should return error for invalid credentials', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({}),
        } as Response)
      );

      const action = require('./$lang.auth.login').action;
      const formData = new FormData();
      formData.append('email', 'test@example.com');
      formData.append('password', 'wrong');

      const request = new Request('http://localhost/es/auth/login', {
        method: 'POST',
        body: formData,
      });

      const result = await action({ request, params: { lang: 'es' } });
      const data = await result.json();

      expect(result.status).toBe(401);
      expect(data.error).toContain('incorrectos');
    });
  });
});
```

### E2E Test: Full Auth Flow (Playwright)

```typescript
// File: e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const API_URL = 'http://localhost:8600';
  const APP_URL = 'http://localhost:3000';

  test('Register → Login → Logout', async ({ page, context }) => {
    // Test 1: Register
    await page.goto(`${APP_URL}/es/auth/register`);

    await page.fill('input[name="nombre"]', 'Test User');
    await page.fill('input[name="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123');
    await page.check('input[type="checkbox"]'); // Terms

    // Intercept API call
    const registerPromise = page.waitForResponse(
      (response) => response.url().includes(`${API_URL}/auth/register`) && response.status() === 200
    );

    await page.click('button[type="submit"]');

    await registerPromise;
    await expect(page).toHaveURL(/\/es\/dashboard/);

    // Test 2: Logout
    const cookies = await context.cookies();
    const sessionCookie = cookies.find((c) => c.name === '__session');
    expect(sessionCookie).toBeDefined();

    await page.click('button:has-text("Cerrar Sesión")');

    await expect(page).toHaveURL(/\/es\/$/);

    // Session cookie cleared
    const newCookies = await context.cookies();
    const newSessionCookie = newCookies.find((c) => c.name === '__session');
    expect(newSessionCookie?.value).toBe('');
  });

  test('Protected route redirects to login', async ({ page }) => {
    // Navigate to dashboard without auth
    await page.goto(`${APP_URL}/es/dashboard`, { waitUntil: 'networkidle' });

    // Should redirect to login
    await expect(page).toHaveURL(/\/es\/auth\/login/);
  });

  test('Locale persistence in auth flow', async ({ page }) => {
    await page.goto(`${APP_URL}/en/auth/login`);

    // Check English text
    await expect(page.locator('text=Sign In')).toBeVisible();

    // Switch to Spanish
    await page.goto(`${APP_URL}/es/auth/login`);

    // Check Spanish text
    await expect(page.locator('text=Iniciar Sesión')).toBeVisible();
  });
});
```

## Testing Checklist

### Before Push

- [ ] Manual register flow works
- [ ] Manual login flow works
- [ ] Manual logout clears session
- [ ] Protected routes redirect to login
- [ ] Already logged in redirect works
- [ ] Session persists across page reloads
- [ ] Locale (es/en) works correctly
- [ ] Error messages display correctly
- [ ] API timeouts handled gracefully
- [ ] Network errors show user-friendly message

### CI/CD Pipeline

- [ ] All unit tests pass (`npm test`)
- [ ] Integration tests pass
- [ ] E2E tests pass in staging
- [ ] No console errors or warnings
- [ ] No accessibility violations
- [ ] Load time < 3s for auth routes
- [ ] Session cookie secure in production

## Debugging

### Enable Debug Logging

```typescript
// In auth.server.ts, set DEBUG environment variable
if (process.env.DEBUG === 'auth') {
  console.log('[auth] Request:', { email, method: request.method });
  console.log('[auth] Session:', { jwt: token?.slice(0, 20) + '...' });
  console.log('[auth] Response:', response.status);
}
```

### Inspect Session Cookie

```javascript
// In browser console
document.cookie // Shows __session cookie
JSON.parse(atob(document.cookie.split('=')[1])) // Decode (if not httpOnly)
```

### API Request Logging

```typescript
// In browser Network tab
// Filter by /auth/
// Check Request/Response headers
// Verify Authorization header is present
```

### Common Issues

| Issue | Debug Step |
|-------|-----------|
| Session not persisting | Check Set-Cookie header in Response |
| JWT validation failing | Verify token format in session |
| Redirect loop | Check API /auth/validate endpoint |
| 401 errors | Verify API_URL and token format |
| Email validation failing | Check regex pattern in validation |

## Performance Testing

### Session Validation Time

```bash
# Measure requireAuth() execution time
time curl -H "Cookie: __session=..." http://localhost:3000/es/dashboard
```

Expected: < 100ms (cached) or < 500ms (with API call)

### Load Testing

```bash
# Using Apache Bench
ab -c 10 -n 100 -C "__session=..." http://localhost:3000/es/dashboard

# Expected: All requests succeed, < 1% error rate
```

## Security Testing

### 1. Session Hijacking
- Verify httpOnly flag prevents JS access
- Verify secure flag in production
- Test CSRF protection (sameSite=lax)

### 2. Token Expiration
- Modify token expiry in JWT
- Attempt to use expired token
- Verify automatic re-login required

### 3. Cross-Site Request Forgery (CSRF)
- Attempt form submission from different origin
- Verify rejection (sameSite=lax prevents simple attacks)

### 4. Password Strength
- Attempt weak passwords
- Verify API validation errors

### 5. Email Verification
- Register with fake email
- Verify no account creation (if email verification required)

## Accessibility Testing

- [ ] Login form keyboard navigable
- [ ] Error messages announced to screen readers
- [ ] Focus management after logout
- [ ] High contrast visible in dark mode

---

**Next Steps:** After testing, refer to [AUTH-FLOW-DOCUMENTATION.md](./AUTH-FLOW-DOCUMENTATION.md) for implementation details.
