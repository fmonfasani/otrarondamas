import { test, expect } from '@playwright/test';

/**
 * T1.1-T1.5: Auth Flow Tests
 *
 * Verifies:
 * - Signup → Create business → Dashboard (happy path)
 * - Login with existing user → Switch business
 * - Forgot password → Reset → Login
 * - Invalid credentials → Error display
 * - Session expiry → Redirect to login
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

// Test data
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test@1234',
  fullName: 'Test User',
};

const existingUser = {
  email: 'existing@example.com',
  password: 'ExistingPassword@123',
};

test.describe('T1: Authentication Flow', () => {
  test('T1.1: Signup → Create business → Dashboard (happy path)', async ({ page }) => {
    // Navigate to signup
    await page.goto('/es/auth/signup');

    // Verify signup page loads
    await expect(page.locator('text=Crear cuenta')).toBeVisible();

    // Fill signup form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    await page.fill('input[name="fullName"]', testUser.fullName);

    // Accept terms
    await page.click('input[type="checkbox"]');

    // Submit signup
    await page.click('button:has-text("Crear cuenta")');

    // Wait for redirect to business creation
    await page.waitForURL(/\/es\/negocios\/crear/);

    // Verify business creation page
    await expect(page.locator('text=Crear negocio')).toBeVisible();

    // Fill business creation form
    await page.fill('input[name="businessName"]', 'Test Business 001');
    await page.fill('input[name="description"]', 'Test business for E2E');
    await page.selectOption('select[name="industry"]', 'retail');

    // Submit business creation
    await page.click('button:has-text("Crear negocio")');

    // Verify redirect to dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Verify dashboard loads with KPIs
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-total-sales"]')).toBeVisible();

    // Verify localStorage has JWT and businessId
    const jwt = await page.evaluate(() => localStorage.getItem('token'));
    const businessId = await page.evaluate(() => localStorage.getItem('businessId'));

    expect(jwt).toBeTruthy();
    expect(businessId).toBeTruthy();
  });

  test('T1.2: Login with existing user → Switch business', async ({ page }) => {
    // Create user and business first (API call)
    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: existingUser,
    });
    const setupData = await setupResponse.json();
    expect(setupResponse.ok()).toBeTruthy();

    const businessId1 = setupData.businesses[0];
    const businessId2 = setupData.businesses[1];

    // Navigate to login
    await page.goto('/es/auth/login');

    // Verify login page
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();

    // Fill login form
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', existingUser.password);

    // Submit login
    await page.click('button:has-text("Iniciar sesión")');

    // Verify redirect to dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Verify dashboard loads
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Verify business selector is visible
    const businessSelector = page.locator('[data-testid="business-selector"]');
    await expect(businessSelector).toBeVisible();

    // Switch to second business
    await businessSelector.click();
    await page.click(`[data-testid="business-option-${businessId2}"]`);

    // Verify data refreshes for new business
    await page.waitForTimeout(1000); // Wait for data refresh

    // Verify businessId in localStorage changed
    const newBusinessId = await page.evaluate(() => localStorage.getItem('businessId'));
    expect(newBusinessId).toBe(businessId2);
  });

  test('T1.3: Forgot password → Reset → Login', async ({ page }) => {
    // Setup user via API
    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: existingUser,
    });
    expect(setupResponse.ok()).toBeTruthy();

    // Navigate to login
    await page.goto('/es/auth/login');

    // Click forgot password
    await page.click('a:has-text("¿Olvidó su contraseña?")');

    // Verify recover page
    await page.waitForURL(/\/es\/auth\/recover/);
    await expect(page.locator('text=Recuperar contraseña')).toBeVisible();

    // Enter email
    await page.fill('input[name="email"]', existingUser.email);
    await page.click('button:has-text("Enviar enlace")');

    // Verify success message
    await expect(page.locator('text=Enlace enviado')).toBeVisible();

    // Get reset token from API (test helper)
    const resetResponse = await page.request.get(
      `${API_URL}/api/test/get-reset-token?email=${existingUser.email}`
    );
    const resetData = await resetResponse.json();
    const resetToken = resetData.token;

    // Navigate to reset page
    await page.goto(`/es/auth/reset?token=${resetToken}`);

    // Verify reset page
    await expect(page.locator('text=Nueva contraseña')).toBeVisible();

    // Fill reset form
    const newPassword = 'NewPassword@456';
    await page.fill('input[name="password"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);

    // Submit reset
    await page.click('button:has-text("Restablecer")');

    // Verify redirect to login
    await page.waitForURL(/\/es\/auth\/login/);

    // Try login with new password
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', newPassword);
    await page.click('button:has-text("Iniciar sesión")');

    // Verify successful login
    await page.waitForURL(/\/es\/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('T1.4: Invalid credentials → Error display', async ({ page }) => {
    // Navigate to login
    await page.goto('/es/auth/login');

    // Try invalid email/password
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit login
    await page.click('button:has-text("Iniciar sesión")');

    // Verify error message displayed
    await expect(page.locator('[role="alert"]')).toContainText('Credenciales inválidas');

    // Verify still on login page
    expect(page.url()).toContain('/auth/login');
  });

  test('T1.5: Session expiry → Redirect to login', async ({ page }) => {
    // Setup user and login
    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: existingUser,
    });
    expect(setupResponse.ok()).toBeTruthy();

    // Login
    await page.goto('/es/auth/login');
    await page.fill('input[name="email"]', existingUser.email);
    await page.fill('input[name="password"]', existingUser.password);
    await page.click('button:has-text("Iniciar sesión")');

    // Wait for dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Clear token to simulate expiry
    await page.evaluate(() => localStorage.removeItem('token'));

    // Navigate to protected page
    await page.goto('/es/dashboard');

    // Verify redirect to login
    await page.waitForURL(/\/es\/auth\/login/);
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();
  });
});
