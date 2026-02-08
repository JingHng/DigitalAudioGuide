import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

const FRONTEND_URL = "http://localhost:5173";
const API_URL = "http://localhost:5175";

const TEST_USER = {
  userId: "1",
  username: "admin",
  password: "admin123",
  email: "admin@audiomuseum.com",
  roles: ["admin"],
  profilePictureUrl: "/avatars/admin.png",
  firstName: "System",
  lastName: "Admin",
  gender: null as null | string,
};

const AUTH_TOKEN_KEYS = ["token", "accessToken", "authToken", "jwt"] as const;
const AUTH_USER_KEYS = ["user", "currentUser", "authUser"] as const;

function parseSetCookieHeader(setCookie: string, baseUrl: string) {
  const url = new URL(baseUrl);
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

async function apiLogin(request: APIRequestContext) {
  const res = await request.post(`${API_URL}/api/auth/login`, {
    data: { username: TEST_USER.username, password: TEST_USER.password },
  });

  expect(res.ok()).toBeTruthy();

  const json = await res.json().catch(() => ({}));
  const token =
    json?.token ||
    json?.data?.token ||
    json?.accessToken ||
    json?.data?.accessToken;

  const setCookie = res.headers()["set-cookie"];
  return { token: token as string | undefined, setCookie };
}

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

  await page.addInitScript(
    ({ tokenValue, tokenKeys, userKeys, userObj }) => {
      if (tokenValue) {
        for (const k of tokenKeys) {
          try {
            localStorage.setItem(k, tokenValue);
            sessionStorage.setItem(k, tokenValue);
          } catch {}
        }
      }

      for (const k of userKeys) {
        try {
          localStorage.setItem(k, JSON.stringify(userObj));
          sessionStorage.setItem(k, JSON.stringify(userObj));
        } catch {}
      }

      try {
        localStorage.setItem("auth", JSON.stringify({ token: tokenValue, user: userObj }));
      } catch {}
    },
    {
      tokenValue: token ?? "",
      tokenKeys: AUTH_TOKEN_KEYS,
      userKeys: AUTH_USER_KEYS,
      userObj: {
        userId: TEST_USER.userId,
        username: TEST_USER.username,
        email: TEST_USER.email,
        roles: TEST_USER.roles,
      },
    },
  );
}

test.describe("Profile Page (ProfilePage2)", () => {
  let authToken: string | undefined;
  let setCookie: string | undefined;

  test.beforeAll(async ({ request }) => {
    const result = await apiLogin(request);
    authToken = result.token;
    setCookie = result.setCookie;
    expect(authToken || setCookie).toBeTruthy();
  });

  test.beforeEach(async ({ page }) => {
    await applyAuth(page, authToken, setCookie);

    const profileRegex = new RegExp(`/api/auth/profile$`);
    const meRegex = new RegExp(`/api/auth/(me|current|whoami)$`);
    const verifyRegex = new RegExp(`/api/auth/(verify|check|validate)$`);
    const badgesRegex = new RegExp(`/api/badges/userBadges$`);

    await page.route(profileRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: TEST_USER }),
      });
    });

    await page.route(meRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: TEST_USER }),
      });
    });

    await page.route(verifyRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route(badgesRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`${FRONTEND_URL}/profile`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/profile/, { timeout: 10_000 });
    await expect(page.locator(".display-name")).toBeVisible({ timeout: 10_000 });
  });

  test("shows full name + username handle + email + roles", async ({ page }) => {
    await expect(page.locator(".display-name")).toHaveText(
      `${TEST_USER.firstName} ${TEST_USER.lastName}`,
    );
    await expect(page.locator(".username-handle")).toHaveText(`@${TEST_USER.username}`);
    await expect(page.getByText(TEST_USER.email)).toBeVisible();

    await expect(page.locator(".role-chip")).toHaveCount(TEST_USER.roles.length);
    await expect(page.locator(".role-chip")).toContainText(TEST_USER.roles[0]);
  });

  test("navigates to edit profile when Edit button clicked", async ({ page }) => {
    await page.locator(".edit-profile-btn").click();
    await expect(page).toHaveURL(/\/edit-profile$/);
  });

  test("shows no badges message when user has no badges", async ({ page }) => {
    await expect(page.locator(".badges-title")).toHaveText("Your Badges");
    await expect(page.locator(".no-badges-text")).toHaveText(
      "You haven't earned any badges yet.",
    );
    await expect(page.locator(".badge-item")).toHaveCount(0);
  });

  test("shows gender pill when gender exists", async ({ page }) => {
    const profileRegex = new RegExp(`/api/auth/profile$`);

    await page.unroute(profileRegex);
    await page.route(profileRegex, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { ...TEST_USER, gender: "male" } }),
      });
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator(".gender-pill")).toBeVisible({ timeout: 10_000 });
  });
});
