import { test, expect } from "@playwright/test";

const API_URL = process.env.API_URL ?? "http://localhost:5175";
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

test.describe.configure({ mode: "serial" });

test.describe("Exhibition Statistics Admin UI - Comprehensive Tests", () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: { username: "admin", password: "admin123" },
    });

    if (!loginResponse.ok()) {
      throw new Error(
        `Login failed: ${loginResponse.status()} ${loginResponse.statusText()}\n` +
        `${await loginResponse.text()}`
      );
    }

    authToken = (await loginResponse.json()).token;
    expect(authToken).toBeTruthy();
  });


  async function applyAuth(page: Page) {
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: "domcontentloaded" });

    await page.addInitScript((token) => {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("accessToken", token);
    }, authToken);

    await page.reload({ waitUntil: "domcontentloaded" });
  }

  test.beforeEach(async ({ page }) => {
    await applyAuth(page);
  });

  test("should load admin dashboard with exhibition statistics chart", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".admin-dashboard")).toBeVisible({ timeout: 20000 });

    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator(".chart-container.visitor-stats-chart")).toBeVisible();
    await expect(page.locator('h2:has-text("Total Visitors Per Exhibition (Tour)")')).toBeVisible();
  });

  test("should display KPI cards with correct metrics", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });

    const kpiCards = page
      .locator("div")
      .filter({ hasText: /^(Total Users|Total Active Tours|Audio Plays)$/ });

    await expect(kpiCards.first()).toBeVisible();
    await expect(page.getByText("Total Active Tours", { exact: true })).toBeVisible();
  });

  test("should display exhibition multi-select dropdown", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    const dropdownButton = page.locator(".visitor-stats-filter button").first();
    await expect(dropdownButton).toBeVisible();
    await expect(dropdownButton).toContainText(/\d+ tours? selected/);
  });

  test("should open and close exhibition dropdown", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    const dropdownButton = page.locator(".visitor-stats-filter button").first();

    await dropdownButton.click();
    await page.waitForTimeout(300);

    const dropdownMenu = page
      .locator(".visitor-stats-filter div")
      .filter({ hasText: /All|Clear/ })
      .first();
    await expect(dropdownMenu).toBeVisible();

    await expect(page.locator('button:has-text("All")')).toBeVisible();
    await expect(page.locator('button:has-text("Clear")')).toBeVisible();

    await page.click('h1:has-text("Dashboard")');
    await page.waitForTimeout(300);
  });

  test("should display filter type toggle buttons", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });

    await expect(page.locator('button:has-text("Quick Periods")')).toBeVisible();
    await expect(page.locator('button:has-text("Custom Range")')).toBeVisible();
  });

  test("should show period dropdown when Quick Periods is active", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("Quick Periods")').click();
    await page.waitForTimeout(300);

    const periodSelect = page.locator("#visitorPeriodSelect");
    await expect(periodSelect).toBeVisible();

    const optionCount = await periodSelect.locator("option").count();
    expect(optionCount).toBeGreaterThanOrEqual(5);
  });

  test("should show date range inputs when Custom Range is active", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("Custom Range")').click();
    await page.waitForTimeout(300);

    const dateInputs = page.locator('input[type="date"]');
    const count = await dateInputs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("should change period filter and update chart", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    await page.locator('button:has-text("Quick Periods")').click();
    await page.waitForTimeout(300);

    await page.selectOption("#visitorPeriodSelect", { label: "Last Month" });
    await page.waitForTimeout(1000);

    await expect(page.locator(".visitor-stats-chart .recharts-responsive-container")).toBeVisible();
  });

  test("should display bar chart with exhibition data", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    await expect(
      page.locator(".visitor-stats-chart .recharts-bar-rectangle").first()
    ).toBeVisible({ timeout: 10000 });

    const bars = page.locator(".visitor-stats-chart .recharts-bar-rectangle path");
    const count = await bars.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should display chart with colored bars for each exhibition", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });
    await page.waitForTimeout(1500);

    const chart = page.locator(".recharts-responsive-container").first();
    await expect(chart).toBeVisible();

    const xAxisLabels = page.locator(".recharts-xAxis .recharts-text");
    const labelCount = await xAxisLabels.count();
    expect(labelCount).toBeGreaterThan(0);
  });

  test("should display refresh button and reload data", async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/admin/dashboard`, { waitUntil: "load" });
    await page.waitForSelector(".admin-dashboard", { timeout: 20000 });

    const refreshButton = page.locator("button.refresh-btn");
    await expect(refreshButton).toBeVisible();

    await refreshButton.click();
    await page.waitForTimeout(1000);

    await expect(page.locator(".admin-dashboard")).toBeVisible();
  });
});
