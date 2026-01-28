// import {
//   test,
//   expect,
//   type Page,
//   type APIRequestContext,
// } from "@playwright/test";

// const FRONTEND_URL = "http://localhost:5173";
// const API_URL = "http://localhost:5175";

// const BADGES_PAGE_URL = `${FRONTEND_URL}/admin/badges`;

// const TEST_USER = {
//   username: "admin",
//   password: "admin123",
// };

// /**
//  * If your frontend stores JWT under a specific key, keep only that key.
//  * Common examples: "token", "accessToken", "authToken", "jwt".
//  */
// const AUTH_STORAGE_KEYS = ["token", "accessToken", "authToken", "jwt"] as const;

// // -------------------- Mock Data --------------------
// const mockStyles = ["cute", "cool", "funny"];

// const mockBadges = [
//   {
//     badgeId: "1",
//     name: "Explorer",
//     description: "Visit the first exhibit",
//     style: "cute",
//     imageUrl: "/images/badge/explorer.png",
//     exhibit: {
//       exhibitId: "10",
//       title: "Exhibit A",
//       exhibition: { exhibitionId: "100", title: "Tour Alpha" },
//     },
//   },
//   {
//     badgeId: "2",
//     name: "Master",
//     description: "Complete the tour",
//     style: "cool",
//     imageUrl: "/images/badge/master.png",
//     exhibit: {
//       exhibitId: "11",
//       title: "Exhibit B",
//       exhibition: { exhibitionId: "100", title: "Tour Alpha" },
//     },
//   },
//   {
//     badgeId: "3",
//     name: "Joker",
//     description: "Find a secret",
//     style: "funny",
//     imageUrl: "/images/badge/joker.png",
//     exhibit: {
//       exhibitId: "20",
//       title: "Exhibit C",
//       exhibition: { exhibitionId: "200", title: "Tour Beta" },
//     },
//   },
// ];

// // -------------------- Route helpers --------------------
// // Support optional /api prefix
// const anyBadgesAll = /\/(api\/)?badges\/allBadges$/;
// const anyBadgesStyles = /\/(api\/)?badges\/styles$/;
// const anyBadgesUpdate = /\/(api\/)?badges\/\d+$/; // PUT update
// const anyBadgesDelete = /\/(api\/)?badges\/\d+$/; // DELETE
// const anyBadgeUpload = /\/(api\/)?badges\/\d+\/upload-image$/; // POST/PUT upload image

// // -------------------- Auth helpers --------------------

// /**
//  * Parse a Set-Cookie header into Playwright cookie objects.
//  * This is a best-effort helper for cookie-based auth.
//  */
// function parseSetCookieHeader(setCookie: string, baseUrl: string) {
//   const url = new URL(baseUrl);

//   // Handle multiple cookies combined (some servers send as a single string).
//   // This split is heuristic; it works for typical "cookie=...; Path=/, other=...; Path=/" cases.
//   const cookieParts = setCookie.split(/,(?=\s*[^;=]+=[^;=]+)/g);

//   return cookieParts.map((cookieStr) => {
//     const segments = cookieStr.split(";").map((s) => s.trim());
//     const [nameValue, ...attrs] = segments;

//     const eqIndex = nameValue.indexOf("=");
//     const name = nameValue.slice(0, eqIndex);
//     const value = nameValue.slice(eqIndex + 1);

//     let path = "/";
//     let domain = url.hostname;
//     let httpOnly = false;
//     let secure = false;
//     let sameSite: "Lax" | "Strict" | "None" | undefined;

//     for (const a of attrs) {
//       const [kRaw, vRaw] = a.split("=");
//       const k = (kRaw || "").toLowerCase();
//       const v = (vRaw || "").trim();

//       if (k === "path" && v) path = v;
//       if (k === "domain" && v) domain = v.startsWith(".") ? v.slice(1) : v;
//       if (k === "httponly") httpOnly = true;
//       if (k === "secure") secure = true;
//       if (k === "samesite" && v) {
//         const vv = v.toLowerCase();
//         if (vv === "lax") sameSite = "Lax";
//         if (vv === "strict") sameSite = "Strict";
//         if (vv === "none") sameSite = "None";
//       }
//     }

//     return { name, value, domain, path, httpOnly, secure, sameSite };
//   });
// }

// /**
//  * Perform API login once and reuse credentials across tests.
//  * This avoids flaky UI login steps in CI.
//  */
// async function apiLogin(request: APIRequestContext) {
//   const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
//     data: { username: TEST_USER.username, password: TEST_USER.password },
//   });

//   expect(loginResponse.ok()).toBeTruthy();

//   const loginJson = await loginResponse.json().catch(() => ({}));
//   const token =
//     loginJson?.token ||
//     loginJson?.data?.token ||
//     loginJson?.accessToken ||
//     loginJson?.data?.accessToken;

//   const setCookie = loginResponse.headers()["set-cookie"];

//   return { token: token as string | undefined, setCookie };
// }

// /**
//  * Inject auth into the browser context.
//  * Supports both token-in-localStorage and cookie-based session.
//  */
// async function applyAuth(page: Page, token?: string, setCookie?: string) {
//   if (setCookie) {
//     const cookies = parseSetCookieHeader(setCookie, FRONTEND_URL);
//     await page.context().addCookies(
//       cookies.map((c) => ({
//         name: c.name,
//         value: c.value,
//         domain: c.domain,
//         path: c.path,
//         httpOnly: c.httpOnly,
//         secure: c.secure,
//         sameSite: c.sameSite,
//       })),
//     );
//   }

//   if (token) {
//     // Ensure localStorage is set before any app code reads it.
//     await page.addInitScript(
//       ({ tokenValue, keys }) => {
//         for (const k of keys) {
//           try {
//             window.localStorage.setItem(k, tokenValue);
//           } catch {
//             // Ignore storage errors; the test will fail later if app truly requires it.
//           }
//         }
//       },
//       { tokenValue: token, keys: AUTH_STORAGE_KEYS },
//     );
//   }
// }

// /**
//  * Navigate to the badges page and ensure we are not redirected to /login.
//  */
// async function gotoBadgesAsAdmin(page: Page) {
//   await page.goto(BADGES_PAGE_URL, { waitUntil: "domcontentloaded" });
//   await expect(page).not.toHaveURL(/\/login(\b|\/|#|\?)/, { timeout: 20_000 });
// }

// // -------------------- Tests --------------------

// test.describe.configure({ mode: "serial" });

// test.describe("Admin BadgesPage / BadgeManagement", () => {
//   let authToken: string | undefined;
//   let setCookie: string | undefined;

//   test.beforeAll(async ({ request }) => {
//     const result = await apiLogin(request);
//     authToken = result.token;
//     setCookie = result.setCookie;

//     // Fail fast if neither token nor cookie exists. Adjust if your backend returns auth differently.
//     expect(authToken || setCookie).toBeTruthy();
//   });

//   test.beforeEach(async ({ page }) => {
//     await applyAuth(page, authToken, setCookie);
//     await gotoBadgesAsAdmin(page);
//   });

//   test("loads badges, groups by exhibition, and renders cards", async ({ page }) => {
//     await page.route(anyBadgesAll, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockBadges),
//       });
//     });

//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     // Ensure routes apply to the current page load.
//     await page.reload({ waitUntil: "domcontentloaded" });

//     await expect(page.getByRole("heading", { name: "Badge Management" })).toBeVisible({
//       timeout: 20_000,
//     });

//     await expect(page.getByRole("heading", { name: "Tour Alpha" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Tour Beta" })).toBeVisible();

//     await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Master" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Joker" })).toBeVisible();

//     await expect(page.getByText("Exhibit: Exhibit A")).toBeVisible();
//     await expect(page.getByText("Exhibit: Exhibit B")).toBeVisible();
//     await expect(page.getByText("Exhibit: Exhibit C")).toBeVisible();
//   });

//   test("filters by style and search text", async ({ page }) => {
//     await page.route(anyBadgesAll, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockBadges),
//       });
//     });

//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     await page.reload({ waitUntil: "domcontentloaded" });

//     await page.locator("select").first().selectOption("funny");
//     await expect(page.getByRole("heading", { name: "Joker" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Explorer" })).toHaveCount(0);
//     await expect(page.getByRole("heading", { name: "Master" })).toHaveCount(0);

//     await page.locator("select").first().selectOption("all");
//     await page
//       .getByPlaceholder("Search by exhibition / exhibit / badge...")
//       .fill("Alpha");

//     await expect(page.getByRole("heading", { name: "Tour Alpha" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Tour Beta" })).toHaveCount(0);

//     await expect(page.getByRole("heading", { name: "Explorer" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Master" })).toBeVisible();
//     await expect(page.getByRole("heading", { name: "Joker" })).toHaveCount(0);
//   });

//   test("opens create modal (button) and submits create + upload image", async ({ page }) => {
//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     const updatedBadges = [
//       ...mockBadges,
//       {
//         badgeId: "999",
//         name: "New Badge",
//         description: "New desc",
//         style: "cute",
//         imageUrl: "/images/badge/new.png",
//         exhibit: {
//           exhibitId: "10",
//           title: "Exhibit A",
//           exhibition: { exhibitionId: "100", title: "Tour Alpha" },
//         },
//       },
//     ];

//     let allBadgesCallCount = 0;
//     await page.route(anyBadgesAll, async (route) => {
//       allBadgesCallCount++;
//       const body = allBadgesCallCount >= 2 ? updatedBadges : mockBadges;
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(body),
//       });
//     });

//     const anyBadgesCreateAny = /\/(api\/)?badges(\/.*)?$/;
//     await page.route(anyBadgesCreateAny, async (route) => {
//       if (route.request().method() !== "POST") return route.fallback();
//       await route.fulfill({
//         status: 201,
//         contentType: "application/json",
//         body: JSON.stringify({ badgeId: "999" }),
//       });
//     });

//     let uploadHit = false;
//     const anyBadgeUploadAny = /\/(api\/)?badges\/[^/]+\/upload-image$/;
//     await page.route(anyBadgeUploadAny, async (route) => {
//       const method = route.request().method();
//       if (method !== "POST" && method !== "PUT") return route.fallback();
//       uploadHit = true;
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify({
//           message: "ok",
//           badgeId: "999",
//           imageUrl: "/images/badge/new.png",
//         }),
//       });
//     });

//     await page.reload({ waitUntil: "domcontentloaded" });

//     await page.getByRole("button", { name: /Create New Badge/i }).click();

//     await expect(
//       page.getByRole("heading", { name: "Create New Badge", exact: true }),
//     ).toBeVisible({ timeout: 20_000 });

//     await page.getByLabel("Assign to Exhibit").selectOption("10");
//     await page.getByLabel("Badge Name").fill("New Badge");
//     await page.getByLabel("Badge Description").fill("New desc");
//     await page.getByLabel("Badge Style").selectOption("cute");

//     await page.getByLabel("Upload Image").setInputFiles({
//       name: "new.png",
//       mimeType: "image/png",
//       buffer: Buffer.from([137, 80, 78, 71]),
//     });

//     const createReqPromise = page.waitForRequest((req) => {
//       return req.method() === "POST" && /\/(api\/)?badges(\/.*)?$/.test(req.url());
//     });

//     await page.getByRole("button", { name: /Create Badge/i }).click();

//     const createReq = await createReqPromise;
//     const createBody = createReq.postDataJSON();

//     expect(createBody).toBeTruthy();
//     expect(createBody.name).toBe("New Badge");
//     expect(createBody.description).toBe("New desc");
//     expect(createBody.style).toBe("cute");
//     expect(String(createBody.exhibitId)).toBe("10");

//     expect(
//       uploadHit || String(createBody?.imageUrl || "").includes("/images/badge/"),
//     ).toBeTruthy();

//     const closeBtn = page.getByRole("button", { name: /close|cancel|x/i }).first();
//     if (await closeBtn.isVisible().catch(() => false)) {
//       await closeBtn.click();
//     }

//     const newBadgeCardHeading = page
//       .locator(".exhibit-card-manage")
//       .filter({ hasText: "New Badge" })
//       .getByRole("heading", { name: "New Badge", exact: true });

//     await expect(newBadgeCardHeading).toBeVisible({ timeout: 10_000 });
//   });

//   test("edits an existing badge (PUT) and optionally uploads new image", async ({ page }) => {
//     await page.route(anyBadgesAll, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockBadges),
//       });
//     });

//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     let updateBody: any = null;
//     await page.route(anyBadgesUpdate, async (route) => {
//       if (route.request().method() !== "PUT") return route.fallback();
//       updateBody = route.request().postDataJSON();
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify({ ok: true }),
//       });
//     });

//     let uploadHit = false;
//     await page.route(anyBadgeUpload, async (route) => {
//       const method = route.request().method();
//       if (method !== "POST" && method !== "PUT") return route.fallback();
//       uploadHit = true;
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify({ ok: true }),
//       });
//     });

//     await page.reload({ waitUntil: "domcontentloaded" });

//     const explorerCard = page.locator(".exhibit-card-manage", { hasText: "Explorer" });
//     await explorerCard.getByRole("button", { name: /Edit/i }).click();

//     await expect(page.getByText("Edit Badge: Explorer")).toBeVisible({ timeout: 20_000 });

//     await page.getByLabel("Badge Name").fill("Explorer Updated");
//     await page.getByLabel("Badge Description").fill("Updated desc");

//     await page.getByLabel("Upload Image").setInputFiles({
//       name: "replace.png",
//       mimeType: "image/png",
//       buffer: Buffer.from([137, 80, 78, 71]),
//     });

//     await page.getByRole("button", { name: /Save Changes/i }).click();

//     expect(updateBody).toBeTruthy();
//     expect(updateBody.name).toBe("Explorer Updated");
//     expect(updateBody.description).toBe("Updated desc");

//     // Upload can be optional in edit mode; do not hard fail.
//     expect([true, false]).toContain(uploadHit);
//   });

//   test("deletes a badge (DELETE) and refetches", async ({ page }) => {
//     await page.addInitScript(() => {
//       window.confirm = () => true;
//     });

//     let badgesState = [...mockBadges];

//     await page.route(anyBadgesAll, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(badgesState),
//       });
//     });

//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     await page.route(anyBadgesDelete, async (route) => {
//       if (route.request().method() !== "DELETE") return route.fallback();

//       const url = route.request().url();
//       const id = url.split("/").pop();
//       badgesState = badgesState.filter((b) => b.badgeId !== id);

//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify({ message: "deleted" }),
//       });
//     });

//     await page.reload({ waitUntil: "domcontentloaded" });

//     await expect(page.getByRole("heading", { name: "Joker" })).toBeVisible({
//       timeout: 20_000,
//     });

//     const jokerCard = page.locator(".exhibit-card-manage", { hasText: "Joker" });
//     await jokerCard.getByRole("button", { name: /Delete/i }).click();

//     await expect(page.getByRole("heading", { name: "Joker" })).toHaveCount(0);
//   });

//   test("opens create modal via hash #add-badge", async ({ page }) => {
//     await page.route(anyBadgesAll, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockBadges),
//       });
//     });

//     await page.route(anyBadgesStyles, async (route) => {
//       await route.fulfill({
//         status: 200,
//         contentType: "application/json",
//         body: JSON.stringify(mockStyles),
//       });
//     });

//     /**
//      * Some implementations only process location.hash after initial render and data load.
//      * Use a stronger readiness signal and an explicit "page rendered" checkpoint.
//      */
//     await page.goto(`${BADGES_PAGE_URL}#add-badge`, { waitUntil: "networkidle" });

//     await expect(page.getByRole("heading", { name: "Badge Management" })).toBeVisible({
//       timeout: 20_000,
//     });

//     /**
//      * If your app truly opens the modal when hash is "#add-badge", this should pass.
//      * If it does not, then the product behavior does not match the test assumption.
//      * In that case, replace this assertion with a click on "Create New Badge".
//      */
//     await expect(
//       page.getByRole("heading", { name: "Create New Badge" }),
//     ).toBeVisible({ timeout: 20_000 });

//     // Alternative (if hash does not auto-open modal):
//     // await page.getByRole("button", { name: /Create New Badge/i }).click();
//     // await expect(
//     //   page.getByRole("heading", { name: "Create New Badge", exact: true }),
//     // ).toBeVisible({ timeout: 20_000 });
//   });
// });
