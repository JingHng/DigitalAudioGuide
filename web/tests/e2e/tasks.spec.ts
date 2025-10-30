import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL('/');
  });

  test('should display tasks page', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('Tasks');
    await expect(page.getByRole('textbox', { name: 'New task' })).toBeVisible();
    await expect(page.locator('select[name="assignedToId"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    const taskTitle = `Test Task ${Date.now()}`;
    await page.fill('input[name="title"]', taskTitle);
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator(`text=${taskTitle}`)).toBeVisible();
  });
});
