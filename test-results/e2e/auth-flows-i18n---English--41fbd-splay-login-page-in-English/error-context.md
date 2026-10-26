# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.js >> i18n - English Language >> should display login page in English
- Location: tests\e2e\auth-flows.spec.js:284:7

# Error details

```
Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/en/auth/login
Call log:
  - navigating to "https://www.wapsell.com/en/auth/login", waiting until "load"

```

# Test source

```ts
  188 |     let step1Response = null;
  189 |     page.on('response', (response) => {
  190 |       if (response.url().includes('/auth/recover') || response.url().includes('/auth/forgot')) {
  191 |         step1Response = {
  192 |           status: response.status(),
  193 |           url: response.url(),
  194 |           timestamp: Date.now(),
  195 |         };
  196 |       }
  197 |     });
  198 | 
  199 |     // Click "Send Code" button
  200 |     await page.getByRole('button', { name: /Enviar código|Send Code/i }).click();
  201 |     await page.waitForTimeout(2000);
  202 | 
  203 |     console.log(`[TEST 3] Step 1 API Response:`, step1Response);
  204 | 
  205 |     // Step 3: Verify code input appears
  206 |     console.log(`[TEST 3] Step 2: Verify code input`);
  207 |     const codeInput = page.locator('input[placeholder*="código" i], input[placeholder*="code" i], input[placeholder*="123456" i]');
  208 | 
  209 |     try {
  210 |       await expect(codeInput).toBeVisible({ timeout: 5000 });
  211 |       console.log(`[TEST 3] Code input field is visible`);
  212 | 
  213 |       // Enter mock code
  214 |       await codeInput.fill('123456');
  215 | 
  216 |       let step2Response = null;
  217 |       page.on('response', (response) => {
  218 |         if (response.url().includes('/verify') || response.url().includes('/code')) {
  219 |           step2Response = {
  220 |             status: response.status(),
  221 |             url: response.url(),
  222 |             timestamp: Date.now(),
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
> 288 |     await page.goto(`${LOCALES.EN.domain}/auth/login`);
      |                ^ Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/en/auth/login
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
  323 |     await page.goto(`${LOCALES.EN.domain}/auth/login`);
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
```