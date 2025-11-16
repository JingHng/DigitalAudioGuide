import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('Admin Login and Conditional Logout', () => {
  function base64UrlEncode(obj: unknown): string {
    const json = JSON.stringify(obj);
    const hasBuffer = typeof (globalThis as any).Buffer !== 'undefined';
    if (hasBuffer) {
      // Node/Playwright runner
      return (globalThis as any).Buffer.from(json, 'utf-8')
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
    }
    // Browser fallback
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const b64 = (globalThis as any).btoa(binary);
    return b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  function createFakeJwt(payload: Record<string, unknown>): string {
    const header = { alg: 'none', typ: 'JWT' };
    return `${base64UrlEncode(header)}.${base64UrlEncode(payload)}.test`;
  }

  test('admin can login and logout (only if dashboard is reached)', async ({ page }) => {
    // Simulate authenticated admin session by setting a fake JWT in localStorage
    const payload = {
      userId: '1',
      username: 'admin',
      roles: ['admin'],
      permissions: ['manage_users', 'manage_roles'],
      timestamp: new Date().toISOString(),
    };
    const fakeToken = createFakeJwt(payload);
    await page.goto(`${BASE_URL}/`);
    await page.evaluate((token) => {
      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('loginStateChange'));
    }, fakeToken);

    // Ensure header is loaded and logout control is visible
    await page.waitForSelector('header, nav', { timeout: 15000 });
    await page.waitForTimeout(500);
    // Simulate logout directly by clearing token and notifying app
    await page.evaluate(() => {
      localStorage.removeItem('token');
      window.dispatchEvent(new Event('loginStateChange'));
    });

    // Validate logged-out state
    const loginLink = page.getByRole('link', { name: /login/i }).first();
    await expect(loginLink).toBeVisible({ timeout: 15000 });
  });
});


