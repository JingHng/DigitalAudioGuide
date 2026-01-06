import { test, expect } from '@playwright/test';

// Test account
const TEST_USER = { username: 'admin', password: 'admin123' };

const EXHIBIT_ID = '1'; // Change to a valid exhibit ID in your seed data
const EXHIBITION_ID = '1'; // Change to a valid exhibition ID in your seed data

// Helper: login
async function login(page) {
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', TEST_USER.username);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/exhibitions/);
}

test.describe('Review System E2E', () => {
  test('Submit and verify review', async ({ page }) => {
    await login(page);
    await page.goto(`http://localhost:5173/exhibit/${EXHIBIT_ID}`);
    // Submit a review
    await page.click('text=Show Reviews');
    await page.click('button:has-text("5★")');
    await page.fill('textarea#review-description', 'Playwright E2E review');
    await page.click('button:has-text("Submit Review")');
    await expect(page.locator('text=Review submitted!')).toBeVisible();
    // Check review appears in list
    await expect(page.locator('text=Playwright E2E review')).toBeVisible();
    await expect(page.locator('text=5 / 5')).toBeVisible();
  });

  test('Review appears in user reviews page', async ({ page }) => {
    await login(page);
    await page.goto('http://localhost:5173/reviews');
    await expect(page.locator('text=Playwright E2E review')).toBeVisible();
    await expect(page.locator('text=5 / 5')).toBeVisible();
  });

  test('Review analytics endpoint returns correct average', async ({ request }) => {
    const res = await request.get(`/api/reviews/exhibit/${EXHIBIT_ID}/rating`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.average_rating).toBeGreaterThanOrEqual(5);
  });
});
