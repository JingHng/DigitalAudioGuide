import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';
const BASE_URL = 'http://localhost:5173';

test.describe('User Login Flow', () => {
  // Test user credentials (should match a user in your test database)
  // Password for all test users: TestPassword123!
  const testUser = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'TestPassword123!'
  };
  
  const adminUser = {
    username: 'admin',
    email: 'admin@audiomuseum.com',
    password: 'TestPassword123!'
  };

  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto(`${BASE_URL}/login`);
    // Wait for the page to load
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('should display login page with all required fields', async ({ page }) => {
    // Check that login form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check for username/email input
    const usernameInput = page.locator('input[name="username"], input[type="text"]').first();
    await expect(usernameInput).toBeVisible();
    
    // Check for password input
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
    
    // Check for login button
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    await expect(loginButton).toContainText('Login');
    
    // Check for "Forgot Password" link
    const forgotPasswordLink = page.locator('a:has-text("Forgot Password"), a[href="/forgot-password"]');
    await expect(forgotPasswordLink).toBeVisible();
    
    // Check for "Register" link
    const registerLink = page.locator('a:has-text("Register"), a[href="/register"]');
    await expect(registerLink).toBeVisible();
  });

  test('should show error message for empty form submission', async ({ page }) => {
    // Try to submit empty form
    const loginButton = page.locator('button[type="submit"]');
    await loginButton.click();
    
    // Check for HTML5 validation error or error message
    const usernameInput = page.locator('input[name="username"]').first();
    const passwordInput = page.locator('input[name="password"]').first();
    
    // Check if HTML5 validation is triggered
    const usernameValid = await usernameInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    const passwordValid = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    
    // At least one field should be invalid
    expect(usernameValid || passwordValid).toBeFalsy();
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[name="username"]', 'invaliduser');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message to appear
    await page.waitForSelector('.login-error-message, [role="alert"]', { timeout: 5000 });
    
    // Check that error message is displayed
    const errorMessage = page.locator('.login-error-message, [role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid|error|incorrect|failed/i);
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in valid credentials
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation or success indicator
    // After successful login, user should be redirected to homepage or dashboard
    await page.waitForURL(/\/(homepage|dashboard|\/)?$/, { timeout: 10000 });
    
    // Check that user is logged in by verifying token in localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    // Check that user data is stored
    const userData = await page.evaluate(() => localStorage.getItem('userData'));
    expect(userData).toBeTruthy();
  });

  test('should toggle password visibility', async ({ page }) => {
    // Fill in password
    await page.fill('input[name="password"]', 'testpassword');
    
    // Check initial password input type
    const passwordInput = page.locator('input[name="password"]').first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    // Click password toggle button
    const toggleButton = page.locator('.password-toggle-btn, button[aria-label*="password" i]');
    if (await toggleButton.count() > 0) {
      await toggleButton.click();
      
      // Check that password input type changed to text
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      // Click again to hide password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Click on "Forgot Password" link
    const forgotPasswordLink = page.locator('a:has-text("Forgot Password"), a[href="/forgot-password"]');
    await forgotPasswordLink.click();
    
    // Wait for navigation to forgot password page
    await page.waitForURL('**/forgot-password', { timeout: 5000 });
    
    // Verify we're on the forgot password page
    expect(page.url()).toContain('/forgot-password');
    
    // Check that forgot password form is visible
    const forgotPasswordForm = page.locator('form');
    await expect(forgotPasswordForm).toBeVisible();
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
  });

  test('should navigate to registration page', async ({ page }) => {
    // Click on "Register" link
    const registerLink = page.locator('a:has-text("Register"), a[href="/register"]');
    await registerLink.click();
    
    // Wait for navigation to registration page
    await page.waitForURL('**/register', { timeout: 5000 });
    
    // Verify we're on the registration page
    expect(page.url()).toContain('/register');
  });

  test('should show email verification message for unverified email', async ({ page }) => {
    // This test assumes you have a user with unverified email in your test database
    // Fill in credentials for unverified user
    await page.fill('input[name="username"]', 'unverified@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message about email verification
    await page.waitForSelector('.login-error-message, .email-verification-section', { timeout: 5000 });
    
    // Check that verification message is displayed
    const verificationSection = page.locator('.email-verification-section, .login-error-message');
    await expect(verificationSection).toBeVisible();
    await expect(verificationSection).toContainText(/verify|verification/i);
  });

  test('should redirect admin users to admin dashboard', async ({ page }) => {
    // Fill in admin credentials
    await page.fill('input[name="username"]', adminUser.username);
    await page.fill('input[name="password"]', adminUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation to admin dashboard
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });
    
    // Verify we're on the admin dashboard
    expect(page.url()).toContain('/admin/dashboard');
    
    // Verify admin user data is stored
    const userData = await page.evaluate(() => {
      const data = localStorage.getItem('userData');
      return data ? JSON.parse(data) : null;
    });
    expect(userData).toBeTruthy();
    expect(userData.roles).toContain('admin');
  });

  test('should update header after successful login', async ({ page }) => {
    // Fill in valid credentials
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL(/\/(homepage|dashboard|\/)?$/, { timeout: 10000 });
    
    // Check that header shows user information
    // Adjust selectors based on your actual header implementation
    const userMenu = page.locator('.user-menu-desktop, .user-menu-mobile, [class*="user"]');
    if (await userMenu.count() > 0) {
      await expect(userMenu).toBeVisible();
      
      // Check that username is displayed
      const usernameDisplay = page.locator('.username, [class*="username"]');
      if (await usernameDisplay.count() > 0) {
        await expect(usernameDisplay).toContainText(testUser.username);
      }
    }
  });

  test('should handle logout functionality', async ({ page }) => {
    // First login
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(homepage|dashboard|\/)?$/, { timeout: 10000 });
    
    // Verify user is logged in
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
    
    // Click logout button (adjust selector based on your implementation)
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), .logout-item');
    if (await logoutButton.count() > 0) {
      await logoutButton.click();
      
      // Wait for navigation to login or homepage
      await page.waitForURL(/\/(login|homepage|\/)?$/, { timeout: 5000 });
      
      // Verify token is cleared
      const tokenAfterLogout = await page.evaluate(() => localStorage.getItem('token'));
      expect(tokenAfterLogout).toBeFalsy();
    }
  });
});

test.describe('Forgot Password Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/forgot-password`);
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('should display forgot password page', async ({ page }) => {
    // Check that form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check for email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText(/send|reset/i);
    
    // Check for back to login link
    const backLink = page.locator('a:has-text("Back to Login"), a[href="/login"]');
    await expect(backLink).toBeVisible();
  });

  test('should show error for invalid email', async ({ page }) => {
    // Fill in invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    
    // Try to submit
    await page.click('button[type="submit"]');
    
    // Check for HTML5 validation error
    const emailInput = page.locator('input[type="email"]');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBeFalsy();
  });

  test('should send reset email for valid email', async ({ page }) => {
    // Fill in valid email
    await page.fill('input[type="email"]', 'test@example.com');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('.success-message, [role="alert"]', { timeout: 5000 });
    
    // Check that success message is displayed
    const successMessage = page.locator('.success-message, [role="alert"]');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(/sent|email|reset/i);
  });

  test('should navigate back to login', async ({ page }) => {
    // Click back to login link
    const backLink = page.locator('a:has-text("Back to Login"), a[href="/login"]');
    await backLink.click();
    
    // Wait for navigation to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    
    // Verify we're on the login page
    expect(page.url()).toContain('/login');
  });
});

test.describe('Reset Password Flow', () => {
  test('should display reset password page with valid token', async ({ page }) => {
    // Navigate to reset password page with token (you'll need a valid token for this test)
    // In a real scenario, you'd get this token from the email
    const resetToken = 'valid-reset-token'; // Replace with actual token from your test setup
    await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);
    
    // Wait for form to load
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Check that form is visible
    await expect(page.locator('form')).toBeVisible();
    
    // Check for new password input
    const newPasswordInput = page.locator('input[name="newPassword"]');
    await expect(newPasswordInput).toBeVisible();
    
    // Check for confirm password input
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    await expect(confirmPasswordInput).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
  });

  test('should show error for missing token', async ({ page }) => {
    // Navigate to reset password page without token
    await page.goto(`${BASE_URL}/reset-password`);
    
    // Wait for error message
    await page.waitForSelector('.login-error-message', { timeout: 5000 });
    
    // Check that error message is displayed
    const errorMessage = page.locator('.login-error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/invalid|expired|token/i);
  });

  test('should show error when passwords do not match', async ({ page }) => {
    const resetToken = 'valid-reset-token'; // Replace with actual token
    await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill in different passwords
    await page.fill('input[name="newPassword"]', 'NewPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForSelector('.login-error-message', { timeout: 5000 });
    
    // Check that error message is displayed
    const errorMessage = page.locator('.login-error-message');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/match|different/i);
  });

  test('should successfully reset password with valid token and matching passwords', async ({ page }) => {
    const resetToken = 'valid-reset-token'; // Replace with actual token
    await page.goto(`${BASE_URL}/reset-password?token=${resetToken}`);
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Fill in matching passwords
    const newPassword = 'NewPassword123!';
    await page.fill('input[name="newPassword"]', newPassword);
    await page.fill('input[name="confirmPassword"]', newPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForSelector('.success-message', { timeout: 5000 });
    
    // Check that success message is displayed
    const successMessage = page.locator('.success-message');
    await expect(successMessage).toBeVisible();
    await expect(successMessage).toContainText(/success|reset/i);
    
    // Wait for redirect to login page
    await page.waitForURL('**/login', { timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});

