import { test, expect } from '@playwright/test';

test('login → create conversation → send message → reload and verify persistence', async ({ page }) => {
  const message = `browser-e2e-persisted-${Date.now()}`;

  await page.goto('/login');
  await page.getByLabel('Usuario o email').fill('owner@otrarondamas.com');
  await page.getByLabel('Contraseña').fill('password123');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/$/);
  await page.goto('/messaging');
  await expect(page.getByRole('heading', { name: 'Mensajería' })).toBeVisible();

  await page.getByLabel('Nueva conversación').waitFor({ state: 'visible' });
  await expect(page.locator('#messaging-customer option')).not.toHaveCount(0);
  await page.getByRole('button', { name: 'Crear conversación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Conversación creada y guardada.' })).toBeVisible();

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
  await expect(page.locator('#messaging-draft')).toBeVisible();
});
