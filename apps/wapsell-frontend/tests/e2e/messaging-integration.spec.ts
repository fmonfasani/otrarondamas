import { test, expect } from '@playwright/test';

/**
 * T1.15-T1.16: Messaging Integration Tests (Optional)
 *
 * Verifies:
 * - Create order → notification appears (Kafka event)
 * - Broadcast to correct businessId only (isolation)
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

const testUser = {
  email: `messaging-${Date.now()}@example.com`,
  password: 'Test@1234',
};

test.describe('T1.15-T1.16: Messaging Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup user and login
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

  test('T1.15: Create order → notification appears (Kafka event)', async ({ page }) => {
    // Setup listener for notifications
    const notifications: any[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'log' && msg.text().includes('notification')) {
        notifications.push(msg.text());
      }
    });

    // Navigate to orders
    await page.click('[data-testid="nav-orders"]');
    await page.waitForURL(/\/es\/pedidos|\/es\/orders/);

    // Click create order button
    await page.click('[data-testid="btn-create-order"]');

    // Verify order creation form
    await expect(page.locator('[data-testid="order-form"]')).toBeVisible();

    // Fill order form with test data
    await page.fill('input[name="customerName"]', 'Test Customer');
    await page.fill('input[name="customerEmail"]', 'customer@example.com');
    await page.click('[data-testid="product-selector"]');

    // Select first available product
    const products = await page.locator('[data-testid^="product-option-"]').all();
    if (products.length > 0) {
      await products[0].click();
    }

    // Set quantity
    await page.fill('input[name="quantity"]', '1');

    // Submit order
    await page.click('[data-testid="btn-submit-order"]');

    // Wait for order creation response
    await page.waitForResponse((response) =>
      response.url().includes('/api/orders') && response.status() === 201
    );

    // Verify success message
    await expect(page.locator('[role="alert"]')).toContainText('Pedido creado');

    // Wait for notification to appear (Kafka event processed)
    await page.waitForTimeout(2000);

    // Verify notification is visible
    const notification = page.locator('[data-testid="notification-toast"]');
    await expect(notification).toBeVisible();
    await expect(notification).toContainText('Nuevo pedido');
  });

  test('T1.16: Broadcast to correct businessId only (isolation)', async ({ page }) => {
    // Setup second user with different business
    const user2 = {
      email: `messaging-user2-${Date.now()}@example.com`,
      password: 'Test@1234',
    };

    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: user2,
    });
    expect(setupResponse.ok()).toBeTruthy();

    // Open second browser context
    const context2 = await page.context().browser()?.newContext();
    const page2 = await context2?.newPage();

    if (page2) {
      // Login as second user
      await page2.goto('/es/auth/login');
      await page2.fill('input[name="email"]', user2.email);
      await page2.fill('input[name="password"]', user2.password);
      await page2.click('button:has-text("Iniciar sesión")');

      await page2.waitForURL(/\/es\/dashboard/);

      // Track notifications for user 2
      const notifications2: any[] = [];
      page2.on('console', (msg) => {
        if (msg.type() === 'log' && msg.text().includes('notification')) {
          notifications2.push(msg.text());
        }
      });

      // Get business IDs
      const businessId1 = await page.evaluate(() => localStorage.getItem('businessId'));
      const businessId2 = await page2.evaluate(() => localStorage.getItem('businessId'));

      expect(businessId1).not.toBe(businessId2);

      // Create order in business 1
      await page.click('[data-testid="nav-orders"]');
      await page.click('[data-testid="btn-create-order"]');

      // Fill and submit order
      await page.fill('input[name="customerName"]', 'Test Customer');
      await page.fill('input[name="customerEmail"]', 'customer@example.com');

      // Get product and select
      const products = await page.locator('[data-testid^="product-option-"]').all();
      if (products.length > 0) {
        await products[0].click();
      }

      await page.fill('input[name="quantity"]', '1');
      await page.click('[data-testid="btn-submit-order"]');

      // Wait for order to be created
      await page.waitForResponse((response) =>
        response.url().includes('/api/orders') && response.status() === 201
      );

      // Wait for notification
      await page.waitForTimeout(2000);

      // Verify notification appears in business 1
      const notification1 = page.locator('[data-testid="notification-toast"]');
      await expect(notification1).toBeVisible();

      // Verify notification does NOT appear in business 2
      // (or if there's a generic broadcast, it should be filtered by businessId)
      await page2.waitForTimeout(1000);

      // Check if notification appears in page2
      const notification2 = page2.locator('[data-testid="notification-toast"]:has-text("Nuevo pedido")');

      // Should NOT have notification (or should have different content)
      // depending on implementation - verify business isolation
      const hasNotification = await notification2.isVisible().catch(() => false);

      // If notifications are shared across all users, verify they're filtered by businessId
      if (hasNotification) {
        // Verify the notification is for business 2's order, not business 1's
        const notificationText = await notification2.textContent();
        expect(notificationText).not.toContain('Test Customer'); // From business 1
      }

      await context2?.close();
    }
  });
});
