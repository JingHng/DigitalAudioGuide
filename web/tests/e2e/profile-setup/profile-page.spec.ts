import { test, expect } from "@playwright/test";

const TEST_USER = {
  userId: "1",
  username: "admin",
  password: "admin123",
  email: "admin@audiomuseum.com",
  roles: ["admin"],
  profilePictureUrl: "/avatars/admin.png",
  firstName: "Admin",
  lastName: "User",
  gender: null, 
};

test.describe("Profile Page (ProfilePage2)", () => {
  test.beforeEach(async ({ page }) => {
    // Mock profile API BEFORE /profile loads
    await page.route("**/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            userId: TEST_USER.userId,
            username: TEST_USER.username,
            email: TEST_USER.email,
            profilePictureUrl: TEST_USER.profilePictureUrl,
            firstName: TEST_USER.firstName,
            lastName: TEST_USER.lastName,
            gender: TEST_USER.gender,
            roles: TEST_USER.roles,
            badges: [],
          },
        }),
      });
    });

    // Default: no badges
    await page.route("**/badges/userBadges", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    // Login via UI
    await page.goto("/login");
    await page.fill('input[placeholder="Your username"]', TEST_USER.username);
    await page.fill('input[placeholder="••••••••"]', TEST_USER.password);
    await page.click('button:has-text("Sign In")');
    await page.waitForURL("**/admin/dashboard", { timeout: 15000 });

    // Go to profile
    await page.goto("/profile");
    await page.waitForLoadState("networkidle", { timeout: 15000 });
  });

  test("shows full name + username handle + email + roles", async ({ page }) => {
    // Full name must be shown
    await expect(page.locator(".display-name")).toHaveText(
      `${TEST_USER.firstName} ${TEST_USER.lastName}`
    );

    // Username handle must be shown
    await expect(page.locator(".username-handle")).toHaveText(`@${TEST_USER.username}`);

    // Email visible
    await expect(page.getByText(TEST_USER.email)).toBeVisible();

    // Role chips
    await expect(page.locator(".role-chip")).toHaveCount(TEST_USER.roles.length);
    await expect(page.locator(".role-chip")).toContainText(TEST_USER.roles[0]);
  });

  test("navigates to edit profile when Edit button clicked", async ({ page }) => {
    await page.click(".edit-profile-btn");
    await expect(page).toHaveURL(/\/edit-profile$/);
  });

  test("shows no badges message when user has no badges", async ({ page }) => {
    await expect(page.locator(".badges-title")).toHaveText("Your Badges");
    await expect(page.locator(".no-badges-text")).toBeVisible();
    await expect(page.locator(".no-badges-text")).toHaveText(
      "You haven't earned any badges yet."
    );
    await expect(page.locator(".badge-item")).toHaveCount(0);
  });

  test("shows assigned badge when API returns badge list", async ({ page }) => {
    await page.route("**/badges/userBadges", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              badgeId: 1,
              badge: { name: "Explorer", imageUrl: "/badges/badge-1.png" },
            },
          ],
        }),
      });
    });

    // Reload so the badges useEffect refetches with new mock
    await page.goto("/profile");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.locator(".badge-item")).toHaveCount(1);
    await expect(page.locator(".badge-name")).toHaveText("Explorer");
    await expect(page.locator(".badge-image")).toHaveAttribute("src", /badge-1\.png/);
  });

  test("optionally shows gender pill when gender exists", async ({ page }) => {
    await page.route("**/auth/profile", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { ...TEST_USER, gender: "male" },
        }),
      });
    });

    await page.goto("/profile");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.locator(".gender-pill")).toBeVisible();
  });
});
