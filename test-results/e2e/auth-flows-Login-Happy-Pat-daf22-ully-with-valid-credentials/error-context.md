# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.js >> Login Happy Path >> should login successfully with valid credentials
- Location: tests\e2e\auth-flows.spec.js:37:7

# Error details

```
TimeoutError: page.goto: Timeout 30000ms exceeded.
Call log:
  - navigating to "https://www.wapsell.com/es/auth/login", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // ============================================================================
  4   | // AUTH FLOWS E2E TESTS
  5   | // Target: https://www.wapsell.com (LIVE Frontend)
  6   | // API: https://api.wapsell.com/auth/*
  7   | // ============================================================================
  8   | 
  9   | // Test configuration for different locales and viewports
  10  | const LOCALES = {
  11  |   ES: { lang: 'es', domain: 'https://www.wapsell.com/es', locale: 'ES' },
  12  |   EN: { lang: 'en', domain: 'https://www.wapsell.com/en', locale: 'EN' },
  13  | };
  14  | 
  15  | const VIEWPORTS = {
  16  |   MOBILE: { width: 375, height: 667, name: 'iPhone SE' },
  17  |   TABLET: { width: 768, height: 1024, name: 'iPad' },
  18  |   DESKTOP: { width: 1280, height: 720, name: 'Desktop' },
  19  | };
  20  | 
  21  | const TEST_CREDENTIALS = {
  22  |   newUser: {
  23  |     name: `Juan Pérez ${Date.now()}`,
  24  |     email: `test-${Date.now()}@wapsell.dev`,
  25  |     password: 'SecurePass123!',
  26  |   },
  27  |   existingUser: {
  28  |     email: 'test@example.com',
  29  |     password: 'password123',
  30  |   },
  31  | };
  32  | 
  33  | // ============================================================================
  34  | // TEST 1: Login Happy Path
  35  | // ============================================================================
  36  | test.describe('Login Happy Path', () => {
  37  |   test('should login successfully with valid credentials', async ({ page }) => {
  38  |     const startTime = Date.now();
  39  | 
  40  |     // Navigate to login page
> 41  |     await page.goto(`${LOCALES.ES.domain}/auth/login`);
      |                ^ TimeoutError: page.goto: Timeout 30000ms exceeded.
  42  |     const pageLoadTime = Date.now() - startTime;
  43  | 
  44  |     // Verify page loaded with correct heading
  45  |     const heading = page.locator('h1');
  46  |     await expect(heading).toHaveText('Inicia Sesión', { timeout: 10000 });
  47  | 
  48  |     // Fill email input
  49  |     await page.locator('input[type="email"]').fill(TEST_CREDENTIALS.existingUser.email);
  50  | 
  51  |     // Fill password input
  52  |     await page.locator('input[type="password"]').fill(TEST_CREDENTIALS.existingUser.password);
  53  | 
  54  |     // Capture network activity and click submit
  55  |     let apiResponse = null;
  56  |     page.on('response', (response) => {
  57  |       if (response.url().includes('/auth/login') || response.url().includes('/auth/signin')) {
  58  |         apiResponse = {
  59  |           status: response.status(),
  60  |           url: response.url(),
  61  |           timestamp: Date.now(),
  62  |         };
  63  |       }
  64  |     });
  65  | 
  66  |     await page.getByRole('button', { name: /Inicia sesión|Sign In/i }).click();
  67  | 
  68  |     // Wait for API response (max 30 seconds as per requirement)
  69  |     await page.waitForTimeout(2000);
  70  | 
  71  |     // Verify localStorage contains jwt and empresaId
  72  |     const localStorage = await page.evaluate(() => {
  73  |       return {
  74  |         jwt: localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('auth_token'),
  75  |         empresaId: localStorage.getItem('empresaId') || localStorage.getItem('companyId'),
  76  |         userId: localStorage.getItem('userId'),
  77  |       };
  78  |     });
  79  | 
  80  |     console.log(`[TEST 1] Page load time: ${pageLoadTime}ms`);
  81  |     console.log(`[TEST 1] API Response:`, apiResponse);
  82  |     console.log(`[TEST 1] localStorage:`, localStorage);
  83  | 
  84  |     // Wait for redirect or dashboard
  85  |     await page.waitForURL(/\/(dashboard|inicio|home|es\/?)$/i, { timeout: 30000 });
  86  |     const finalURL = page.url();
  87  |     console.log(`[TEST 1] Final URL after login: ${finalURL}`);
  88  | 
  89  |     test.expect(localStorage.jwt || localStorage.empresaId).toBeTruthy();
  90  |     test.expect(pageLoadTime).toBeLessThan(10000);
  91  |   });
  92  | });
  93  | 
  94  | // ============================================================================
  95  | // TEST 2: Register Happy Path
  96  | // ============================================================================
  97  | test.describe('Register Happy Path', () => {
  98  |   test('should register successfully with valid data', async ({ page }) => {
  99  |     const startTime = Date.now();
  100 | 
  101 |     // Navigate to register page
  102 |     await page.goto(`${LOCALES.ES.domain}/auth/register`);
  103 |     const pageLoadTime = Date.now() - startTime;
  104 | 
  105 |     // Verify page loaded
  106 |     const heading = page.locator('h1');
  107 |     await expect(heading).toHaveText(/Crea tu cuenta|Create Account/i, { timeout: 10000 });
  108 | 
  109 |     // Fill form
  110 |     const nameInput = page.locator('input[placeholder*="nombre" i], input[placeholder*="name" i]').first();
  111 |     const emailInput = page.locator('input[type="email"]').first();
  112 |     const passwordInput = page.locator('input[type="password"]').first();
  113 |     const confirmPasswordInput = page.locator('input[type="password"]').last();
  114 | 
  115 |     await nameInput.fill(TEST_CREDENTIALS.newUser.name);
  116 |     await emailInput.fill(TEST_CREDENTIALS.newUser.email);
  117 |     await passwordInput.fill(TEST_CREDENTIALS.newUser.password);
  118 |     await confirmPasswordInput.fill(TEST_CREDENTIALS.newUser.password);
  119 | 
  120 |     // Accept terms checkbox
  121 |     const termsCheckbox = page.locator('input[type="checkbox"]').first();
  122 |     await termsCheckbox.check();
  123 | 
  124 |     // Capture API response
  125 |     let apiResponse = null;
  126 |     page.on('response', (response) => {
  127 |       if (response.url().includes('/auth/register') || response.url().includes('/auth/signup')) {
  128 |         apiResponse = {
  129 |           status: response.status(),
  130 |           url: response.url(),
  131 |           timestamp: Date.now(),
  132 |         };
  133 |       }
  134 |     });
  135 | 
  136 |     // Submit form
  137 |     await page.getByRole('button', { name: /Crea tu cuenta|Create Account/i }).click();
  138 | 
  139 |     // Wait for API response
  140 |     await page.waitForTimeout(2000);
  141 | 
```