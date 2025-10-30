import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Vite \+ React/);
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should successfully login with admin@example.com', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/');
  });
});
