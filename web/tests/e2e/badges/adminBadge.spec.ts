import { test, expect, Page, Route } from "@playwright/test";

const BASE_URL = "http://localhost:5173";
const BADGES_URL = `${BASE_URL}/admin/badges`;

const TEST_USER = { username: "admin", password: "admin123" };

type BadgeDTO = {
  badgeId: string;
  name?: string | null;
  description?: string | null;
  style?: string | null;
  imageUrl?: string | null;
  exhibit?: {
    exhibitId: string;
    title?: string;
    exhibition?: {
      exhibitionId: string;
      title: string;
    } | null;
  } | null;
};

function makeFixtures() {
  const badges: BadgeDTO[] = [
    {
      badgeId: "b1",
      name: "Alpha Badge",
      description: "Badge in Expo A / Exhibit A1",
      style: "cute",
      imageUrl: "/images/badge/a.png",
      exhibit: {
        exhibitId: "exA1",
        title: "A1 Exhibit",
        exhibition: { exhibitionId: "expoA", title: "Expo A" },
      },
    },
    {
      badgeId: "b2",
      name: "Beta Badge",
      description: "Badge in Expo A / Exhibit A2",
      style: "cool",
      imageUrl: "/images/badge/b.png",
      exhibit: {
        exhibitId: "exA2",
        title: "A2 Exhibit",
        exhibition: { exhibitionId: "expoA", title: "Expo A" },
      },
    },
    {
      badgeId: "b3",
      name: "Gamma Badge",
      description: "Badge in Expo B / Exhibit B1",
      style: "funny",
      imageUrl: "/images/badge/c.png",
      exhibit: {
        exhibitId: "exB1",
        title: "B1 Exhibit",
        exhibition: { exhibitionId: "expoB", title: "Expo B" },
      },
    },
  ];

  const styles = ["cute", "cool", "funny", "vip"];
  return { badges, styles };
}

async function mockBadgesApi(page: Page, opts?: { delayMs?: number }) {
  const { badges, styles } = makeFixtures();
  const delayMs = opts?.delayMs ?? 0;

  const json = async (route: Route, data: unknown, status = 200) => {
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  };

  await page.route("**/badges/allBadges", async (route: Route) => {
    await json(route, badges);
  });

  await page.route("**/badges/styles", async (route: Route) => {
    await json(route, styles);
  });

  await page.route("**/badges", async (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await json(route, { badgeId: "b_new" }, 201);
  });

  await page.route("**/badges/*", async (route: Route) => {
    const req = route.request();
    const url = req.url();

    if (req.method() === "DELETE" && /\/badges\/[^/]+$/.test(url)) {
      await json(route, { message: "deleted" }, 200);
      return;
    }

    if (req.method() === "PUT" && /\/badges\/[^/]+$/.test(url)) {
      await json(route, { message: "updated" }, 200);
      return;
    }

    return route.fallback();
  });

  await page.route("**/badges/*/upload-image", async (route: Route) => {
    if (route.request().method() !== "POST") return route.fallback();
    await json(route, {
      message: "uploaded",
      badgeId: "b_new",
      imageUrl: "/images/badge/upload.png",
    });
  });

  // Ignore image requests to avoid loading real assets
  await page.route("**/*.{png,jpg,jpeg,webp,svg}", async (route: Route) => {
    await route.fulfill({ status: 200, body: "" });
  });
}

async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);

  await page.fill('input[placeholder="Enter your username"]', TEST_USER.username);
  await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);

  await page.click('button:has-text("Login")');
  await page.waitForURL(`${BASE_URL}/admin/dashboard`, { timeout: 15_000 });
}

async function assertBadgesPageLoaded(page: Page) {
  await page.waitForTimeout(300);
  await expect(
    page.getByRole("heading", { name: "Badge Management" })
  ).toBeVisible();
}

async function expectCreateModalOpen(page: Page) {
  await expect(
    page.getByRole("heading", { name: "Create New Badge" })
  ).toBeVisible();
}

test.describe("Admin Badges E2E", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await mockBadgesApi(page);
  });

  test("Badges page loads, grouped by Exhibition, style pill appears next to Delete", async ({ page }) => {
    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    await expect(page.getByRole("heading", { name: "Expo A" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Expo B" })).toBeVisible();

    const alphaCard = page
      .locator(".exhibit-card-manage")
      .filter({ hasText: "Alpha Badge" });
    await expect(alphaCard).toBeVisible();

    const actionsRow = alphaCard.locator(".exhibit-card-actions");
    const deleteBtn = actionsRow.getByRole("button", { name: /Delete/i });
    const stylePill = actionsRow.locator(".style-pill");

    await expect(stylePill).toBeVisible();
    await expect(stylePill).toHaveText(/cute/i);

    const deleteIndex = await deleteBtn.evaluate((el) =>
      Array.from(el.parentElement?.children ?? []).indexOf(el)
    );
    const pillIndex = await stylePill.evaluate((el) =>
      Array.from(el.parentElement?.children ?? []).indexOf(el)
    );

    expect(pillIndex).toBeGreaterThan(deleteIndex);
  });

  test("Click 'Add Badge' inside Expo A -> exhibit auto-selects Expo A first exhibit", async ({ page }) => {
    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    const expoASection = page
      .locator(".exhibition-group")
      .filter({ hasText: "Expo A" });
    await expect(expoASection).toBeVisible();

    await expoASection
      .getByRole("button", { name: /Add Badge/i })
      .click();
    await expectCreateModalOpen(page);

    const exhibitSelect = page.locator("select#exhibitId");
    await expect(exhibitSelect).toBeVisible();

    const selectedText = await exhibitSelect
      .locator("option:checked")
      .textContent();

    expect((selectedText || "").trim()).toBe("A1 Exhibit");
  });

  test("BadgeForm style: can pick existing style; choosing Custom... reveals input", async ({ page }) => {
    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    await page.getByRole("button", { name: /Create New Badge/i }).click();
    await expectCreateModalOpen(page);

    const styleSelect = page.locator("select#styleSelect");
    await expect(styleSelect).toBeVisible();

    await styleSelect.selectOption("vip");
    await expect(styleSelect).toHaveValue("vip");

    await styleSelect.selectOption("__custom__");
    await expect(styleSelect).toHaveValue("__custom__");

    const customInput = page.getByPlaceholder("Type a new style...");
    await expect(customInput).toBeVisible();
    await customInput.fill("legendary");
    await expect(customInput).toHaveValue("legendary");
  });

  test("Create validation: missing fields show error messages", async ({ page }) => {
    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    await page.getByRole("button", { name: /Create New Badge/i }).click();
    await expectCreateModalOpen(page);

    // Required attributes block submit,
    // so we use whitespace to bypass required,
    // then rely on trim() to trigger custom validation
    await page.locator("#name").fill("   ");
    await page.getByRole("button", { name: /Create Badge/i }).click();

    await expect(
      page.getByText("Please enter a badge name.")
    ).toBeVisible();
  });

  test("Save Changes shows loading and disables button to prevent double submit", async ({ page }) => {
    await mockBadgesApi(page, { delayMs: 800 });

    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    const alphaCard = page
      .locator(".exhibit-card-manage")
      .filter({ hasText: "Alpha Badge" });
    await alphaCard.getByRole("button", { name: /Edit/i }).click();

    await expect(page.getByText(/Edit Badge:/i)).toBeVisible();

    await page.locator("#name").fill("Alpha Badge Updated");

    await page.getByRole("button", { name: /Save Changes/i }).click();
    await expect(
      page.getByRole("button", { name: /Saving.../i })
    ).toBeDisabled();
  });

  test("Create shows loading and disables Create button (prevents double create)", async ({ page }) => {
    await mockBadgesApi(page, { delayMs: 800 });

    await page.goto(BADGES_URL);
    await assertBadgesPageLoaded(page);

    await page.getByRole("button", { name: /Create New Badge/i }).click();
    await expectCreateModalOpen(page);

    await page.locator("#name").fill("Created Badge");
    await page.locator("#description").fill("Created by test");

    // No file system usage:
    // directly use a Buffer (required by Playwright)
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+1b3cAAAAASUVORK5CYII=";

    await page.setInputFiles("#badgeImage", {
      name: "badge.png",
      mimeType: "image/png",
      buffer: Buffer.from(pngBase64, "base64"),
    });

    await page.getByRole("button", { name: /Create Badge/i }).click();
    await expect(
      page.getByRole("button", { name: /Creating.../i })
    ).toBeDisabled();
  });
});
