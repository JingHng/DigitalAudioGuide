import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const FRONTEND_URL = "http://localhost:5174";
const API_URL = "http://localhost:5175";

const EXHIBITION_ID = 4;
const EXHIBIT_ID = 8;

const TEST_USER = {
  username: "admin",
  password: "admin123",
};

// If your frontend stores JWT under a specific key, keep only that key.
const AUTH_STORAGE_KEYS = ["token", "accessToken", "authToken", "jwt"] as const;

// Minimal exhibit mock so that ExhibitDetails can render
const mockExhibit = {
  exhibitId: EXHIBIT_ID,
  title: "Test Exhibit",
  description: "This is a test exhibit for badge behavior.",
  images: [],
  audio: [],
};

/**
 * Parse a Set-Cookie header into Playwright cookie objects.
 * This is a best-effort helper for cookie-based auth.
 */
function parseSetCookieHeader(setCookie: string, baseUrl: string) {
  const url = new URL(baseUrl);

  // Handle multiple cookies combined (some servers send as a single string).
  // This split is heuristic; it works for typical "cookie=...; Path=/, other=...; Path=/" cases.
  const cookieParts = setCookie.split(/,(?=\s*[^;=]+=[^;=]+)/g);

  return cookieParts.map((cookieStr) => {
    const segments = cookieStr.split(";").map((s) => s.trim());
    const [nameValue, ...attrs] = segments;

    const eqIndex = nameValue.indexOf("=");
    const name = nameValue.slice(0, eqIndex);
    const value = nameValue.slice(eqIndex + 1);

    let path = "/";
    let domain = url.hostname;
    let httpOnly = false;
    let secure = false;
    let sameSite: "Lax" | "Strict" | "None" | undefined;

    for (const a of attrs) {
      const [kRaw, vRaw] = a.split("=");
      const k = (kRaw || "").toLowerCase();
      const v = (vRaw || "").trim();

      if (k === "path" && v) path = v;
      if (k === "domain" && v) domain = v.startsWith(".") ? v.slice(1) : v;
      if (k === "httponly") httpOnly = true;
      if (k === "secure") secure = true;
      if (k === "samesite" && v) {
        const vv = v.toLowerCase();
        if (vv === "lax") sameSite = "Lax";
        if (vv === "strict") sameSite = "Strict";
        if (vv === "none") sameSite = "None";
      }
    }

    return { name, value, domain, path, httpOnly, secure, sameSite };
  });
}

/**
 * Perform API login once and reuse credentials across tests.
 * This avoids flaky UI login steps in CI.
 */
async function apiLogin(request: APIRequestContext) {
  const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: TEST_USER.username, password: TEST_USER.password },
  });

  expect(loginResponse.ok()).toBeTruthy();

  const loginJson = await loginResponse.json().catch(() => ({}));
  const token =
    loginJson?.token ||
    loginJson?.data?.token ||
    loginJson?.accessToken ||
    loginJson?.data?.accessToken;

  const setCookie = loginResponse.headers()["set-cookie"];

  return { token: token as string | undefined, setCookie };
}

/**
 * Inject auth into the browser context.
 * Supports both token-in-localStorage and cookie-based session.
 */
async function applyAuth(page: Page, token?: string, setCookie?: string) {
  if (setCookie) {
    const cookies = parseSetCookieHeader(setCookie, FRONTEND_URL);
    await page.context().addCookies(
      cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: c.sameSite,
      })),
    );
  }

  if (token) {
    // Ensure localStorage is set before any app code reads it.
    await page.addInitScript(
      ({ tokenValue, keys }) => {
        for (const k of keys) {
          try {
            window.localStorage.setItem(k, tokenValue);
          } catch {
            // Ignore storage errors; test will fail later if app truly requires it.
          }
        }
      },
      { tokenValue: token, keys: AUTH_STORAGE_KEYS },
    );
  }
}

test.describe("ExhibitDetails - new badge toast behaviour (logged in)", () => {
  let authToken: string | undefined;
  let setCookie: string | undefined;

  test.beforeAll(async ({ request }) => {
    const result = await apiLogin(request);
    authToken = result.token;
    setCookie = result.setCookie;

    // Fail fast if neither token nor cookie exists. Adjust if your backend returns auth differently.
    expect(authToken || setCookie).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await applyAuth(page, authToken, setCookie);
  });

  test("shows toast when isNew=true", async ({ page }) => {
    // Mock exhibit details API call (supports /api prefix)
    const exhibitUrlRegex = new RegExp(`/api/exhibits/${EXHIBIT_ID}$`);
    await page.route(exhibitUrlRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibit),
      });
    });

    // Mock badge assignment endpoint (supports optional /api prefix)
    const assignUrlRegex = new RegExp(
      `/(api/)?badges/assignBadges/${EXHIBIT_ID}$`,
    );
    let assignCalled = false;

    await page.route(assignUrlRegex, async (route) => {
      assignCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isNew: true,
          message: "Badge claimed successfully",
          badgeId: "1",
          name: "Explorer",
          imageUrl: "/images/badge/explorer.png",
        }),
      });
    });

    // Navigate to the actual ExhibitDetails route
    await page.goto(
      `${FRONTEND_URL}/exhibitions/${EXHIBITION_ID}/exhibit/${EXHIBIT_ID}`,
      { waitUntil: "domcontentloaded" },
    );

    // Verify ExhibitDetails renders
    await expect(
      page.getByRole("heading", { name: mockExhibit.title }),
    ).toBeVisible({ timeout: 10_000 });

    // Prefer an event-driven wait over a fixed delay when possible.
    // Keep a short delay only as a last resort for side-effect based logic.
    await page.waitForTimeout(800);

    // Verify the assign endpoint was called
    expect(assignCalled).toBeTruthy();

    // Assert the new toast UI
    const toast = page.locator(".earn-badge-toast");
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast.getByText("You claimed a new badge!")).toBeVisible();
    await expect(toast.getByText(mockExhibit.title)).toBeVisible();

    // Verify badge image is shown
    await expect(
      toast.locator('img.earn-badge-toast-img[alt="badge"]'),
    ).toBeVisible();

    // Close the toast manually
    await toast.locator(".earn-badge-toast-close").click();
    await expect(page.locator(".earn-badge-toast")).toHaveCount(0);
  });

  test("does NOT show toast when isNew=false", async ({ page }) => {
    const exhibitUrlRegex = new RegExp(`/api/exhibits/${EXHIBIT_ID}$`);
    await page.route(exhibitUrlRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibit),
      });
    });

    const assignUrlRegex = new RegExp(
      `/(api/)?badges/assignBadges/${EXHIBIT_ID}$`,
    );
    let assignCalled = false;

    await page.route(assignUrlRegex, async (route) => {
      assignCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          isNew: false,
          message: "Badge already claimed",
          badgeId: "1",
          name: "Explorer",
          imageUrl: "/images/badge/explorer.png",
        }),
      });
    });

    await page.goto(
      `${FRONTEND_URL}/exhibitions/${EXHIBITION_ID}/exhibit/${EXHIBIT_ID}`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByRole("heading", { name: mockExhibit.title }),
    ).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(800);

    expect(assignCalled).toBeTruthy();

    // isNew=false should not show the toast
    await expect(page.locator(".earn-badge-toast")).toHaveCount(0);
  });
});

test.describe("ExhibitDetails - new badge toast behaviour (NOT logged in)", () => {
  test("does NOT call assign endpoint when user is not logged in", async ({
    page,
  }) => {
    const exhibitUrlRegex = new RegExp(`/api/exhibits/${EXHIBIT_ID}$`);
    await page.route(exhibitUrlRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibit),
      });
    });

    const assignUrlRegex = new RegExp(
      `/(api/)?badges/assignBadges/${EXHIBIT_ID}$`,
    );
    let assignCalled = false;

    await page.route(assignUrlRegex, async (route) => {
      assignCalled = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ isNew: true }),
      });
    });

    // Navigate without logging in
    await page.goto(
      `${FRONTEND_URL}/exhibitions/${EXHIBITION_ID}/exhibit/${EXHIBIT_ID}`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(
      page.getByRole("heading", { name: mockExhibit.title }),
    ).toBeVisible({ timeout: 10_000 });

    await page.waitForTimeout(1000);

    // When user is not logged in, the effect should return early and not call assign
    expect(assignCalled).toBeFalsy();
    await expect(page.locator(".earn-badge-toast")).toHaveCount(0);
  });
});
