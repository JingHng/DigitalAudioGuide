import { test, expect } from "@playwright/test";

const badgeUrlRegex = new RegExp('/badges/assignBadges/1');

// Test account
const TEST_USER = {
  userId: '1',
  username: 'admin',
  password: 'admin123',
  email: 'admin@audiomuseum.com',
  roles: ['admin'],
  profilePictureUrl: '/avatars/admin.png',
  badges: [],
};

// helper function
async function loginAndGetToken(request) {
  const res = await request.post('/api/auth/login', {
    data: {
      username: 'admin',
      password: 'admin123',
    },
  });

  expect(res.ok()).toBeTruthy();

  const body = await res.json();
  return body.token; 
}


test.describe('Profile Page', () => {
  // -----------------------------------
  // Setup: Login before each test & mock badge data
  // -----------------------------------
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    
    await page.fill('input[placeholder="Enter your username"]', TEST_USER.username);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('http://localhost:5173/admin/dashboard', { timeout: 15000 });

    // Assign badge to user
    await page.route(badgeUrlRegex, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Badge claimed successfully',
          badgeId: 'badge-1',
          image_url: '/badges/badge-1.png',
        }),
      });
    });
    
    // Navigate to profile page page
    await page.goto('/profile');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  // -----------------------------------
  // Test 1: Page Layout and Welcome Screen
  // -----------------------------------
  test('should display profile page with greeting and edit profile', async ({ page }) => {
    // Check for greeting message
    const greeting = page.locator('h2');
    await expect(greeting).toBeVisible();
    await expect(greeting).toHaveText(`Welcome, ${TEST_USER.username}!`);
    
    // Check for email container
    await expect(page.locator('.email-container'))
      .toHaveText(TEST_USER.email);
    
    // Check for role container
    await expect(page.locator('.role-container'))
      .toContainText(`Role: ${TEST_USER.roles.join(', ')}`);

  });

  // -----------------------------------
  // Test 2: Navigate to edit profile
  // -----------------------------------
  test('navigates to edit profile page when button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /edit profile/i }).click();
    await expect(page).toHaveURL(/\/edit-profile$/);
  });

  
  // -----------------------------------
  // Test 3: Badges Section Display
  // -----------------------------------
test('shows no badges message when user has no badges', async ({ page }) => {
  // Badges title
  await expect(page.locator('.badges-title'))
    .toHaveText('Your Badges');

  // "No badges" message
  await expect(page.locator('.no-badges-text'))
    .toBeVisible();

  await expect(page.locator('.no-badges-text'))
    .toHaveText("You haven't earned any badges yet.");

  // Ensure no badge items are rendered
  await expect(page.locator('.badge-item'))
    .toHaveCount(0);
});


  // -----------------------------------
  // Test 4: Assigned Badge Display
  // -----------------------------------
  test('profile page shows assigned badge', async ({ page, request }) => {
    await page.route('**/badges/userBadges', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: [
        {
          badgeId: '1',
          badge: {
            name: 'Explorer',
            imageUrl: '/badges/badge-1.png',
          },
        },
      ],
    }),
  });
});

await page.goto('/profile');

// Assert
await expect(page.locator('.badge-item')).toHaveCount(1);
await expect(page.locator('.badge-name')).toHaveText('Explorer');

});

});