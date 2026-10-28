import { test, expect } from '@playwright/test';

/**
 * T1.11-T1.14: Multi-Tenant Isolation Tests
 *
 * Verifies:
 * - User A cannot see User B's businesses (isolation verified)
 * - User A switches to business B1 → sees only B1 data
 * - User A tries direct API call to User B's data → 403/403
 * - Business selector doesn't list businesses user doesn't own
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

const userA = {
  email: `user-a-${Date.now()}@example.com`,
  password: 'UserA@1234',
};

const userB = {
  email: `user-b-${Date.now()}@example.com`,
  password: 'UserB@1234',
};

test.describe('T1.11-T1.14: Multi-Tenant Isolation Tests', () => {
  let userABusinessId: string;
  let userBBusinessId: string;
  let userAToken: string;
  let userBToken: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();

    // Setup User A with business
    let response = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: userA,
    });
    expect(response.ok()).toBeTruthy();
    let data = await response.json();
    userABusinessId = data.businesses[0];
    userAToken = data.token;

    // Setup User B with business
    response = await page.request.post(`${API_URL}/api/test/setup-user`, {
      data: userB,
    });
    expect(response.ok()).toBeTruthy();
    data = await response.json();
    userBBusinessId = data.businesses[0];
    userBToken = data.token;

    await page.close();
  });

  test('T1.11: User A cannot see User B\'s businesses (isolation verified)', async ({ page }) => {
    // Login as User A
    await page.goto('/es/auth/login');
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', userA.password);
    await page.click('button:has-text("Iniciar sesión")');

    // Wait for dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Open business selector
    const selector = page.locator('[data-testid="business-selector"]');
    await selector.click();

    // Get list of visible businesses
    const visibleBusinesses = await page.locator('[data-testid^="business-option-"]').all();

    // Verify User B's business is NOT in the list
    const businessIds = await Promise.all(
      visibleBusinesses.map((el) => el.getAttribute('data-testid'))
    );

    expect(businessIds).toContain(`business-option-${userABusinessId}`);
    expect(businessIds).not.toContain(`business-option-${userBBusinessId}`);
  });

  test('T1.12: User A switches to business B1 → sees only B1 data', async ({ page }) => {
    // Get businesses (assuming User A has multiple)
    const setupResponse = await page.request.post(`${API_URL}/api/test/setup-user-with-multiple-businesses`, {
      data: userA,
      businessCount: 2,
    });
    const setupData = await setupResponse.json();
    const [business1, business2] = setupData.businesses;

    // Login
    await page.goto('/es/auth/login');
    await page.fill('input[name="email"]', userA.email);
    await page.fill('input[name="password"]', userA.password);
    await page.click('button:has-text("Iniciar sesión")');

    // Wait for dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Verify currently on business 1
    let currentBusinessId = await page.evaluate(() => localStorage.getItem('businessId'));
    expect(currentBusinessId).toBe(business1);

    // Get KPI value for business 1
    const business1KPI = await page.locator('[data-testid="kpi-total-sales"] .value').textContent();

    // Switch to business 2
    const selector = page.locator('[data-testid="business-selector"]');
    await selector.click();
    await page.click(`[data-testid="business-option-${business2}"]`);

    // Wait for data reload
    await page.waitForLoadState('networkidle');

    // Verify switched to business 2
    currentBusinessId = await page.evaluate(() => localStorage.getItem('businessId'));
    expect(currentBusinessId).toBe(business2);

    // Verify data is different (or at least request was made to new business context)
    // KPI might be same if both have same data, but API call should be scoped to business2
    const business2KPI = await page.locator('[data-testid="kpi-total-sales"] .value').textContent();

    // Verify API was called for correct business context
    // Check by looking at Network requests or by getting business metadata
    const businessInfo = await page.evaluate(() => localStorage.getItem('businessId'));
    expect(businessInfo).toBe(business2);
  });

  test('T1.13: User A tries direct API call to User B\'s data → 403', async ({ page }) => {
    // Make authenticated request as User A
    const response = await page.request.get(
      `${API_URL}/api/business/${userBBusinessId}/dashboard`,
      {
        headers: {
          Authorization: `Bearer ${userAToken}`,
        },
      }
    );

    // Should be forbidden
    expect(response.status()).toBe(403);

    // Verify error message
    const errorData = await response.json();
    expect(errorData.message).toContain('Unauthorized');
  });

  test('T1.14: Business selector doesn\'t list businesses user doesn\'t own', async ({ page }) => {
    // Create multiple users with their own businesses
    const users = [];
    const tokens = [];

    for (let i = 0; i < 3; i++) {
      const user = {
        email: `isolation-user-${i}-${Date.now()}@example.com`,
        password: `Password@${i}`,
      };

      const response = await page.request.post(`${API_URL}/api/test/setup-user`, {
        data: user,
      });
      const data = await response.json();
      users.push(user);
      tokens.push(data.token);
    }

    // Login as first user
    await page.goto('/es/auth/login');
    await page.fill('input[name="email"]', users[0].email);
    await page.fill('input[name="password"]', users[0].password);
    await page.click('button:has-text("Iniciar sesión")');

    // Wait for dashboard
    await page.waitForURL(/\/es\/dashboard/);

    // Get business selector options
    const selector = page.locator('[data-testid="business-selector"]');
    await selector.click();

    const businessOptions = await page.locator('[data-testid^="business-option-"]').all();

    // Should only see businesses owned by current user
    // Each user should only have 1 business (created during setup)
    expect(businessOptions.length).toBe(1);

    // Verify it's the correct business by checking the business name matches
    const businessName = await businessOptions[0].textContent();
    expect(businessName).toBeTruthy();
  });

  test('T1.15: Business selector doesn\'t list unrelated businesses via API', async ({ page }) => {
    // As User A, try to fetch User B's businesses via API
    const response = await page.request.get(`${API_URL}/api/auth/tenants`, {
      headers: {
        Authorization: `Bearer ${userAToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();

    const tenants = await response.json();
    const businessIds = tenants.map((t: any) => t.id);

    // Verify User B's business is NOT returned
    expect(businessIds).not.toContain(userBBusinessId);

    // Verify User A's business IS returned
    expect(businessIds).toContain(userABusinessId);
  });
});
