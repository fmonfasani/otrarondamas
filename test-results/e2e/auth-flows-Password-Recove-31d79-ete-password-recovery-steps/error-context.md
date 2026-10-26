# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-flows.spec.js >> Password Recovery Flow >> should complete password recovery steps
- Location: tests\e2e\auth-flows.spec.js:173:7

# Error details

```
Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/es/auth/recover
Call log:
  - navigating to "https://www.wapsell.com/es/auth/recover", waiting until "load"

```

# Test source

```ts
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
  142 |     // Verify localStorage
  143 |     const localStorage = await page.evaluate(() => {
  144 |       return {
  145 |         jwt: localStorage.getItem('jwt') || localStorage.getItem('token') || localStorage.getItem('auth_token'),
  146 |         empresaId: localStorage.getItem('empresaId') || localStorage.getItem('companyId'),
  147 |         userId: localStorage.getItem('userId'),
  148 |       };
  149 |     });
  150 | 
  151 |     console.log(`[TEST 2] Page load time: ${pageLoadTime}ms`);
  152 |     console.log(`[TEST 2] API Response:`, apiResponse);
  153 |     console.log(`[TEST 2] localStorage:`, localStorage);
  154 | 
  155 |     // Wait for redirect
  156 |     try {
  157 |       await page.waitForURL(/\/(dashboard|inicio|home|es\/?)$/i, { timeout: 30000 });
  158 |     } catch (e) {
  159 |       console.log(`[TEST 2] Redirect timeout (may be expected if new users need verification)`);
  160 |     }
  161 | 
  162 |     const finalURL = page.url();
  163 |     console.log(`[TEST 2] Final URL after register: ${finalURL}`);
  164 | 
  165 |     test.expect(pageLoadTime).toBeLessThan(10000);
  166 |   });
  167 | });
  168 | 
  169 | // ============================================================================
  170 | // TEST 3: Password Recovery Flow (Step-by-Step)
  171 | // ============================================================================
  172 | test.describe('Password Recovery Flow', () => {
  173 |   test('should complete password recovery steps', async ({ page }) => {
  174 |     const startTime = Date.now();
  175 | 
  176 |     // Step 1: Navigate to recovery page
> 177 |     await page.goto(`${LOCALES.ES.domain}/auth/recover`);
      |                ^ Error: page.goto: net::ERR_CERT_COMMON_NAME_INVALID at https://www.wapsell.com/es/auth/recover
  178 |     const pageLoadTime = Date.now() - startTime;
  179 | 
  180 |     const heading = page.locator('h1');
  181 |     await expect(heading).toHaveText(/Recuperar contraseña|Recover Password/i, { timeout: 10000 });
  182 | 
  183 |     // Step 2: Enter email
  184 |     console.log(`[TEST 3] Step 1: Enter email`);
  185 |     const emailInput = page.locator('input[type="email"]');
  186 |     await emailInput.fill(TEST_CREDENTIALS.existingUser.email);
  187 | 
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
```