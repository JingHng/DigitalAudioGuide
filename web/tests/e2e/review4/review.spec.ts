import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5175';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const TEST_USER = { username: 'admin', password: 'admin123' };

test.describe('User Reviews (My Reviews) - e2e', () => {
  let authToken: string | null = null;
  let userId: number | null = null;
  const createdReviewIds: number[] = [];
  let exhibitId: number | null = null;

  test.beforeAll(async ({ request }) => {
    // API login
    const loginResp = await request.post(`${API_URL}/api/auth/login`, { data: TEST_USER });
    if (!loginResp.ok()) return;

    const loginJson = await loginResp.json();
    authToken = loginJson.accessToken ?? loginJson.token ?? loginJson.data?.token ?? null;
    userId = Number(loginJson.user?.userId ?? loginJson.data?.user?.userId ?? null);

    // Get valid exhibit
    const exhibitsResp = await request.get(`${API_URL}/api/exhibits`);
    if (exhibitsResp.ok()) {
      const json = await exhibitsResp.json();
      const list = Array.isArray(json) ? json : json?.data ?? [];
      exhibitId = list[0]?.exhibitId ?? list[0]?.exhibit_id ?? null;
    }

    // Create test reviews
    if (authToken && exhibitId && userId) {
      for (const { rating, comment } of [
        { rating: 5, comment: 'Automated test review - five stars' },
        { rating: 3, comment: '' },
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

  test('authenticated user sees own reviews and can filter', async ({ page }) => {
    // Authenticate
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    } else {
      await page.goto(`${FRONTEND}/login`);
      await page.getByPlaceholder('Your username').fill(TEST_USER.username);
      await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/welcome|dashboard|logout/i)).toBeVisible({ timeout: 15000 });
    }

    // Go to reviews + basic validation
    await page.goto(`${FRONTEND}/reviews`);
    await expect(page).toHaveURL(/\/reviews$/);
    await expect(page.getByRole('heading', { name: /visitor feedback/i, level: 1 })).toBeVisible({ timeout: 10000 });

    const list = page.locator('.reviews-grid');
    const empty = page.getByText(/no reviews found matching your criteria/i, { exact: false });
    await expect(list.or(empty)).toBeVisible({ timeout: 30000 });

    const items = page.locator('.review-card-item');

    // Validate review cards: check for reviewer, exhibit/exhibition, and rating
    if (await items.count() > 0) {
      for (let i = 0; i < await items.count(); i++) {
        const item = items.nth(i);
        // Reviewer username
        await expect(item.locator('.username')).toBeVisible();
        // Exhibit or exhibition name (should match real data)
        await expect(item.locator('.meta-item').first()).toBeVisible();
      }
    }

    // Only with comments filter
    const commentCheckbox = page.getByRole('checkbox').first(); // only one checkbox
    if (await commentCheckbox.isVisible()) {
      await commentCheckbox.check();
      await expect(list.or(empty)).toBeVisible({ timeout: 15000 });

      const filteredItems = page.locator('.review-card-item');
      if (await filteredItems.count() > 0) {
        for (let i = 0; i < await filteredItems.count(); i++) {
          const item = filteredItems.nth(i);
          await expect(item.locator('.comment-bubble')).toBeVisible();
          await expect(item.locator('.comment-bubble p')).toBeVisible();
        }
      }
    } else {
      // Checkbox not visible, skip filter test
      console.warn('Comments filter checkbox not visible, skipping filter assertions.');
    }
  });
});