import { Page } from '@playwright/test';

/**
 * Shared test fixtures and helpers
 */

const API_URL = process.env.API_URL || 'http://localhost:8600';

export interface TestUser {
  email: string;
  password: string;
  fullName?: string;
  token?: string;
  businessId?: string;
}

export interface TestBusiness {
  id: string;
  name: string;
  description?: string;
}

/**
 * Setup a test user with API
 */
export async function setupTestUser(
  page: Page,
  userOverrides?: Partial<TestUser>
): Promise<TestUser> {
  const user: TestUser = {
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
    password: 'TestPassword@123',
    fullName: 'Test User',
    ...userOverrides,
  };

  const response = await page.request.post(`${API_URL}/api/test/setup-user`, {
    data: {
      email: user.email,
      password: user.password,
      fullName: user.fullName,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to setup user: ${response.status()}`);
  }

  const data = await response.json();
  user.token = data.token;
  user.businessId = data.businesses?.[0];

  return user;
}

/**
 * Setup a test user with multiple businesses
 */
export async function setupTestUserWithMultipleBusinesses(
  page: Page,
  userOverrides?: Partial<TestUser>,
  businessCount: number = 2
): Promise<TestUser & { businesses: string[] }> {
  const user = await setupTestUser(page, userOverrides);

  const response = await page.request.post(
    `${API_URL}/api/test/setup-user-with-multiple-businesses`,
    {
      data: {
        email: user.email,
        password: user.password,
      },
      businessCount,
    }
  );

  if (!response.ok()) {
    throw new Error(`Failed to setup businesses: ${response.status()}`);
  }

  const data = await response.json();
  return {
    ...user,
    businesses: data.businesses,
  };
}

/**
 * Login a user via UI
 */
export async function loginUser(page: Page, user: TestUser): Promise<void> {
  await page.goto('/es/auth/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button:has-text("Iniciar sesión")');
  await page.waitForURL(/\/es\/dashboard/);
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-btn"]');
  await page.waitForURL(/\/es\/auth\/login/);
}

/**
 * Get current business ID from localStorage
 */
export async function getCurrentBusinessId(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('businessId'));
}

/**
 * Get current JWT token from localStorage
 */
export async function getCurrentToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => localStorage.getItem('token'));
}

/**
 * Clear all auth data
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('businessId');
    localStorage.removeItem('user');
  });
}

/**
 * Wait for API call and verify status
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  expectedStatus: number = 200,
  timeout: number = 10000
): Promise<any> {
  const response = await page.waitForResponse(
    (resp) => {
      if (typeof urlPattern === 'string') {
        return resp.url().includes(urlPattern) && resp.status() === expectedStatus;
      } else {
        return urlPattern.test(resp.url()) && resp.status() === expectedStatus;
      }
    },
    { timeout }
  );

  return await response.json().catch(() => ({}));
}

/**
 * Fill form by field name
 */
export async function fillForm(
  page: Page,
  fields: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    await page.fill(`input[name="${name}"]`, value);
  }
}

/**
 * Verify element visibility and text content
 */
export async function verifyElementContent(
  page: Page,
  selector: string,
  expectedText: string
): Promise<boolean> {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    const text = await element.textContent();
    return text?.includes(expectedText) || false;
  } catch {
    return false;
  }
}

/**
 * Take screenshot for debugging
 */
export async function takeScreenshot(
  page: Page,
  filename: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `./tests/e2e/screenshots/${filename}-${timestamp}.png`,
  });
}

/**
 * Get console errors during test
 */
export function getConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Measure page load time
 */
export async function measurePageLoadTime(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  return Date.now() - startTime;
}

/**
 * Test data generators
 */
export const testDataGenerators = {
  email: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
  businessName: () => `Test Business ${Date.now()}`,
  customerName: () => `Customer ${Math.random().toString(36).substr(2, 5)}`,
  password: () => 'SecureTest@123456',
};
