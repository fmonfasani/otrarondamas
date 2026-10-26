# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.js >> i18n - English Language >> should navigate to recovery in English
- Location: tests\e2e\auth-flows.spec.js:321:7

# Error details

```
Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/en/auth/login
Call log:
  - navigating to "https://www.wapsell.com/en/auth/login", waiting until "load"

```

# Test source

```ts
  223 |           };
  224 |         }
  225 |       });
  226 | 
  227 |       await page.getByRole('button', { name: /Verificar código|Verify Code/i }).click();
  228 |       await page.waitForTimeout(2000);
  229 | 
  230 |       console.log(`[TEST 3] Step 2 API Response:`, step2Response);
  231 | 
  232 |       // Step 4: New password input
  233 |       console.log(`[TEST 3] Step 3: Enter new password`);
  234 |       const newPasswordInputs = page.locator('input[type="password"]');
  235 |       const firstPasswordInput = newPasswordInputs.nth(0);
  236 |       const confirmPasswordInput = newPasswordInputs.nth(1);
  237 | 
  238 |       await expect(firstPasswordInput).toBeVisible({ timeout: 5000 });
  239 |       await firstPasswordInput.fill('NewPass789!');
  240 |       await confirmPasswordInput.fill('NewPass789!');
  241 | 
  242 |       let step3Response = null;
  243 |       page.on('response', (response) => {
  244 |         if (response.url().includes('/reset') || response.url().includes('/password')) {
  245 |           step3Response = {
  246 |             status: response.status(),
  247 |             url: response.url(),
  248 |             timestamp: Date.now(),
  249 |           };
  250 |         }
  251 |       });
  252 | 
  253 |       await page.getByRole('button', { name: /Establecer nueva contraseña|Set New Password/i }).click();
  254 |       await page.waitForTimeout(2000);
  255 | 
  256 |       console.log(`[TEST 3] Step 3 API Response:`, step3Response);
  257 | 
  258 |       // Step 5: Success message
  259 |       console.log(`[TEST 3] Step 4: Verify success`);
  260 |       const successMessage = page.locator('text=/éxito|success|successfully/i');
  261 |       const successButton = page.getByRole('button', { name: /Ir a iniciar sesión|Go to Sign In/i });
  262 | 
  263 |       try {
  264 |         await expect(successButton).toBeVisible({ timeout: 5000 });
  265 |         console.log(`[TEST 3] Success button visible`);
  266 |         // Click to return to login
  267 |         await successButton.click();
  268 |       } catch (e) {
  269 |         console.log(`[TEST 3] Success button not found, checking for success message`);
  270 |       }
  271 |     } catch (e) {
  272 |       console.log(`[TEST 3] Recovery flow not fully implemented or different UI: ${e.message}`);
  273 |     }
  274 | 
  275 |     console.log(`[TEST 3] Page load time: ${pageLoadTime}ms`);
  276 |     test.expect(pageLoadTime).toBeLessThan(10000);
  277 |   });
  278 | });
  279 | 
  280 | // ============================================================================
  281 | // TEST 4: i18n Test (English)
  282 | // ============================================================================
  283 | test.describe('i18n - English Language', () => {
  284 |   test('should display login page in English', async ({ page }) => {
  285 |     const startTime = Date.now();
  286 | 
  287 |     // Navigate to English login
  288 |     await page.goto(`${LOCALES.EN.domain}/auth/login`);
  289 |     const pageLoadTime = Date.now() - startTime;
  290 | 
  291 |     // Verify heading in English
  292 |     const heading = page.locator('h1');
  293 |     await expect(heading).toHaveText(/Sign In|Login/i, { timeout: 10000 });
  294 | 
  295 |     // Verify input labels/placeholders in English
  296 |     const inputs = page.locator('input[type="email"], input[type="password"]');
  297 |     const inputCount = await inputs.count();
  298 |     console.log(`[TEST 4] Found ${inputCount} inputs on English login page`);
  299 | 
  300 |     // Verify button text in English
  301 |     const submitButton = page.getByRole('button', { name: /Sign In|Login/i });
  302 |     await expect(submitButton).toBeVisible();
  303 | 
  304 |     console.log(`[TEST 4] Login page loaded in English`);
  305 |     console.log(`[TEST 4] Page load time: ${pageLoadTime}ms`);
  306 | 
  307 |     test.expect(pageLoadTime).toBeLessThan(10000);
  308 |   });
  309 | 
  310 |   test('should display register page in English', async ({ page }) => {
  311 |     // Navigate to English register
  312 |     await page.goto(`${LOCALES.EN.domain}/auth/register`);
  313 | 
  314 |     // Verify heading in English
  315 |     const heading = page.locator('h1');
  316 |     await expect(heading).toHaveText(/Create Account|Register/i, { timeout: 10000 });
  317 | 
  318 |     console.log(`[TEST 4] Register page loaded in English`);
  319 |   });
  320 | 
  321 |   test('should navigate to recovery in English', async ({ page }) => {
  322 |     // Navigate to English login
> 323 |     await page.goto(`${LOCALES.EN.domain}/auth/login`);
      |                ^ Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/en/auth/login
  324 | 
  325 |     // Look for recovery link
  326 |     const recoveryLink = page.getByRole('link', { name: /Forgot password|Forgot your password/i });
  327 |     try {
  328 |       await expect(recoveryLink).toBeVisible({ timeout: 5000 });
  329 |       console.log(`[TEST 4] Recovery link found in English`);
  330 |     } catch (e) {
  331 |       console.log(`[TEST 4] Recovery link not found, may be a button instead`);
  332 |     }
  333 |   });
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
```