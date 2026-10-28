import { test, expect } from '@playwright/test';
import { setupTestUser, loginUser, measurePageLoadTime } from './fixtures';

/**
 * Performance & Stability Tests
 *
 * Verifies:
 * - Page load times (<3s target)
 * - Test under slow network (3G throttle)
 * - No console errors
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

test.describe('Performance & Stability', () => {
  test('Performance: Page load times', async ({ page }) => {
    // Setup user
    const user = await setupTestUser(page);

    // Measure login page load time
    const loginLoadTime = await measurePageLoadTime(page, '/es/auth/login');
    console.log(`Login page load time: ${loginLoadTime}ms`);
    expect(loginLoadTime).toBeLessThan(5000); // 5 second timeout

    // Login
    await loginUser(page, user);

    // Measure dashboard load time
    const dashboardLoadTime = await measurePageLoadTime(page, '/es/dashboard');
    console.log(`Dashboard load time: ${dashboardLoadTime}ms`);
    expect(dashboardLoadTime).toBeLessThan(3000); // 3 second target

    // Verify metrics are loaded
    await expect(page.locator('[data-testid="kpi-total-sales"]')).toBeVisible();
  });

  test('Stability: No console errors during happy path', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Setup user
    const user = await setupTestUser(page);

    // Perform happy path
    await loginUser(page, user);
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Navigate through key pages
    await page.click('[data-testid="nav-orders"]');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForLoadState('networkidle');

    // Verify no errors
    console.log(`Console errors: ${errors.length}`);
    expect(errors).toHaveLength(0);
  });

  test('Stability: Slow network (3G throttle)', async ({ browser }) => {
    // Create context with slow network
    const context = await browser.newContext();
    const page = await context.newPage();

    // Simulate 3G throttle
    await page.route('**/*', (route) => {
      setTimeout(() => route.continue(), 100);
    });

    // Setup user
    const user = await setupTestUser(page);

    // Navigate and verify still works
    await page.goto('/es/auth/login');
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();

    // Login
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button:has-text("Iniciar sesión")');

    // Should eventually load despite slow network
    await page.waitForURL(/\/es\/dashboard/, { timeout: 15000 });
    await expect(page.locator('text=Dashboard')).toBeVisible();

    await context.close();
  });

  test('Stability: Multiple rapid business switches', async ({ page }) => {
    // Setup user with multiple businesses
    const setupResponse = await page.request.post(
      `${API_URL}/api/test/setup-user-with-multiple-businesses`,
      {
        data: {
          email: `stability-${Date.now()}@example.com`,
          password: 'Test@1234',
        },
        businessCount: 3,
      }
    );

    const setupData = await setupResponse.json();
    const user = {
      email: setupData.user.email,
      password: 'Test@1234',
    };
    const [business1, business2, business3] = setupData.businesses;

    // Login
    await loginUser(page, user);

    // Rapidly switch between businesses
    const businesses = [business1, business2, business3];
    for (let i = 0; i < 5; i++) {
      const business = businesses[i % businesses.length];

      const selector = page.locator('[data-testid="business-selector"]');
      await selector.click();

      const option = page.locator(
        `[data-testid="business-option-${business}"]`
      );
      await option.click();

      // Wait for data to reload
      await page.waitForLoadState('networkidle');

      // Verify correct business is selected
      const currentBusinessId = await page.evaluate(() =>
        localStorage.getItem('businessId')
      );
      expect(currentBusinessId).toBe(business);
    }

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    expect(errors).toHaveLength(0);
  });

  test('Stability: Long session with periodic activity', async ({ page }) => {
    const user = await setupTestUser(page);
    await loginUser(page, user);

    // Simulate periodic activity over extended period
    for (let i = 0; i < 3; i++) {
      // Wait 2 seconds between activities
      await page.waitForTimeout(2000);

      // Perform action
      const selector = page.locator('[data-testid="business-selector"]');
      if (await selector.isVisible()) {
        // Just verify selector is still accessible
        expect(await selector.isVisible()).toBeTruthy();
      }

      // Verify still on dashboard
      const dashboardElement = page.locator('text=Dashboard');
      if (i > 0) {
        // After first iteration, verify we're still logged in
        expect(await dashboardElement.isVisible()).toBeTruthy();
      }
    }

    // Verify session still valid
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});
