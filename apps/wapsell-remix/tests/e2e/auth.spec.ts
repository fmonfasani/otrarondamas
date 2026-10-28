import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/es/auth/login');
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/es/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    await page.goto('http://localhost:3000/es/auth/signup');
    await page.fill('input[name="name"]', 'New User');
    await page.fill('input[name="email"]', `newuser${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'password123');
    await page.fill('input[name="confirmPassword"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/es/auth/login');
  });

  test('should navigate to recover password', async ({ page }) => {
    await page.click('a:has-text("Forgot password")');
    await expect(page).toHaveURL(/.*recover/);
    await expect(page.locator('text=Recover')).toBeVisible();
  });

  test('should persist user session', async ({ page, context }) => {
    // Login
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/es/dashboard');

    // Create new page with same context
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:3000/es/dashboard');
    await expect(newPage.locator('text=Dashboard')).toBeVisible();
  });
});
