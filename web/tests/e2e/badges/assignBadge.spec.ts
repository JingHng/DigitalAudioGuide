import { test, expect } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5174";
const EXHIBITION_ID = 4;
const EXHIBIT_ID = 8;

const TEST_USER = {
  username: "admin",
  password: "admin123",
};

// Minimal exhibit mock so that ExhibitDetails can render
const mockExhibit = {
  exhibitId: EXHIBIT_ID,
  title: "Test Exhibit",
  description: "This is a test exhibit for badge behavior.",
  images: [],
  audio: [],
};

async function login(page: any) {
  await page.goto(`${FRONTEND_URL}/login`, { waitUntil: "domcontentloaded" });

  // Fallback locators to avoid brittle failures if placeholders or selectors change
  const username = page
    .getByPlaceholder("Enter your username")
    .first()
    .or(page.getByPlaceholder(/username/i).first())
    .or(page.locator('input[name="username"]').first())
    .or(page.locator('input[type="text"]').first());

  const password = page
    .getByPlaceholder("Enter your password")
    .first()
    .or(page.getByPlaceholder(/password/i).first())
    .or(page.locator('input[name="password"]').first())
    .or(page.locator('input[type="password"]').first());

  await expect(username).toBeVisible({ timeout: 20_000 });
  await expect(password).toBeVisible({ timeout: 20_000 });

  await username.fill(TEST_USER.username);
  await password.fill(TEST_USER.password);

  const loginBtn = page
    .getByRole("button", { name: /login/i })
    .first()
    .or(page.locator('button[type="submit"]').first());

  await expect(loginBtn).toBeVisible({ timeout: 20_000 });
  await loginBtn.click();

  // Do not assume the post-login destination; only require leaving /login
  await page.waitForURL((url: any) => !url.toString().includes("/login"), {
    timeout: 20_000,
  });
}

test.describe("ExhibitDetails - new badge toast behaviour (logged in)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
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
    const assignUrlRegex = new RegExp(`/(api/)?badges/assignBadges/${EXHIBIT_ID}$`);
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
      { waitUntil: "domcontentloaded" }
    );

    // Verify ExhibitDetails renders
    await expect(page.getByRole("heading", { name: mockExhibit.title })).toBeVisible({
      timeout: 10_000,
    });

    // Allow the badge-claiming effect to execute and trigger the POST
    await page.waitForTimeout(1200);

    // Verify the assign endpoint was called
    expect(assignCalled).toBeTruthy();

    // Assert the new toast UI
    const toast = page.locator(".earn-badge-toast");
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await expect(toast.getByText("You claimed a new badge!")).toBeVisible();
    await expect(toast.getByText(mockExhibit.title)).toBeVisible();

    // Verify badge image is shown
    await expect(toast.locator('img.earn-badge-toast-img[alt="badge"]')).toBeVisible();

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

    const assignUrlRegex = new RegExp(`/(api/)?badges/assignBadges/${EXHIBIT_ID}$`);
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
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByRole("heading", { name: mockExhibit.title })).toBeVisible({
      timeout: 10_000,
    });

    await page.waitForTimeout(1200);

    expect(assignCalled).toBeTruthy();

    // isNew=false should not show the toast
    await expect(page.locator(".earn-badge-toast")).toHaveCount(0);
  });
});

test.describe("ExhibitDetails - new badge toast behaviour (NOT logged in)", () => {
  test("does NOT call assign endpoint when user is not logged in", async ({ page }) => {
    const exhibitUrlRegex = new RegExp(`/api/exhibits/${EXHIBIT_ID}$`);
    await page.route(exhibitUrlRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockExhibit),
      });
    });

    const assignUrlRegex = new RegExp(`/(api/)?badges/assignBadges/${EXHIBIT_ID}$`);
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
      { waitUntil: "domcontentloaded" }
    );

    await expect(page.getByRole("heading", { name: mockExhibit.title })).toBeVisible({
      timeout: 10_000,
    });

    await page.waitForTimeout(1500);

    // When user is not logged in, the effect should return early and not call assign
    expect(assignCalled).toBeFalsy();
    await expect(page.locator(".earn-badge-toast")).toHaveCount(0);
  });
});
