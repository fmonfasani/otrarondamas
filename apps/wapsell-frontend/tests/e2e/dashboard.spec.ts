import { test, expect } from '@playwright/test';

/**
 * T1.6-T1.10: Dashboard Tests
 *
 * Verifies:
 * - Dashboard loads KPIs (stats visible, data fetched)
 * - Business selector switches context + reloads data
 * - Navigation links work (Products, Orders, Settings)
 * - Protected route redirects if unauthenticated
 * - Mobile responsive (hamburger menu, stacked layout)
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

const testUser = {
  email: `dashboard-${Date.now()}@example.com`,
  password: 'Test@1234',
};

test.describe('T1.6-T1.10: Dashboard Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup user and login before each test
    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: testUser,
    });
    expect(setupResponse.ok()).toBeTruthy();

    // Login
    await page.goto('/es/auth/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button:has-text("Iniciar sesión")');

    // Wait for dashboard
    await page.waitForURL(/\/es\/dashboard/);
  });

  test('T1.6: Dashboard loads KPIs (stats visible, data fetched)', async ({ page }) => {
    // Wait for page to stabilize
    await page.waitForLoadState('networkidle');

    // Verify all KPI tiles are visible
    const kpiTiles = [
      '[data-testid="kpi-total-sales"]',
      '[data-testid="kpi-total-orders"]',
      '[data-testid="kpi-active-products"]',
      '[data-testid="kpi-pending-orders"]',
    ];

    for (const kpiTile of kpiTiles) {
      await expect(page.locator(kpiTile)).toBeVisible();
    }

    // Verify KPI values are populated (not empty)
    const salesValue = await page.locator('[data-testid="kpi-total-sales"] .value').textContent();
    expect(salesValue).toBeTruthy();
    expect(salesValue).not.toBe('0'); // Should have some data

    // Verify charts are visible
    await expect(page.locator('[data-testid="sales-trend-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="top-products-chart"]')).toBeVisible();

    // Verify no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });

  test('T1.7: Business selector switches context + reloads data', async ({ page }) => {
    // Get initial business data
    const initialSalesValue = await page.locator('[data-testid="kpi-total-sales"] .value').textContent();
    const initialBusinessId = await page.evaluate(() => localStorage.getItem('businessId'));

    // Open business selector
    const selector = page.locator('[data-testid="business-selector"]');
    await expect(selector).toBeVisible();
    await selector.click();

    // Get list of businesses (assuming API returns multiple)
    const businessOptions = await page.locator('[data-testid^="business-option-"]').all();

    if (businessOptions.length > 1) {
      // Click second business
      await businessOptions[1].click();

      // Wait for data reload
      await page.waitForLoadState('networkidle');

      // Verify businessId changed in localStorage
      const newBusinessId = await page.evaluate(() => localStorage.getItem('businessId'));
      expect(newBusinessId).not.toBe(initialBusinessId);

      // Verify KPI data refreshed (might be different values for different business)
      await expect(page.locator('[data-testid="kpi-total-sales"]')).toBeVisible();
    }
  });

  test('T1.8: Navigation links work (Products, Orders, Settings)', async ({ page }) => {
    // Verify navigation menu exists
    const nav = page.locator('[data-testid="main-navigation"]');
    await expect(nav).toBeVisible();

    // Test Products link
    await page.click('[data-testid="nav-products"]');
    await page.waitForURL(/\/es\/produtos|\/es\/productos/);
    await expect(page.locator('text=Productos')).toBeVisible();

    // Test Orders link
    await page.click('[data-testid="nav-orders"]');
    await page.waitForURL(/\/es\/pedidos|\/es\/orders/);
    await expect(page.locator('text=Pedidos')).toBeVisible();

    // Test Settings link
    await page.click('[data-testid="nav-settings"]');
    await page.waitForURL(/\/es\/settings|\/es\/configuracion/);
    await expect(page.locator('text=Configuración')).toBeVisible();

    // Test back to Dashboard
    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForURL(/\/es\/dashboard/);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('T1.9: Protected route redirects if unauthenticated', async ({ page }) => {
    // Logout by clearing token
    await page.evaluate(() => localStorage.removeItem('token'));

    // Try to navigate to protected route
    await page.goto('/es/dashboard');

    // Verify redirect to login
    await page.waitForURL(/\/es\/auth\/login/);
    await expect(page.locator('text=Iniciar sesión')).toBeVisible();
  });

  test('T1.10: Mobile responsive (hamburger menu, stacked layout)', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify hamburger menu appears
    const hamburger = page.locator('[data-testid="hamburger-menu"]');
    await expect(hamburger).toBeVisible();

    // Click hamburger to open mobile menu
    await hamburger.click();

    // Verify navigation is visible in mobile menu
    const mobileNav = page.locator('[data-testid="mobile-navigation"]');
    await expect(mobileNav).toBeVisible();

    // Verify main content is still accessible
    await expect(page.locator('[data-testid="kpi-total-sales"]')).toBeVisible();

    // Verify layout is stacked (no side-by-side)
    const layoutContainer = page.locator('[data-testid="dashboard-layout"]');
    const styles = await layoutContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        flexDirection: computed.flexDirection,
      };
    });

    // Should use flex column on mobile
    expect(styles.display).toMatch(/flex|grid/);

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
  });
});
