import { test, expect } from '@playwright/test';

test('login → create conversation → send message → reload and verify persistence', async ({ page }) => {
  const message = `browser-e2e-persisted-${Date.now()}`;

  await page.goto('/login');
  await page.getByLabel('Usuario o email').fill('owner@otrarondamas.com');
  // The login page renders more than one password-labelled element; use the
  // actual password input to avoid Playwright strict-mode ambiguity.
  await page.locator('input[type="password"]').fill('password123');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.goto('/messaging');
  await expect(page.getByRole('heading', { name: 'Mensajería' })).toBeVisible();

  await page.getByLabel('Nueva conversación').waitFor({ state: 'visible' });
  await page.locator('#messaging-customer').selectOption({ label: 'Cliente E2E Mensajería' });
  await page.getByRole('button', { name: 'Crear conversación' }).click();
  await expect(page.getByText('Conversación creada y guardada.', { exact: true })).toBeVisible();

  const composer = page.getByLabel('Escribir mensaje');
  await expect(composer).toBeVisible();
  await composer.fill(message);
  await page.getByRole('button', { name: 'Enviar' }).click();
  await expect(page.getByText(message, { exact: true })).toBeVisible();

  // Reload forces the UI to fetch conversation and message history from the API;
  // this is the persistence assertion, not an optimistic client-state check.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mensajería' })).toBeVisible();
  await expect(page.getByText(message, { exact: true })).toBeVisible();
});
