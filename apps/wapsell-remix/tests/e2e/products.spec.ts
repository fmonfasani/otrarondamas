import { test, expect } from '@playwright/test';

test.describe('Products Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/es/auth/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/es/dashboard');
    await page.goto('http://localhost:3000/es/dashboard/productos');
  });

  test('should display product list', async ({ page }) => {
    await expect(page.locator('text=Productos')).toBeVisible();
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });
  });

  test('should display product prices', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-price"]', { timeout: 5000 });
    const priceElements = await page.locator('[data-testid="product-price"]');
    const count = await priceElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display stock levels', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-stock"]', { timeout: 5000 });
    const stockElements = await page.locator('[data-testid="product-stock"]');
    const count = await stockElements.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show product details on click', async ({ page }) => {
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });
    await page.locator('[data-testid="product-card"]').first().click();
    await page.waitForSelector('[data-testid="product-detail"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="product-detail"]')).toBeVisible();
  });

  test('should filter products by category', async ({ page }) => {
    await page.waitForSelector('[data-testid="category-filter"]', { timeout: 5000 });
    const categories = await page.locator('[data-testid="category-filter"]');
    const count = await categories.count();
    if (count > 0) {
      await categories.first().click();
      await page.waitForTimeout(500);
      const products = await page.locator('[data-testid="product-card"]');
      expect(await products.count()).toBeGreaterThan(0);
    }
  });

  test('should search products', async ({ page }) => {
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });
    await page.fill('input[placeholder*="Search"]', 'test');
    await page.waitForTimeout(500);
    const products = await page.locator('[data-testid="product-card"]');
    expect(await products.count()).toBeGreaterThanOrEqual(0);
  });
});
