import { test, expect } from "@playwright/test";

const API_URL = "http://localhost:5175";
const FRONTEND_URL = "http://localhost:5173";

const AR_EXPERIENCE_URL = "https://example.8thwall.app/ar-experience";

test.describe.configure({ mode: "serial" });

test.describe("Exhibit AR Experience Toggle", () => {
  let authToken: string;
  let arOnExhibitId: string;
  let exhibitionId: string;

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: "admin", password: "admin123" },
    });

    expect(loginResponse.ok()).toBeTruthy();
    authToken = (await loginResponse.json()).token;

    const exhibitionRes = await request.post(`${API_URL}/api/exhibitions`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        title: `Test Exhibition ${Date.now()}`,
        description: "E2E exhibition",
      },
    });

    expect(exhibitionRes.status()).toBe(201);
    exhibitionId = (await exhibitionRes.json()).exhibitionId;
  });

  test.afterAll(async ({ request }) => {
    if (authToken && arOnExhibitId) {
      await request.delete(`${API_URL}/api/exhibits/${arOnExhibitId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
    if (authToken && exhibitionId) {
      await request.delete(`${API_URL}/api/exhibitions/${exhibitionId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
    }
  });

  test("should create a new exhibit", async ({ request }) => {
    const uniqueTitle = `Test Exhibit - ${Date.now()}`;

    const response = await request.post(`${API_URL}/api/exhibits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        title: uniqueTitle,
        description: "Test exhibit for AR toggle E2E",
        exhibitionId,
        isArEnabled: false,
        arExperienceUrl: "",
        badgeId: "none",
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("exhibitId");
    arOnExhibitId = body.exhibitId;
  });

  test("enable AR via API", async ({ request }) => {
    const response = await request.put(
      `${API_URL}/api/exhibits/${arOnExhibitId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          isArEnabled: true,
          arExperienceUrl: AR_EXPERIENCE_URL,
        },
      },
    );

    expect(response.status()).toBe(200);
    const updatedExhibit = await response.json();
    expect(updatedExhibit.isArEnabled).toBe(true);
    expect(updatedExhibit.arExperienceUrl).toBe(AR_EXPERIENCE_URL);
  });

  test("AR button visible on exhibit page", async ({ page, request }) => {
    const uniqueTitle = `Test Exhibit - ${Date.now()}`;

    const response = await request.post(`${API_URL}/api/exhibits`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: {
        title: uniqueTitle,
        description: "Test exhibit for AR toggle E2E",
        exhibitionId,
        isArEnabled: true,
        arExperienceUrl: AR_EXPERIENCE_URL,
        badgeId: "none",
      },
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body).toHaveProperty("exhibitId");
    arOnExhibitId = body.exhibitId;

    await page.goto(
      `${FRONTEND_URL}/exhibitions/${exhibitionId}/exhibit/${arOnExhibitId}`,
    );

    await expect(page.locator("h1")).toContainText(`${uniqueTitle}`);

    const arBtn = page.locator('a:has-text("Launch AR Experience")');
    await expect(arBtn).toBeVisible();
    await expect(arBtn).toHaveAttribute("href", AR_EXPERIENCE_URL);
  });

  test("disable AR via API", async ({ request }) => {
    const response = await request.put(
      `${API_URL}/api/exhibits/${arOnExhibitId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { isArEnabled: false },
      },
    );

    expect(response.status()).toBe(200);
    const updatedExhibit = await response.json();
    expect(updatedExhibit.isArEnabled).toBe(false);
    expect(updatedExhibit.arExperienceUrl).toBeNull();
  });
});
