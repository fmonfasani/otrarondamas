# E2E Testing Framework - Setup & Integration Guide

## Overview

This guide provides step-by-step instructions to set up and integrate the E2E testing framework into the Wapsell project. The framework includes:

- **17 Critical Journey Tests** (T1.1-T1.17)
- **4 Test Suites** covering Auth, Dashboard, Isolation, and Messaging
- **Playwright Test Runner** with Chrome and Firefox
- **Test Utilities & Fixtures** for rapid test authoring
- **CI/CD Integration** via GitHub Actions

## Architecture

```
wapsell-frontend/
├── tests/e2e/                    # E2E tests root
│   ├── auth-flow.spec.ts        # T1.1-T1.5: Authentication (5 tests)
│   ├── dashboard.spec.ts        # T1.6-T1.10: Dashboard (5 tests)
│   ├── multi-tenant-isolation.spec.ts  # T1.11-T1.15: Isolation (5 tests)
│   ├── messaging-integration.spec.ts   # T1.16-T1.17: Messaging (2 tests)
│   ├── performance.spec.ts      # Performance & Stability
│   ├── fixtures.ts              # Test utilities & helpers
│   ├── phase1-auth.spec.ts      # Legacy compatibility
│   └── README.md                # Test documentation
├── playwright.config.ts         # Playwright configuration
├── E2E-SETUP-GUIDE.md          # This file
└── package.json                # Updated with Playwright

apps/api/
├── src/test/
│   ├── test.controller.ts      # Test helper endpoints
│   ├── test.service.ts         # Test data setup logic
│   └── test.module.ts          # Test module
└── package.json                # No changes needed

.github/workflows/
└── e2e-tests.yml               # CI/CD workflow for E2E
```

## Step 1: Install Dependencies

### Frontend E2E Package
```bash
cd apps/wapsell-frontend
npm install @playwright/test@^1.40.0
npx playwright install
npx playwright install-deps
```

The `package.json` has been updated with:
- `@playwright/test` as devDependency
- Scripts: `test:e2e`, `test:e2e:headed`, `test:e2e:ui`, `test:e2e:debug`

## Step 2: Configure Test Backend Endpoints

The API now includes test helper endpoints. Add the TestModule to your AppModule:

**apps/api/src/app.module.ts**

```typescript
import { TestModule } from './test/test.module';

@Module({
  imports: [
    // ... existing modules
    TestModule,
  ],
  // ...
})
export class AppModule {}
```

### Available Test Endpoints

```
POST   /api/test/setup-user
       - Creates a test user with one business
       - Request: { email, password, fullName? }
       - Response: { token, user, businesses }

POST   /api/test/setup-user-with-multiple-businesses
       - Creates a test user with multiple businesses
       - Request: { email, password, businessCount? }
       - Response: { token, user, businesses }

GET    /api/test/get-reset-token
       - Gets password reset token for a user
       - Query: ?email=user@example.com
       - Response: { token }

POST   /api/test/cleanup
       - Deletes all test users
       - Request: {}
       - Response: { deletedUsers }

GET    /api/test/health
       - Health check for test infrastructure
       - Response: { status, timestamp }
```

## Step 3: Environment Configuration

Create `.env.test` in `apps/wapsell-frontend/`:

```env
BASE_URL=http://localhost:3000
API_URL=http://localhost:8600
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
PLAYWRIGHT_SLOW_MO=0
```

Create `.env.test` in `apps/api/` (if using):

```env
DATABASE_URL=postgresql://test:test@localhost:5432/wapsell_test
JWT_SECRET=test-secret
NODE_ENV=test
```

## Step 4: Run Tests Locally

### Prerequisites
- Backend running: `npm run start:dev` in `apps/api/`
- Frontend dev server running: `npm run dev` in `apps/wapsell-frontend/`
- Postgres accessible on default port

### Run All Tests
```bash
cd apps/wapsell-frontend
npm run test:e2e
```

### Run Specific Test Suite
```bash
npx playwright test tests/e2e/auth-flow.spec.ts
npx playwright test tests/e2e/dashboard.spec.ts
npx playwright test tests/e2e/multi-tenant-isolation.spec.ts
```

### Run in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Run in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Specific Test by Name
```bash
npx playwright test -g "T1.1: Signup"
npx playwright test -g "T1.6: Dashboard loads"
```

## Step 5: GitHub Actions CI/CD

The workflow `.github/workflows/e2e-tests.yml` is configured to:

1. Spin up Postgres 15 container
2. Run database migrations
3. Start backend server
4. Install Playwright browsers
5. Run all E2E tests
6. Generate HTML report
7. Upload screenshots on failure

### Workflow Triggers
- Push to `main` branch
- Push to `refactor/opcion-6` branch
- Pull requests to `main` branch

### View CI Results
1. Go to GitHub Actions tab
2. Select "E2E Tests" workflow
3. View test results and artifacts

### Debug Failed Tests
- Download "playwright-report" artifact
- Download "e2e-screenshots" artifact on failures
- View HTML report: `npx playwright show-report`

## Step 6: Add Test ID Selectors to Components

For tests to work properly, add `data-testid` attributes to key components:

### Dashboard Component
```tsx
// DashboardStats.tsx
<div data-testid="kpi-total-sales">
  <div className="value">${totalSales}</div>
</div>

<div data-testid="kpi-total-orders">
  <div className="value">{totalOrders}</div>
</div>

<div data-testid="kpi-active-products">
  <div className="value">{activeProducts}</div>
</div>

<div data-testid="kpi-pending-orders">
  <div className="value">{pendingOrders}</div>
</div>
```

### BusinessSelector Component
```tsx
// BusinessSelector.tsx
<select data-testid="business-selector">
  {businesses.map((b) => (
    <option key={b.id} data-testid={`business-option-${b.id}`}>
      {b.name}
    </option>
  ))}
</select>
```

### Navigation Component
```tsx
// Navigation.tsx
<nav data-testid="main-navigation">
  <a href="/es/dashboard" data-testid="nav-dashboard">Dashboard</a>
  <a href="/es/productos" data-testid="nav-products">Productos</a>
  <a href="/es/pedidos" data-testid="nav-orders">Pedidos</a>
  <a href="/es/configuracion" data-testid="nav-settings">Configuración</a>
</nav>

<button data-testid="hamburger-menu">☰</button>
<nav data-testid="mobile-navigation">...</nav>
```

### Forms & Buttons
```tsx
// LoginForm.tsx
<input name="email" type="email" />
<input name="password" type="password" />
<button>Iniciar sesión</button>

// OrderForm.tsx
<form data-testid="order-form">
  <input name="customerName" />
  <input name="customerEmail" />
  <select name="product" data-testid="product-selector">
    {products.map((p) => (
      <option key={p.id} data-testid={`product-option-${p.id}`}>
        {p.name}
      </option>
    ))}
  </select>
  <input name="quantity" type="number" />
  <button data-testid="btn-submit-order">Crear</button>
</form>
```

### Alerts & Notifications
```tsx
// Toast.tsx
<div role="alert" data-testid="notification-toast">
  {message}
</div>
```

## Step 7: Verify Installation

### Check All Files Created
```bash
# Frontend files
ls -la apps/wapsell-frontend/playwright.config.ts
ls -la apps/wapsell-frontend/tests/e2e/
ls -la apps/wapsell-frontend/E2E-SETUP-GUIDE.md

# API files
ls -la apps/api/src/test/

# CI/CD
ls -la .github/workflows/e2e-tests.yml
```

### Test Health Check
```bash
# In apps/api directory
curl http://localhost:8600/api/test/health

# Response should be:
# {"status":"ok","timestamp":"2024-..."}
```

### Run Sample Test
```bash
cd apps/wapsell-frontend
npm run test:e2e -- -g "T1.4: Invalid credentials" --headed
```

## Step 8: Integration Checklist

- [ ] Playwright installed and configured
- [ ] Test files created (`auth-flow.spec.ts`, `dashboard.spec.ts`, etc.)
- [ ] Test utilities created (`fixtures.ts`)
- [ ] API test endpoints implemented (`test.controller.ts`, `test.service.ts`)
- [ ] TestModule added to AppModule
- [ ] CI/CD workflow created (`.github/workflows/e2e-tests.yml`)
- [ ] data-testid attributes added to components
- [ ] Environment files configured (`.env.test`)
- [ ] Local tests run successfully
- [ ] CI/CD tests pass on main branch

## Step 9: Maintenance & Updates

### Add New Tests
1. Create `feature.spec.ts` in `tests/e2e/`
2. Import fixtures: `import { setupTestUser, loginUser } from './fixtures';`
3. Use test ID selectors for element selection
4. Document test in `tests/e2e/README.md`

### Update Test Data API
1. Modify `test.service.ts` with new setup logic
2. Add endpoint to `test.controller.ts`
3. Update `fixtures.ts` with new helper function
4. Document in this guide

### Monitor Test Health
- Check Playwright reports weekly
- Review failed test logs
- Update timeouts if needed
- Monitor test execution time

## Troubleshooting

### "Target page, context or browser has been closed"
**Solution**: Backend not running or database not accessible
```bash
cd apps/api
npm run start:dev

# In another terminal
cd apps/api
npx prisma migrate dev
```

### "Timeout waiting for locator [data-testid="..."]"
**Solution**: Component doesn't have test ID or is not rendered
1. Add/check `data-testid` attribute in component
2. Verify component renders in that route
3. Increase timeout: `{ timeout: 10000 }`

### "Failed to execute: 403 Unauthorized"
**Solution**: API isolation test failing correctly (expected)
- Verify test assertion expects 403
- Check multi-tenant isolation logic in backend

### Flaky Tests
**Solution**: Use proper waits instead of sleep
```typescript
// Bad
await page.waitForTimeout(2000);

// Good
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();
await page.waitForURL(/\/es\/dashboard/);
```

## Success Metrics

✅ **17 Tests**: Auth (5) + Dashboard (5) + Isolation (5) + Messaging (2)  
✅ **0% Flakiness**: Tests pass consistently  
✅ **<3s Load Time**: Dashboard loads within target  
✅ **100% Isolation**: Multi-tenant verified  
✅ **0 Console Errors**: No unhandled errors  
✅ **CI/CD Green**: All tests pass in GitHub Actions  

## Next Steps

1. Install and configure as described above
2. Run local tests and verify all pass
3. Commit changes to feature branch
4. Open PR and verify CI/CD passes
5. Merge to main when all tests green
6. Monitor test health in production

## References

- **Framework**: [Playwright Documentation](https://playwright.dev/)
- **Tests**: `apps/wapsell-frontend/tests/e2e/README.md`
- **Fixtures**: `apps/wapsell-frontend/tests/e2e/fixtures.ts`
- **CI/CD**: `.github/workflows/e2e-tests.yml`
- **API Setup**: `apps/api/src/test/`

## Questions & Support

For issues with:
- **Test failures**: Check `playwright-report/` directory
- **Setup issues**: Review this guide and environment variables
- **API problems**: Check `apps/api/src/test/` implementation
- **CI/CD**: Review GitHub Actions logs

---

**E2E Framework Status**: ✅ Ready for integration  
**Last Updated**: 2026-10-28  
**Maintainer**: Claude Haiku 4.5
