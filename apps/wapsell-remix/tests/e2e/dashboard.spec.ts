import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/es/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/es/dashboard');
  });

  test('should display dashboard page', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should display KPI cards', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    // Wait for KPI data to load
    await page.waitForSelector('[data-testid="kpi-card"]', { timeout: 5000 });
    const cards = await page.locator('[data-testid="kpi-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should display recent orders', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await expect(page.locator('text=Recent Orders')).toBeVisible();
  });

  test('should display top products', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await expect(page.locator('text=Top Products')).toBeVisible();
  });

  test('should display trends chart', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await expect(page.locator('text=Trends')).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await page.click('a[href*="productos"]');
    await page.waitForURL(/.*productos/);
    await expect(page).toHaveURL(/.*productos/);
  });

  test('should navigate to orders page', async ({ page }) => {
    await page.goto('http://localhost:3000/es/dashboard');
    await page.click('a[href*="pedidos"]');
    await page.waitForURL(/.*pedidos/);
    await expect(page).toHaveURL(/.*pedidos/);
  });
});
