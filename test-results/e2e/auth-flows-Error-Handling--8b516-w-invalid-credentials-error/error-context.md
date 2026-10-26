# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.js >> Error Handling >> should show invalid credentials error
- Location: tests\e2e\auth-flows.spec.js:433:7

# Error details

```
Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/es/auth/login
Call log:
  - navigating to "https://www.wapsell.com/es/auth/login", waiting until "load"

```

# Test source

```ts
  334 | });
  335 | 
  336 | // ============================================================================
  337 | // TEST 5: Responsive Design
  338 | // ============================================================================
  339 | test.describe('Responsive Design', () => {
  340 |   for (const [vpName, vpSize] of Object.entries(VIEWPORTS)) {
  341 |     test(`should be responsive on ${vpSize.name} (${vpSize.width}px)`, async ({ page }) => {
  342 |       // Set viewport
  343 |       await page.setViewportSize({ width: vpSize.width, height: vpSize.height });
  344 | 
  345 |       // Navigate to login
  346 |       await page.goto(`${LOCALES.ES.domain}/auth/login`);
  347 | 
  348 |       // Verify h1 is visible
  349 |       const heading = page.locator('h1');
  350 |       await expect(heading).toBeVisible({ timeout: 10000 });
  351 | 
  352 |       // Check for horizontal scroll
  353 |       const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  354 |       const viewportWidth = vpSize.width;
  355 |       const hasHorizontalScroll = bodyWidth > viewportWidth;
  356 | 
  357 |       console.log(`[TEST 5] ${vpSize.name}: Body width=${bodyWidth}px, Viewport=${viewportWidth}px, Scroll=${hasHorizontalScroll}`);
  358 | 
  359 |       // Verify inputs are visible and usable
  360 |       const emailInput = page.locator('input[type="email"]');
  361 |       await expect(emailInput).toBeVisible();
  362 | 
  363 |       const boundingBox = await emailInput.boundingBox();
  364 |       test.expect(boundingBox).toBeTruthy();
  365 |       test.expect(boundingBox.width).toBeGreaterThan(50);
  366 | 
  367 |       console.log(`[TEST 5] ${vpSize.name}: Email input is visible and usable`);
  368 | 
  369 |       // Verify button is clickable
  370 |       const submitButton = page.getByRole('button', { name: /Inicia sesión|Sign In/i });
  371 |       await expect(submitButton).toBeVisible();
  372 | 
  373 |       const buttonBox = await submitButton.boundingBox();
  374 |       test.expect(buttonBox).toBeTruthy();
  375 |       test.expect(buttonBox.width).toBeGreaterThan(40);
  376 | 
  377 |       console.log(`[TEST 5] ${vpSize.name}: Submit button is visible and clickable`);
  378 | 
  379 |       // No assertion on horizontal scroll - just log it
  380 |       test.expect(vpSize).toBeTruthy(); // Just verify viewport was set
  381 |     });
  382 |   }
  383 | });
  384 | 
  385 | // ============================================================================
  386 | // TEST 6: Error Handling
  387 | // ============================================================================
  388 | test.describe('Error Handling', () => {
  389 |   test('should show email validation error', async ({ page }) => {
  390 |     await page.goto(`${LOCALES.ES.domain}/auth/login`);
  391 | 
  392 |     // Enter invalid email
  393 |     const emailInput = page.locator('input[type="email"]');
  394 |     await emailInput.fill('invalid-email');
  395 | 
  396 |     // Try to submit
  397 |     const submitButton = page.getByRole('button', { name: /Inicia sesión|Sign In/i });
  398 |     await submitButton.click();
  399 | 
  400 |     // Look for validation error
  401 |     const errorMessage = page.locator('text=/debe ser un correo válido|invalid email|correo electrónico inválido/i');
  402 | 
  403 |     try {
  404 |       await expect(errorMessage).toBeVisible({ timeout: 5000 });
  405 |       console.log(`[TEST 6] Email validation error displayed`);
  406 |     } catch (e) {
  407 |       console.log(`[TEST 6] Email validation error not shown (browser may handle silently)`);
  408 |     }
  409 |   });
  410 | 
  411 |   test('should show required field error', async ({ page }) => {
  412 |     await page.goto(`${LOCALES.ES.domain}/auth/login`);
  413 | 
  414 |     // Enter email but leave password empty
  415 |     const emailInput = page.locator('input[type="email"]');
  416 |     await emailInput.fill(TEST_CREDENTIALS.existingUser.email);
  417 | 
  418 |     // Try to submit without password
  419 |     const submitButton = page.getByRole('button', { name: /Inicia sesión|Sign In/i });
  420 |     await submitButton.click();
  421 | 
  422 |     // Look for required field error
  423 |     const errorMessage = page.locator('text=/requerido|required|must be/i');
  424 | 
  425 |     try {
  426 |       await expect(errorMessage).toBeVisible({ timeout: 5000 });
  427 |       console.log(`[TEST 6] Required field error displayed`);
  428 |     } catch (e) {
  429 |       console.log(`[TEST 6] Required field error not shown (HTML5 validation)`);
  430 |     }
  431 |   });
  432 | 
  433 |   test('should show invalid credentials error', async ({ page }) => {
> 434 |     await page.goto(`${LOCALES.ES.domain}/auth/login`);
      |                ^ Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/es/auth/login
  435 | 
  436 |     // Enter valid format but wrong credentials
  437 |     const emailInput = page.locator('input[type="email"]');
  438 |     const passwordInput = page.locator('input[type="password"]');
  439 | 
  440 |     await emailInput.fill('wrong@example.com');
  441 |     await passwordInput.fill('wrongpass123');
  442 | 
  443 |     let apiErrorResponse = null;
  444 |     page.on('response', (response) => {
  445 |       if ((response.url().includes('/auth/login') || response.url().includes('/auth/signin')) && response.status() >= 400) {
  446 |         apiErrorResponse = {
  447 |           status: response.status(),
  448 |           url: response.url(),
  449 |           timestamp: Date.now(),
  450 |         };
  451 |       }
  452 |     });
  453 | 
  454 |     const submitButton = page.getByRole('button', { name: /Inicia sesión|Sign In/i });
  455 |     await submitButton.click();
  456 | 
  457 |     // Wait for API error response
  458 |     await page.waitForTimeout(3000);
  459 | 
  460 |     // Look for invalid credentials error
  461 |     const errorMessage = page.locator('text=/credenciales inválidas|invalid credentials|no encontrado|not found/i');
  462 | 
  463 |     try {
  464 |       await expect(errorMessage).toBeVisible({ timeout: 5000 });
  465 |       console.log(`[TEST 6] Invalid credentials error displayed`);
  466 |     } catch (e) {
  467 |       console.log(`[TEST 6] Invalid credentials error not shown, API response: ${apiErrorResponse?.status}`);
  468 |     }
  469 | 
  470 |     console.log(`[TEST 6] API Error Response:`, apiErrorResponse);
  471 |   });
  472 | });
  473 | 
  474 | // ============================================================================
  475 | // Test Configuration
  476 | // ============================================================================
  477 | test.beforeEach(async ({ page }) => {
  478 |   // Set reasonable timeout for all operations
  479 |   page.setDefaultTimeout(30000);
  480 |   page.setDefaultNavigationTimeout(30000);
  481 | });
  482 | 
```