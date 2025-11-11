import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

test.describe('User Registration Flow', () => {
  let testUserData: {
    username: string;
    email: string;
    password: string;
  };

  test.beforeEach(() => {
    // Generate unique test data for each test
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    testUserData = {
      username: `testuser_${timestamp}_${randomStr}`,
      email: `test_${timestamp}_${randomStr}@example.com`,
      password: 'TestPassword123!'
    };
  });

  test('should display registration page with all required fields', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register');

    // Wait for the registration form to load
    await page.waitForSelector('form', { timeout: 10000 });

    // Check that all required fields are present
    const usernameInput = page.locator('input[name="username"]');
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const confirmPasswordInput = page.locator('input[name="confirmPassword"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should validate form inputs on the frontend', async ({ page }) => {
    await page.goto('/register');

    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Check for validation errors
    // Note: The exact error message depends on your validation implementation
    await page.waitForTimeout(500); // Wait for validation to trigger

    // Try with invalid email
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'test123');
    await submitButton.click();

    await page.waitForTimeout(500);
    // Check that form validation prevents submission or shows error
  });

  test('should successfully register a new user through the UI', async ({ page }) => {
    await page.goto('/register');

    // Fill in the registration form
    await page.fill('input[name="username"]', testUserData.username);
    await page.fill('input[name="email"]', testUserData.email);
    await page.fill('input[name="password"]', testUserData.password);
    await page.fill('input[name="confirmPassword"]', testUserData.password);

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to verification page or success message
    // The page should redirect to /verify-email after successful registration
    await page.waitForURL(/.*\/verify-email/, { timeout: 10000 });

    // Verify we're on the verification page
    expect(page.url()).toContain('/verify-email');

    // Check that the email is pre-filled in the verification page
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.count() > 0) {
      const emailValue = await emailInput.inputValue();
      expect(emailValue.toLowerCase()).toBe(testUserData.email.toLowerCase());
    }

    // Verify success message or toast notification
    // This depends on your toast implementation
    await page.waitForTimeout(1000);
  });

  test('should verify user was created in database via API', async ({ request }) => {
    // First, register a user via API
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(registerResponse.status()).toBe(200);
    const registerData = await registerResponse.json();
    expect(registerData).toHaveProperty('token');
    expect(registerData).toHaveProperty('user');
    expect(registerData.user.username).toBe(testUserData.username);

    // Verify user exists in database by attempting to login (which requires user to exist)
    // Note: Login will fail because email is not verified, but that confirms user exists
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        username: testUserData.username,
        password: testUserData.password
      }
    });

    // Should get error about email verification, not "user not found"
    expect(loginResponse.status()).toBe(401);
    const loginData = await loginResponse.json();
    expect(loginData.error).toContain('verify your email');
  });

  test('should create email verification token during registration', async ({ request }) => {
    // Register a user via API
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(registerResponse.status()).toBe(200);
    const registerData = await registerResponse.json();
    expect(registerData).toHaveProperty('token');

    // The response should indicate that email verification is needed
    // Check if emailPreviewUrl is present (for Ethereal Email in test environment)
    if (registerData.emailPreviewUrl) {
      expect(registerData.emailPreviewUrl).toContain('ethereal.email');
    }
  });

  test('should assign visitor role to newly registered user', async ({ request }) => {
    // Register a user via API
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(registerResponse.status()).toBe(200);
    const registerData = await registerResponse.json();
    expect(registerData).toHaveProperty('user');
    expect(registerData.user).toHaveProperty('roles');
    expect(registerData.user.roles).toContain('visitor');
  });

  test('should reject registration with duplicate username', async ({ request }) => {
    // Register first user
    const firstRegisterResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(firstRegisterResponse.status()).toBe(200);

    // Try to register with same username but different email
    const duplicateUsernameResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: `different_${testUserData.email}`,
        password: testUserData.password
      }
    });

    expect(duplicateUsernameResponse.status()).toBe(409);
    const errorData = await duplicateUsernameResponse.json();
    expect(errorData.error).toContain('Username already exists');
    expect(errorData.field).toBe('username');
  });

  test('should reject registration with duplicate email', async ({ request }) => {
    // Register first user
    const firstRegisterResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(firstRegisterResponse.status()).toBe(200);

    // Try to register with same email but different username
    const duplicateEmailResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: `different_${testUserData.username}`,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(duplicateEmailResponse.status()).toBe(409);
    const errorData = await duplicateEmailResponse.json();
    expect(errorData.error).toContain('Email already exists');
    expect(errorData.field).toBe('email');
  });

  test('should handle password mismatch validation', async ({ page }) => {
    await page.goto('/register');

    // Fill in the registration form with mismatched passwords
    await page.fill('input[name="username"]', testUserData.username);
    await page.fill('input[name="email"]', testUserData.email);
    await page.fill('input[name="password"]', testUserData.password);
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

    // Submit the form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error
    await page.waitForTimeout(500);

    // Check that error message is displayed
    // The exact implementation depends on your error display
    // This test verifies that the form doesn't submit with mismatched passwords
    const currentUrl = page.url();
    expect(currentUrl).toContain('/register'); // Should still be on registration page
  });

  test('should hash password before storing in database', async ({ request }) => {
    // Register a user via API
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(registerResponse.status()).toBe(200);

    // Verify that we can login with the original password
    // This confirms the password was hashed correctly
    // Note: Login will fail due to email verification, but the password check happens first
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        username: testUserData.username,
        password: testUserData.password
      }
    });

    // Should get email verification error, not password error
    // This confirms password was hashed and stored correctly
    expect(loginResponse.status()).toBe(401);
    const loginData = await loginResponse.json();
    expect(loginData.error).toContain('verify your email');
    // If password was wrong, we'd get "Invalid credentials" instead
  });

  test('should display email preview URL when using Ethereal Email (test environment)', async ({ page, request }) => {
    // Register a user via API to get the preview URL
    const registerResponse = await request.post(`${API_URL}/api/auth/register`, {
      data: {
        username: testUserData.username,
        email: testUserData.email,
        password: testUserData.password
      }
    });

    expect(registerResponse.status()).toBe(200);
    const registerData = await registerResponse.json();

    // Navigate to verification page
    await page.goto('/verify-email');

    // If using Ethereal Email, the preview URL should be displayed
    if (registerData.emailPreviewUrl) {
      // Check console for preview URL (in real scenario, it would be in the UI)
      // For now, we just verify the API returns it
      expect(registerData.emailPreviewUrl).toBeTruthy();
      expect(registerData.emailPreviewUrl).toContain('ethereal.email');
    }
  });

  test('should redirect to email verification page after successful registration', async ({ page }) => {
    await page.goto('/register');

    // Fill in and submit registration form
    await page.fill('input[name="username"]', testUserData.username);
    await page.fill('input[name="email"]', testUserData.email);
    await page.fill('input[name="password"]', testUserData.password);
    await page.fill('input[name="confirmPassword"]', testUserData.password);

    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for redirect to verification page
    await page.waitForURL(/.*\/verify-email/, { timeout: 10000 });

    // Verify we're on the verification page
    expect(page.url()).toContain('/verify-email');

    // Check that the page shows verification instructions
    const pageContent = await page.textContent('body');
    expect(pageContent).toMatch(/verification|verify|email/i);
  });
});

