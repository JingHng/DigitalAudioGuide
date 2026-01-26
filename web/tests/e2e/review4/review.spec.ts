import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5175';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const TEST_USER = { username: 'admin', password: 'admin123' };

test.describe('Review Management & Display - Full Coverage', () => {
  let authToken: string | null = null;
  let userId: number | null = null;
  let exhibitId: number | null = null;
  let exhibitionId: number | null = null;
  const createdReviewIds: number[] = [];

  test.beforeAll(async ({ request }) => {
    // Login and get token
    const loginResp = await request.post(`${API_URL}/api/auth/login`, { data: TEST_USER });
    const loginJson = await loginResp.json();
    authToken = loginJson.accessToken ?? loginJson.token ?? loginJson.data?.token ?? null;
    userId = Number(loginJson.user?.userId ?? loginJson.data?.user?.userId ?? null);

    // Get a valid exhibit and exhibition
    const exhibitsResp = await request.get(`${API_URL}/api/exhibits`);
    if (exhibitsResp.ok()) {
      const json = await exhibitsResp.json();
      const list = Array.isArray(json) ? json : json?.data ?? [];
      exhibitId = list[0]?.exhibitId ?? list[0]?.exhibit_id ?? null;
      exhibitionId = list[0]?.exhibitionId ?? list[0]?.exhibition_id ?? null;
    }

    // Create reviews for test exhibit
    if (authToken && exhibitId && userId) {
      for (const { rating, comment } of [
        { rating: 5, comment: 'CI test review - five stars' },
        { rating: 2, comment: 'CI test review - two stars' },
        { rating: 2, comment: '' },
        { rating: 3, comment: 'CI test review - three stars' }
      ]) {
        const resp = await request.post(`${API_URL}/api/reviews`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { user_id: userId, exhibit_id: exhibitId, rating, comment },
        });
        if (resp.ok()) {
          const json = await resp.json();
          const id = json.data?.feedback_id ?? json.feedback_id ?? json.data?.id ?? json.id ?? 0;
          if (id > 0) createdReviewIds.push(id);
        }
      }
    }
  });

  test.afterAll(async ({ request }) => {
    if (!authToken || !createdReviewIds.length) return;
    for (const id of createdReviewIds) {
      if (id <= 0) continue;
      try {
        await request.delete(`${API_URL}/api/reviews/${id}`, {
          headers: { Authorization: `Bearer ${authToken}` },
          data: { user_id: userId },
        });
      } catch {}
    }
  });

  test('blocks unauthenticated access to My Reviews', async ({ page }) => {
    await page.goto(`${FRONTEND}/reviews`);
    await expect(
      page.getByRole('heading', { name: /authentication required/i, level: 2 })
    ).toBeVisible({ timeout: 8000 });
  });

  test('authenticated user sees and filters reviews on /reviews', async ({ page }) => {
    // Authenticate
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }

    await page.goto(`${FRONTEND}/reviews`);
    await expect(page).toHaveURL(/\/reviews$/);
    await expect(page.getByRole('heading', { name: /visitor feedback/i, level: 1 })).toBeVisible();

    // Pagination should be visible
    await expect(page.locator('.pagination-footer')).toBeVisible();

    // Star filter: 2 stars
    await page.getByRole('button', { name: /^2 ★$/ }).click();
    await expect(page.locator('.review-card-item')).toHaveCountGreaterThan(0);
    const stars = await page.locator('.review-card-item .rating-badge').allInnerTexts();
    for (const s of stars) expect(s).toContain('★');

    // Only with comments
    const commentCheckbox = page.getByRole('checkbox').first();
    await commentCheckbox.check();
    const filteredItems = page.locator('.review-card-item');
    if (await filteredItems.count() > 0) {
      for (let i = 0; i < await filteredItems.count(); i++) {
        const item = filteredItems.nth(i);
        await expect(item.locator('.comment-bubble')).toBeVisible();
      }
    }
  });

  test('authenticated user sees and filters reviews on exhibit page', async ({ page }) => {
    // Authenticate
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }

    // Go to exhibit details page
    await page.goto(`${FRONTEND}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);
    await expect(page.getByRole('heading', { name: /visitor thoughts/i, level: 3 })).toBeVisible();

    // Pagination should be visible
    await expect(page.locator('.pagination-footer')).toBeVisible();

    // Star filter: 2 stars
    await page.getByRole('button', { name: /^2 ★$/ }).click();
    await expect(page.locator('.mini-review-centered')).toHaveCountGreaterThan(0);
    const stars = await page.locator('.mini-review-centered .stars').allInnerTexts();
    for (const s of stars) expect(s).toBe('★★');

    // Only with comments
    const commentCheckbox = page.getByRole('checkbox').first();
    await commentCheckbox.check();
    const filteredItems = page.locator('.mini-review-centered');
    if (await filteredItems.count() > 0) {
      for (let i = 0; i < await filteredItems.count(); i++) {
        const item = filteredItems.nth(i);
        await expect(item.locator('p')).toBeVisible();
      }
    }
  });

  test('user can create and see a new review on exhibit page', async ({ page }) => {
    // Authenticate
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }

    await page.goto(`${FRONTEND}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);
    await expect(page.getByRole('heading', { name: /visitor thoughts/i, level: 3 })).toBeVisible();

    // Submit a new review
    await page.getByRole('button', { name: /^5$/ }).click();
    await page.getByPlaceholder('Add a comment...').fill('Playwright CI review');
    await page.getByRole('button', { name: /post/i }).click();

    // Should appear in the review list
    await expect(page.locator('.mini-review-centered')).toContainText('Playwright CI review');
  });
});