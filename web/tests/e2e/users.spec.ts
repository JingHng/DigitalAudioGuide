import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL('/');
    
    // Navigate to users page
    await page.locator('a[href="/admin/users"]').click();
    await expect(page).toHaveURL('/admin/users');
  });

  test('should display users page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Users');
  });




});
