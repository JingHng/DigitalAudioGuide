import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const API_URL = "http://localhost:5175";

const BADGE_ANALYTICS_URL = `${FRONTEND_URL}/admin/badge-analytics`;

const TEST_USER = {
  username: "admin",
  password: "admin123",
};

/**
 * If your frontend stores JWT under a specific key, keep only that key.
 * Common examples: "token", "accessToken", "authToken", "jwt".
 */
const AUTH_STORAGE_KEYS = ["token", "accessToken", "authToken", "jwt"] as const;

// -------------------- Mock Data --------------------

const mockExhibitions = [
  { exhibitionId: "ex1", title: "Space Odyssey" },
  { exhibitionId: "ex2", title: "Deep Sea Wonders" },
];

function makeDashboardPayload(range: string, exhibitionId: string) {
  const interval = range === "1y" ? "week" : "day";

  const usersEarned =
    exhibitionId === "ex1" ? 5 : exhibitionId === "ex2" ? 9 : 12;

  const totalEarned =
    range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

  return {
    filters: {
      range,
      interval,
      exhibitionId,
      from: "2025-01-01",
      to: "2025-01-30",
    },
    kpis: {
      totalBadges: 12,
      totalEarned,
      usersEarned,
      avgEarnsPerDay: 1,
    },
    topBadges: [
      { badgeId: "b1", name: "Explorer", style: "bronze", earned: 10 },
      { badgeId: "b2", name: "Champion", style: "silver", earned: 6 },
    ],
    bottomBadges: [{ badgeId: "b3", name: "Starter", style: "gold", earned: 0 }],
    earnedByStyle: [
      { style: "bronze", earned: 11 },
      { style: "silver", earned: 5 },
    ],
    timeline: [
      { date: "2025-01-01", earned: 1 },
      { date: "2025-01-02", earned: 2 },
    ],
  };
}

// -------------------- Route helpers --------------------
// Support optional /api prefix (frontend may call /api/xxx via proxy)
const anyExhibitions = /\/(api\/)?badges\/stats\/exhibitions$/;
const anyDashboard = /\/(api\/)?badges\/stats\/dashboard(\?.*)?$/;

// -------------------- Auth helpers --------------------

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
            // Ignore storage errors; the test will fail later if app truly requires it.
          }
        }
      },
      { tokenValue: token, keys: AUTH_STORAGE_KEYS },
    );
  }
}

/**
 * Navigate to the badge analytics page and ensure we are not redirected to /login.
 */
async function gotoBadgeAnalyticsAsAdmin(page: Page) {
  await page.goto(BADGE_ANALYTICS_URL, { waitUntil: "domcontentloaded" });
  await expect(page).not.toHaveURL(/\/login(\b|\/|#|\?)/, { timeout: 20_000 });
}

// -------------------- Tests --------------------

test.describe.configure({ mode: "serial" });

test.describe("Admin BadgeAnalyticsPage", () => {
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
    await gotoBadgeAnalyticsAsAdmin(page);
  });

  test("loads analytics, shows title with exhibition label, and renders window + KPIs", async ({ page }) => {
    await page.route(anyExhibitions, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibitions),
      });
    });

    await page.route(anyDashboard, async (route) => {
      const url = new URL(route.request().url());
      const range = url.searchParams.get("range") || "30d";
      const exhibitionId = url.searchParams.get("exhibitionId") || "all";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeDashboardPayload(range, exhibitionId)),
      });
    });

    // Ensure routes apply to the current page load.
    await page.reload({ waitUntil: "domcontentloaded" });

    // Title includes exhibition annotation
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Badge Analytics — All Exhibitions",
      { timeout: 20_000 },
    );

    // Filters present + default selections
    await expect(page.locator("#badgePeriod")).toHaveValue("30d");
    await expect(page.locator("#exhibitionSelect")).toHaveValue("all");

    // Window rendered (dd/mm/yyyy)
    await expect(page.getByText("Window:")).toBeVisible();
    await expect(page.getByText(/01\/01\/2025 → 30\/01\/2025/)).toBeVisible();

    // KPI headings visible
    await expect(page.getByRole("heading", { name: "Total Badges" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Total Earned" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Users Earned" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Avg Earns / Day" })).toBeVisible();

    // Chart section headings visible
    await expect(page.getByRole("heading", { name: "Badges Earned Timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Earned by Style" })).toBeVisible();
    await expect(
        page.getByRole("heading", { name: "Top Badges", exact: true })
    ).toBeVisible();

    // Table headings visible
    await expect(page.getByRole("heading", { name: "Badge Rankings" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top Badges (Table)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Bottom Badges (Includes 0)" })).toBeVisible();

    // A couple of known table entries from mock
    const topTable = page
        .getByRole("heading", { name: "Top Badges (Table)", exact: true })
        .locator("..") // chart-header
        .locator("..") // chart-container
        .locator(".content-table");

    await expect(topTable.locator(".content-name", { hasText: "Explorer" })).toBeVisible();
    await expect(topTable.locator(".content-name", { hasText: "Champion" })).toBeVisible();

  });

  test("changes Period (length of time) and refetches dashboard with new range", async ({ page }) => {
    await page.route(anyExhibitions, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibitions),
      });
    });

    let lastDashboardUrl = "";
    await page.route(anyDashboard, async (route) => {
      lastDashboardUrl = route.request().url();

      const url = new URL(route.request().url());
      const range = url.searchParams.get("range") || "30d";
      const exhibitionId = url.searchParams.get("exhibitionId") || "all";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeDashboardPayload(range, exhibitionId)),
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Change Period to 7d -> should trigger fetch with range=7d
    await page.locator("#badgePeriod").selectOption("7d");

    await expect.poll(() => lastDashboardUrl).toContain("range=7d");

    // The Window line remains visible; content still shows from/to (from mock)
    await expect(page.getByText(/01\/01\/2025 → 30\/01\/2025/)).toBeVisible();
  });

  test("changes Exhibition and updates title + refetches dashboard with exhibitionId", async ({ page }) => {
    await page.route(anyExhibitions, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibitions),
      });
    });

    let lastDashboardUrl = "";
    await page.route(anyDashboard, async (route) => {
      lastDashboardUrl = route.request().url();

      const url = new URL(route.request().url());
      const range = url.searchParams.get("range") || "30d";
      const exhibitionId = url.searchParams.get("exhibitionId") || "all";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(makeDashboardPayload(range, exhibitionId)),
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    // Select ex1
    await page.locator("#exhibitionSelect").selectOption("ex1");

    // Title updated
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Badge Analytics — Space Odyssey",
      { timeout: 20_000 },
    );

    // Request params updated
    await expect.poll(() => lastDashboardUrl).toContain("exhibitionId=ex1");
  });

 test("clicks Refresh and triggers dashboard refetch", async ({ page }) => {
  await page.route(anyExhibitions, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockExhibitions),
    });
  });

  // ✅ 用更宽松的 dashboard 匹配（避免 /api 前缀 / query 顺序 / baseURL 变化）
  const anyDashboardLoose = /\/badges\/stats\/dashboard(\?.*)?$/;

  await page.route(anyDashboardLoose, async (route) => {
    const url = new URL(route.request().url());
    const range = url.searchParams.get("range") || "30d";
    const exhibitionId = url.searchParams.get("exhibitionId") || "all";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(makeDashboardPayload(range, exhibitionId)),
    });
  });

  await page.reload({ waitUntil: "domcontentloaded" });

  // ✅ 等到页面第一次 dashboard 数据渲染出来，确保初始加载完成
  await expect(page.getByText("Window:")).toBeVisible({ timeout: 20_000 });

  // ✅ 关键：点击 Refresh 前，先挂起对“下一次 dashboard 请求”的等待
  const reqPromise = page.waitForRequest((req) => {
    return (
      req.method() === "GET" &&
      /\/badges\/stats\/dashboard(\?.*)?$/.test(req.url())
    );
  });

  await page.getByRole("button", { name: "Refresh data" }).click();

  const req = await reqPromise;
  expect(req.url()).toMatch(/\/badges\/stats\/dashboard/);
});


  test("shows error message when dashboard fetch fails", async ({ page }) => {
    await page.route(anyExhibitions, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibitions),
      });
    });

    await page.route(anyDashboard, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "Server error" }),
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByText("Failed to fetch badge analytics data")).toBeVisible({
      timeout: 20_000,
    });
  });

  test("shows timeline empty-state when timeline data is empty", async ({ page }) => {
    await page.route(anyExhibitions, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibitions),
      });
    });

    await page.route(anyDashboard, async (route) => {
      const url = new URL(route.request().url());
      const range = url.searchParams.get("range") || "30d";
      const exhibitionId = url.searchParams.get("exhibitionId") || "all";

      const payload = makeDashboardPayload(range, exhibitionId);
      payload.timeline = []; // trigger empty-state in timeline chart

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByText("No earned badges data in this window")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText("Try changing period or exhibition filter")).toBeVisible();
  });
});
