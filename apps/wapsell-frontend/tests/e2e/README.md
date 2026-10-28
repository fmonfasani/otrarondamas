# E2E Testing Framework

Comprehensive end-to-end testing suite for Wapsell frontend, validating critical user journeys including authentication, dashboard functionality, and multi-tenant isolation.

## Framework: Playwright

- **Tool**: [@playwright/test](https://playwright.dev/)
- **Browsers**: Chromium, Firefox
- **Configuration**: `playwright.config.ts`
- **Test Organization**: BDD-style organized by feature

## Test Coverage (15+ Critical Journeys)

### T1: Authentication Flow (5 tests)
- **T1.1**: Signup → Create business → Dashboard (happy path)
- **T1.2**: Login with existing user → Switch business
- **T1.3**: Forgot password → Reset → Login
- **T1.4**: Invalid credentials → Error display
- **T1.5**: Session expiry → Redirect to login

**Location**: `auth-flow.spec.ts`

### T1: Dashboard Tests (5 tests)
- **T1.6**: Dashboard loads KPIs (stats visible, data fetched)
- **T1.7**: Business selector switches context + reloads data
- **T1.8**: Navigation links work (Products, Orders, Settings)
- **T1.9**: Protected route redirects if unauthenticated
- **T1.10**: Mobile responsive (hamburger menu, stacked layout)

**Location**: `dashboard.spec.ts`

### T1: Multi-Tenant Isolation (5 tests)
- **T1.11**: User A cannot see User B's businesses
- **T1.12**: User A switches to business B1 → sees only B1 data
- **T1.13**: User A tries direct API call to User B's data → 403
- **T1.14**: Business selector doesn't list businesses user doesn't own
- **T1.15**: Business selector doesn't list unrelated businesses via API

**Location**: `multi-tenant-isolation.spec.ts`

### T1: Messaging Integration (2 tests - Optional)
- **T1.16**: Create order → notification appears (Kafka event)
- **T1.17**: Broadcast to correct businessId only (isolation)

**Location**: `messaging-integration.spec.ts`

## Setup & Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Postgres database (for backend)
- Backend API running (localhost:8600)

### Install Test Dependencies
```bash
cd apps/wapsell-frontend
npm install @playwright/test
npx playwright install
```

### Environment Variables
Create `.env.test` in `apps/wapsell-frontend/`:

```env
BASE_URL=http://localhost:3000
API_URL=http://localhost:8600
PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
```

## Running Tests

### Run all E2E tests (headless)
```bash
npm run test:e2e
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run specific test file
```bash
npx playwright test tests/e2e/auth-flow.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "T1.1: Signup"
```

### Run in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Debug mode
```bash
npm run test:e2e:debug
```

### Run with specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
```

## Test Utilities & Fixtures

### Available Helpers (`fixtures.ts`)

#### User Setup
```typescript
import { setupTestUser, setupTestUserWithMultipleBusinesses } from './fixtures';

// Setup single user
const user = await setupTestUser(page);
const user = await setupTestUser(page, { 
  email: 'custom@example.com' 
});

// Setup user with multiple businesses
const userMulti = await setupTestUserWithMultipleBusinesses(page, {}, 2);
```

#### Authentication
```typescript
import { loginUser, logoutUser, clearAuth } from './fixtures';

await loginUser(page, user);
await logoutUser(page);
await clearAuth(page);
```

#### State Management
```typescript
import { getCurrentBusinessId, getCurrentToken } from './fixtures';

const businessId = await getCurrentBusinessId(page);
const token = await getCurrentToken(page);
```

#### Utilities
```typescript
import { 
  fillForm, 
  verifyElementContent, 
  waitForApiResponse,
  measurePageLoadTime,
  getConsoleErrors,
  takeScreenshot 
} from './fixtures';

await fillForm(page, {
  email: 'test@example.com',
  password: 'Test@1234'
});

await verifyElementContent(page, '[role="alert"]', 'Success');

const response = await waitForApiResponse(page, '/api/dashboard', 200);

const loadTime = await measurePageLoadTime(page, '/es/dashboard');

const errors = getConsoleErrors(page);

await takeScreenshot(page, 'login-success');
```

## Test Data Management

### API Test Endpoints (Backend)

The backend provides test helper endpoints when running in test mode:

```
POST /api/test/setup-user
POST /api/test/setup-user-with-multiple-businesses
GET /api/test/get-reset-token
POST /api/test/cleanup
GET /api/test/health
```

### Test Data Generators
```typescript
import { testDataGenerators } from './fixtures';

const email = testDataGenerators.email();
const businessName = testDataGenerators.businessName();
const password = testDataGenerators.password();
```

## CI/CD Integration

### GitHub Actions Workflow
- **File**: `.github/workflows/e2e-tests.yml`
- **Triggers**: Push to main/refactor/opcion-6, PR to main
- **Database**: Postgres 15 (containerized)
- **Report**: Playwright HTML report
- **Artifacts**: Screenshots on failure

### Run E2E in CI
```bash
npm run test:e2e
```

Environment variables automatically set:
- `CI=true` → Retries enabled, no reuse of server
- Workers: 1 (sequential)
- Timeout: 30 minutes

## Best Practices

### Test Organization
- One feature per file
- Group related tests with `test.describe()`
- Use descriptive test names matching journey IDs
- Keep tests independent (no shared state)

### Assertions
```typescript
// Good: Specific assertions
await expect(page.locator('[data-testid="kpi-total-sales"]')).toBeVisible();
await expect(notification).toContainText('Success');
await expect(response.status()).toBe(200);

// Avoid: Vague assertions
await expect(page).toContainText('something');
```

### Waits
```typescript
// Good: Explicit waits
await page.waitForURL(/\/es\/dashboard/);
await page.waitForLoadState('networkidle');
await expect(element).toBeVisible();

// Avoid: Arbitrary sleep
await page.waitForTimeout(5000); // Only use as last resort
```

### Error Handling
```typescript
// Proper error context
try {
  await loginUser(page, invalidUser);
} catch (error) {
  console.error('Login failed:', error.message);
  await takeScreenshot(page, 'login-error');
  throw error;
}
```

### Multi-tenant Verification
```typescript
// Always verify isolation at multiple levels:
// 1. UI selector visibility
// 2. localStorage values
// 3. API response status codes
// 4. API response content filtering
```

## Debugging

### View Test Report
```bash
npx playwright show-report
```

### View Screenshots
Screenshots on failure saved to: `tests/e2e/screenshots/`

### Enable Trace Viewer
```bash
npx playwright show-trace tests/e2e/screenshots/trace.zip
```

### Console Logs
```typescript
page.on('console', (msg) => console.log(msg.text()));
```

### Network Inspector
```typescript
page.on('response', (response) => {
  console.log(response.url(), response.status());
});
```

## Troubleshooting

### Tests fail with "Target page, context or browser has been closed"
- Backend not running → Start: `npm run start:test` in `apps/api`
- Database not accessible → Check `DATABASE_URL`

### Timeouts on API calls
- Increase timeout: `page.waitForResponse(..., { timeout: 30000 })`
- Check backend logs for errors
- Verify network connectivity

### Flaky tests
- Use `waitForLoadState('networkidle')` instead of sleep
- Add explicit waits for dynamic elements
- Check for race conditions in test setup

### Business selector not visible
- Ensure user is logged in
- Verify user has multiple businesses
- Check if selector is within a modal

## Performance Baselines

Target page load times:
- Login page: <2 seconds
- Dashboard: <3 seconds
- Business switch: <2 seconds

## Success Criteria

✅ All 15+ tests pass consistently (0 flakes)  
✅ Auth flow verified end-to-end  
✅ Multi-tenant isolation confirmed  
✅ Dashboard responsive + functional  
✅ CI passes all tests  
✅ No unhandled errors in console  

## Maintenance

### Update Test Data Fixtures
When API contracts change:
1. Update `fixtures.ts` with new field mappings
2. Update `.env.test` with new variables
3. Run full test suite to verify

### Add New Tests
1. Create new `*.spec.ts` file in `tests/e2e/`
2. Import fixtures as needed
3. Use test ID selectors for elements
4. Add data-testid attributes to components
5. Document test in this README

### Monitor Test Health
- Check Playwright HTML report weekly
- Review flaky test patterns
- Analyze failure reasons
- Update timeouts if needed

## References

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-page)
