import { test, expect } from "@playwright/test";

test.use({ trace: "on-first-retry" });

const TEST_USER = {
  userId: "1",
  username: "admin",
  password: "admin123",
  email: "admin@audiomuseum.com",
  roles: ["admin"],
  profilePictureUrl: "/avatars/admin.png",
  firstName: "System",
  lastName: "Admin",
  gender: null,
};

test.describe("Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("api/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: TEST_USER }),
      });
    });

    await page.route("api/badges/userBadges", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.route("api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ token: "fake-jwt-token" }),
      });
    });


    await page.goto("/login");
    await page.getByPlaceholder("Your username").fill(TEST_USER.username);
    await page.getByPlaceholder("••••••••").fill(TEST_USER.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL("/admin/dashboard", { timeout: 15000 });

    await page.goto("/profile");
    await expect(page.locator(".display-name")).toBeVisible();
  });

  test("shows full name + username handle + email + roles", async ({ page }) => {
    await expect(page.locator(".display-name")).toHaveText(
      `${TEST_USER.firstName} ${TEST_USER.lastName}`
    );
    await expect(page.locator(".username-handle")).toHaveText(`@${TEST_USER.username}`);
    await expect(page.getByText(TEST_USER.email)).toBeVisible();
    await expect(page.locator(".role-chip")).toHaveCount(TEST_USER.roles.length);
    await expect(page.locator(".role-chip")).toContainText(TEST_USER.roles[0]);
  });

  test("navigates to edit profile when Edit button clicked", async ({ page }) => {
    await page.click(".edit-profile-btn");
    await expect(page).toHaveURL(/\/edit-profile$/);
  });

  test("shows no badges message when user has no badges", async ({ page }) => {
    await expect(page.getByText("Your Badges")).toBeVisible();
    await expect(page.getByText("You haven't earned any badges yet.")).toBeVisible();
    await expect(page.locator(".badge-item")).toHaveCount(0);
  });

  test("optionally shows gender pill when gender exists", async ({ page }) => {
    await page.unroute("api/auth/profile");
    await page.route("api/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { ...TEST_USER, gender: "male" } }),
      });
    });

    await page.reload();
    await expect(page.locator(".gender-pill")).toBeVisible();
  });
});
