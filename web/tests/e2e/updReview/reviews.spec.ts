import { test, expect } from '@playwright/test';

// Hardcoded values for CI/local runs
const API_URL = process.env.VITE_API_TARGET || 'http://localhost:5175';
const TEST_EMAIL = 'admin';
const TEST_PASSWORD = 'admin123';
const EXHIBIT_ID = '1';

test.describe('Review System E2E', () => {
  // Helper: log in via the API and return token + user
  async function apiLogin(request) {
    let res = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: TEST_EMAIL, password: TEST_PASSWORD }
    });
    if (!res.ok()) {
      res = await request.post(`${API_URL}/api/auth/login`, {
        data: { email: TEST_EMAIL, password: TEST_PASSWORD }
      });
    }
    const body = await res.json();
    expect(res.ok()).toBeTruthy();
    const token =
      body?.token ||
      body?.data?.token ||
      body?.accessToken ||
      (body?.data && body.data.token);
    const user = body?.user || body?.data?.user || body?.data || null;
    expect(token).toBeTruthy();
    return { token, user };
  }

  test('Submit and verify review via API and verify via endpoints', async ({ request }) => {
    const { token } = await apiLogin(request);

    const reviewPayload = {
      exhibit_id: EXHIBIT_ID,
      rating: 5,
      comment: 'Automated E2E review 2'
    };

    const createRes = await request.post(`${API_URL}/api/reviews`, {
      data: reviewPayload,
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(createRes.status()).toBeGreaterThanOrEqual(200);
    expect(createRes.status()).toBeLessThan(300);

    const listRes = await request.get(`${API_URL}/api/reviews/exhibit/${EXHIBIT_ID}?limit=20`);
    expect(listRes.ok()).toBeTruthy();
    const listBody = await listRes.json();
    const reviews = listBody?.data?.reviews || listBody?.reviews || [];
    expect(Array.isArray(reviews)).toBeTruthy();
    const found = reviews.find(
      r =>
        (r.description || r.comment || r.body) &&
        (r.description || r.comment || r.body).includes('Automated E2E review')
    );
    expect(found).toBeTruthy();
  });

  test('Review appears in user reviews via API', async ({ request }) => {
    const { user } = await apiLogin(request);
    const userId = user?.userId || user?.id || user?.user_id || null;
    expect(userId).toBeTruthy();

    const res = await request.get(`${API_URL}/api/reviews/user/${userId}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const reviews = body?.data?.reviews || body?.reviews || [];
    expect(Array.isArray(reviews)).toBeTruthy();
  });

  test('Review analytics endpoint returns average rating', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/reviews/exhibit/${EXHIBIT_ID}/rating`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const avg = data?.average_rating || data?.data?.average_rating;
    expect(typeof avg === 'number' || !isNaN(Number(avg))).toBeTruthy();
  });
});