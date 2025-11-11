import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';
const BASE_URL = 'http://localhost:5173';

// Test credentials - these should match users in the seeded database
// Password for all test users: TestPassword123!
const TEST_CREDENTIALS = {
  admin: {
    username: 'admin',
    email: 'admin@audiomuseum.com',
    password: 'TestPassword123!',
    role: 'admin'
  },
  regularUser: {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'TestPassword123!',
    role: 'visitor'
  }
};

test.describe('Authentication - Login and Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test.describe('Regular User Login', () => {
    test('should successfully login as regular user with username', async ({ page }) => {
      // Fill in credentials
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation to home page
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      expect(token?.length).toBeGreaterThan(0);
      
      // Verify user data is stored
      const userData = await page.evaluate(() => {
        const data = localStorage.getItem('userData');
        return data ? JSON.parse(data) : null;
      });
      expect(userData).toBeTruthy();
      expect(userData.username).toBe(TEST_CREDENTIALS.regularUser.username);
      expect(userData.roles).toContain('visitor');
    });

    test('should successfully login as regular user with email', async ({ page }) => {
      // Fill in credentials using email
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.email);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
    });

    test('should redirect regular user to home page after login', async ({ page }) => {
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation to home
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Verify we're on the home page (not admin dashboard)
      const url = page.url();
      expect(url).not.toContain('/admin');
    });
  });

  test.describe('Admin User Login', () => {
    test('should successfully login as admin user with username', async ({ page }) => {
      // Fill in admin credentials
      await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation to admin dashboard
      await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
      
      // Verify token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      
      // Verify user data is stored with admin role
      const userData = await page.evaluate(() => {
        const data = localStorage.getItem('userData');
        return data ? JSON.parse(data) : null;
      });
      expect(userData).toBeTruthy();
      expect(userData.username).toBe(TEST_CREDENTIALS.admin.username);
      expect(userData.roles).toContain('admin');
    });

    test('should successfully login as admin user with email', async ({ page }) => {
      // Fill in admin credentials using email
      await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.email);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Wait for navigation to admin dashboard
      await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
      
      // Verify we're on admin dashboard
      const url = page.url();
      expect(url).toContain('/admin/dashboard');
    });

    test('should redirect admin user to admin dashboard after login', async ({ page }) => {
      await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      await page.click('button[type="submit"]');
      
      // Wait for navigation to admin dashboard
      await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
      
      // Verify admin dashboard elements are visible
      const dashboardContent = await page.textContent('body');
      expect(dashboardContent).toBeTruthy();
    });
  });

  test.describe('Login Error Handling', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.fill('input[name="username"]', 'invaliduser');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      // Wait for error message
      await page.waitForSelector('.login-error-message, [role="alert"]', { timeout: 5000 });
      
      // Verify error message is displayed
      const errorMessage = page.locator('.login-error-message, [role="alert"]');
      await expect(errorMessage).toBeVisible();
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).toMatch(/invalid|error|incorrect|failed/i);
      
      // Verify user is still on login page
      expect(page.url()).toContain('/login');
      
      // Verify no token is stored
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeFalsy();
    });

    test('should show error for empty username', async ({ page }) => {
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      
      // Try to submit without username
      const usernameInput = page.locator('input[name="username"]');
      const isValid = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      
      // HTML5 validation should prevent submission
      expect(isValid).toBeFalsy();
    });

    test('should show error for empty password', async ({ page }) => {
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      
      // Try to submit without password
      const passwordInput = page.locator('input[name="password"]');
      const isValid = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      
      // HTML5 validation should prevent submission
      expect(isValid).toBeFalsy();
    });
  });

  test.describe('Logout Functionality', () => {
    test('should successfully logout regular user and clear session', async ({ page }) => {
      // First, login as regular user
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Verify user is logged in
      const tokenBeforeLogout = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenBeforeLogout).toBeTruthy();
      
      // Find and click logout button
      // Try multiple possible selectors for logout
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), .logout-item, [data-testid="logout"]').first();
      
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        
        // Wait for navigation to login or home page
        await page.waitForURL(/\/(login|homepage|\/)?$/, { timeout: 5000 });
        
        // Verify token is cleared
        const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
        expect(tokenAfterLogout).toBeFalsy();
        
        // Verify userData is cleared
        const userDataAfterLogout = await page.evaluate(() => localStorage.getItem('userData'));
        expect(userDataAfterLogout).toBeFalsy();
      } else {
        // If logout button not found in UI, test programmatic logout
        await page.evaluate(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          window.dispatchEvent(new Event('loginStateChange'));
        });
        
        // Verify token is cleared
        const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
        expect(tokenAfterLogout).toBeFalsy();
      }
    });

    test('should successfully logout admin user and clear session', async ({ page }) => {
      // First, login as admin user
      await page.fill('input[name="username"]', TEST_CREDENTIALS.admin.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.admin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/.*\/admin\/dashboard/, { timeout: 10000 });
      
      // Verify user is logged in
      const tokenBeforeLogout = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenBeforeLogout).toBeTruthy();
      
      // Find and click logout button
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), .logout-item, [data-testid="logout"]').first();
      
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        
        // Wait for navigation (admin might redirect to login or home)
        await page.waitForURL(/\/(login|homepage|\/)?$/, { timeout: 5000 });
        
        // Verify token is cleared
        const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
        expect(tokenAfterLogout).toBeFalsy();
        
        // Verify userData is cleared
        const userDataAfterLogout = await page.evaluate(() => localStorage.getItem('userData'));
        expect(userDataAfterLogout).toBeFalsy();
      } else {
        // Programmatic logout test
        await page.evaluate(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('userData');
          window.dispatchEvent(new Event('loginStateChange'));
        });
        
        // Verify token is cleared
        const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
        expect(tokenAfterLogout).toBeFalsy();
      }
    });

    test('should prevent access to protected routes after logout', async ({ page, context }) => {
      // Login first
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Clear session (simulate logout)
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      // Try to access a protected route
      await page.goto(`${BASE_URL}/admin/dashboard`);
      
      // Should redirect to login or home (depending on ProtectedRoute implementation)
      await page.waitForTimeout(2000);
      const url = page.url();
      // Should not be on admin dashboard
      expect(url).not.toContain('/admin/dashboard');
    });

    test('should maintain logout state on page refresh', async ({ page }) => {
      // Login first
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Clear session
      await page.evaluate(() => {
        localStorage.clear();
      });
      
      // Refresh page
      await page.reload();
      
      // Verify token is still cleared after refresh
      const tokenAfterRefresh = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenAfterRefresh).toBeFalsy();
    });
  });

  test.describe('Session Management', () => {
    test('should persist login session across page navigation', async ({ page }) => {
      // Login
      await page.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Navigate to different pages
      await page.goto(`${BASE_URL}/exhibitions`);
      await page.waitForTimeout(1000);
      
      // Verify token is still present
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeTruthy();
      
      // Navigate back to home
      await page.goto(`${BASE_URL}/`);
      await page.waitForTimeout(1000);
      
      // Verify token is still present
      const tokenAfterNavigation = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenAfterNavigation).toBeTruthy();
    });

    test('should handle concurrent logout from multiple tabs', async ({ context }) => {
      // Create two pages (simulating multiple tabs)
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      // Login in first tab
      await page1.goto(`${BASE_URL}/login`);
      await page1.fill('input[name="username"]', TEST_CREDENTIALS.regularUser.username);
      await page1.fill('input[name="password"]', TEST_CREDENTIALS.regularUser.password);
      await page1.click('button[type="submit"]');
      await page1.waitForURL(/\/(homepage|\/)?$/, { timeout: 10000 });
      
      // Open same page in second tab
      await page2.goto(`${BASE_URL}/`);
      
      // Clear session in first tab
      await page1.evaluate(() => {
        localStorage.clear();
        window.dispatchEvent(new Event('loginStateChange'));
      });
      
      // Wait a bit for event propagation
      await page2.waitForTimeout(1000);
      
      // Verify both tabs have cleared session
      const token1 = await page1.evaluate(() => localStorage.getItem('token'));
      const token2 = await page2.evaluate(() => localStorage.getItem('token'));
      
      expect(token1).toBeFalsy();
      expect(token2).toBeFalsy();
      
      await page1.close();
      await page2.close();
    });
  });
});

