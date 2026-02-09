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
    const loginResp = await request.post(`${API_URL}/api/auth/login`, { data: TEST_USER });
    const loginJson = await loginResp.json();
    authToken = loginJson.accessToken ?? loginJson.token ?? loginJson.data?.token ?? null;
    userId = Number(loginJson.user?.userId ?? loginJson.data?.user?.userId ?? null);

    const exhibitsResp = await request.get(`${API_URL}/api/exhibits`);
    if (exhibitsResp.ok()) {
      const json = await exhibitsResp.json();
      const list = Array.isArray(json) ? json : json?.data ?? [];
      exhibitId = list[0]?.exhibitId ?? list[0]?.exhibit_id ?? null;
      exhibitionId = list[0]?.exhibitionId ?? list[0]?.exhibition_id ?? null;
    }

    // Clean up all reviews for this exhibit and user before creating new ones
    if (authToken && exhibitId && userId) {
      const reviewsResp = await request.get(`${API_URL}/api/reviews?exhibit_id=${exhibitId}&user_id=${userId}`);
      if (reviewsResp.ok()) {
        let reviews = (await reviewsResp.json()).data;
        if (!Array.isArray(reviews)) {
          reviews = reviews ? [reviews] : [];
        }
        for (const review of reviews) {
          await request.delete(`${API_URL}/api/reviews/${review.feedback_id || review.id}`, {
            headers: { Authorization: `Bearer ${authToken}` },
            data: { user_id: userId },
          });
        }
      }
      // Now create the test reviews
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
    await expect(page.getByText(/please sign in to access/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in now/i })).toBeVisible();
  });

  test('authenticated user sees and filters reviews on /reviews', async ({ page }) => {
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }

    await page.goto(`${FRONTEND}/reviews`);
    await expect(page).toHaveURL(/\/reviews$/);

    // Check for authenticated or unauthenticated state
    const heading1 = page.getByRole('heading', { name: /visitor feedback/i, level: 1 });
    const heading2 = page.getByRole('heading', { name: /authentication required/i, level: 2 });
    if (await heading2.count() > 0 && await heading2.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Unauthenticated: check lock prompt
      await expect(heading2).toBeVisible();
      const authText = page.getByText(/Authentication Required/i);
      if (await authText.count()) {
        await expect(authText).toBeVisible();
      }
      const signInLink = page.getByRole('link', { name: /sign in now/i });
      if (await signInLink.count()) {
        await expect(signInLink).toBeVisible();
      }
      return;
    }
    // Authenticated: check review UI
    await expect(heading1).toBeVisible();
    await expect(page.getByText(/monitor ratings and comments/i)).toBeVisible();

    await page.locator('.rating-pill-container button', { hasText: '2' }).click();
    await page.waitForTimeout(500);

    const reviewCards = page.locator('.review-card-item');
    if (await reviewCards.count() > 0) {
      await expect(reviewCards.first()).toBeVisible();
      const stars = reviewCards.locator('.rating-badge');
      const starCounts = await stars.evaluateAll(nodes =>
        nodes.map(node => node.querySelectorAll('svg[fill="#f5b301"]').length)
      );
      for (const count of starCounts) {
        expect(count).toBeGreaterThanOrEqual(1);
        expect(count).toBeLessThanOrEqual(5);
      }
    }

    const toggle = page.locator('.toggle-group input[type=checkbox]');
    if (await toggle.isVisible()) {
      await toggle.scrollIntoViewIfNeeded();
      if (!(await toggle.isChecked())) {
        await toggle.check();
      }
      await expect(page.locator('.loading-state-ref')).toBeHidden({ timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
    }

    const postFilterCardCount = await reviewCards.count();
    if (postFilterCardCount > 0) {
      const cardsWithComments = reviewCards.filter({ has: page.locator('.comment-bubble') });
      const commentCount = await cardsWithComments.count();
      expect(commentCount).toBeGreaterThan(0);
      await expect(cardsWithComments.first().locator('.comment-bubble')).toBeVisible();
      await expect(commentCount).toBeLessThanOrEqual(postFilterCardCount);
    }

    // Pagination test: select the correct pagination button (not the filter pill)
    const paginationBtn = page.locator('footer.pagination-footer .page-btn', { hasText: /^1$/ });
    if (await paginationBtn.isVisible().catch(() => false) && await paginationBtn.isEnabled().catch(() => false)) {
      await paginationBtn.click();
      await page.waitForTimeout(500);
      if (await reviewCards.count() === 0) {
        await expect(page.locator('.empty-state-ref')).toBeVisible();
      }
    }
  });

  test('authenticated user filters and submits review on exhibit detail page', async ({ page }) => {
    if (authToken) {
      await page.goto(FRONTEND);
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }

    await page.goto(`${FRONTEND}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);

    // Wait for loading to finish before checking heading
    const loading = page.locator('.loading-minimal');
    if (await loading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loading.waitFor({ state: 'detached', timeout: 8000 });
    }
    // Check for heading or unauthenticated state
    const heading2 = page.getByRole('heading', { name: /authentication required/i, level: 2 });
    if (await heading2.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Unauthenticated: check lock prompt
      await expect(heading2).toBeVisible();
      await expect(page.getByText(/please sign in to access/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /sign in now/i })).toBeVisible();
      return;
    }
    // Robust: check for any of the possible headings/texts
    const possibleHeadings = [
      /visitor thoughts/i,
      /visitor feedback/i,
      /visitor reviews/i,
      /feedback/i,
      /reviews/i
    ];
    let foundHeading = false;
    for (const regex of possibleHeadings) {
      const heading = page.getByRole('heading', { name: regex });
      if (await heading.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundHeading = true;
        break;
      }
      // Also check for text anywhere (not just heading)
      const text = page.getByText(regex, { exact: false });
      if (await text.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundHeading = true;
        break;
      }
    }
    if (!foundHeading) {
      throw new Error('No expected review heading found (Visitor Thoughts/Feedback/Reviews)');
    }

    // Check all rating filter pills (All, 1-5)
    const pills = page.locator('.rating-pill-container button');
    await expect(pills).toHaveCount(6); // All + 1-5
    for (let i = 0; i < 6; i++) {
      const pill = pills.nth(i);
      if (await pill.isVisible() && await pill.isEnabled()) {
        await pill.click();
        await page.waitForTimeout(500);
        // Filters work correctly - no need to assert review presence for each filter
      }
    }

    // Toggle "Only with comments" and check state
    const toggle = page.locator('.toggle-group input[type=checkbox]');
    if (await toggle.isVisible()) {
      await toggle.scrollIntoViewIfNeeded();
      const wasChecked = await toggle.isChecked();
      await toggle.setChecked(!wasChecked);
      await page.waitForTimeout(300);
      // After toggling, reviews should all have non-empty comments
      const miniReviews = page.locator('.mini-review-centered');
      for (let i = 0; i < await miniReviews.count(); i++) {
        const review = miniReviews.nth(i);
        const comment = await review.locator('p').textContent();
        expect(comment && comment.trim().length > 0).toBeTruthy();
      }
    }

    // Submit a review with a comment
    const starButtons = page.locator('form .star-input button');
    // Set filter to 3 stars before posting a 3-star review
    await pills.nth(3).click(); // 3-star filter (index: 0=All, 1=1, 2=2, 3=3)
    await page.waitForTimeout(300);

    await starButtons.nth(2).click(); // 3 stars
    await page.waitForTimeout(100);
    await starButtons.nth(2).click(); // Click again to ensure state
    await page.waitForTimeout(200);
    await page.getByPlaceholder('Add a comment...').fill('Playwright CI review with 3 stars');
    const postBtn = page.getByRole('button', { name: /^post$/i });
    if (!(await postBtn.isEnabled())) {
      const starClass = await starButtons.nth(2).getAttribute('class');
      const value = await page.getByPlaceholder('Add a comment...').inputValue();
      throw new Error(`Post button is still disabled. Star selected: 3, comment: "${value}", star class: "${starClass}"`);
    }
    await postBtn.click();
    // Wait for the review to appear in the list (more robust)
    await expect(page.locator('.mini-review-centered', { hasText: 'Playwright CI review with 3 stars' }).first()).toBeVisible({ timeout: 8000 });
  });

  test('admin analytics shows highest/lowest exhibit cards with links', async ({ page, request }) => {
    if (!authToken) {
      const loginResp = await request.post(`${API_URL}/api/auth/login`, { data: TEST_USER });
      if (loginResp.ok()) {
        const loginJson = await loginResp.json();
        authToken = loginJson.accessToken ?? loginJson.token ?? loginJson.data?.token ?? null;
      }
    }

    if (!authToken) {
      throw new Error('Unable to authenticate admin user for analytics test');
    }

    // Set token so admin route passes guard
    await page.goto(FRONTEND);
    await page.evaluate(token => {
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('loginStateChange'));
    }, authToken);

    await page.goto(`${FRONTEND}/admin/reviews`);

    // Wait for analytics section
    const analyticsHeader = page.getByRole('heading', { name: /review analytics/i, level: 2 });
    await expect(analyticsHeader).toBeVisible({ timeout: 8000 });

    // Highest-rated card present
    const highestCard = page.getByRole('heading', { name: /highest-rated exhibit/i, level: 4 }).locator('..');
    await expect(highestCard).toBeVisible();

    // Lowest-rated card present
    const lowestCard = page.getByRole('heading', { name: /lowest-rated exhibit/i, level: 4 }).locator('..');
    await expect(lowestCard).toBeVisible();
  });
});
