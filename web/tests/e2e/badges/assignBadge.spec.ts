import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';
const FRONTEND_URL = 'http://localhost:5173';

const EXHIBIT_ID = 30;

const TEST_USER = {
  username: 'admin',
  password: 'admin123',
};

// Minimal exhibit mock so that ExhibitDetails can render
const mockExhibit = {
  exhibitId: EXHIBIT_ID,
  title: 'Test Exhibit',
  description: 'This is a test exhibit for badge behavior.',
  images: [],
  audio: [],
};

const exhibitUrlPattern = `**/api/exhibits/${EXHIBIT_ID}`;
const badgeUrlRegex = new RegExp(`/badges/assignBadges/${EXHIBIT_ID}$`);

test.describe('ExhibitDetails badge behaviour', () => {
  // Login before each test so user is authenticated
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/login`);

    await page
      .getByPlaceholder('Enter your username')
      .fill(TEST_USER.username);

    await page
      .getByPlaceholder('Enter your password')
      .fill(TEST_USER.password);

    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for redirect to dashboard (wildcard avoids hard-coding host)
    await page.waitForURL('**/admin/dashboard', { timeout: 20_000 });
  });

  test('shows badge modal when a new badge is earned on scroll', async ({ page }) => {
    test.setTimeout(90000); // Increase timeout for flaky test
    
    // Mock exhibit details
    await page.route(exhibitUrlPattern, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExhibit),
      });
    });

    // Mock badge assignment as "newly claimed"
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

    // Go directly to exhibit details (user is already logged in)
    await page.goto(`${FRONTEND_URL}/exhibit/${EXHIBIT_ID}`);

    await expect(
      page.getByRole('heading', { name: mockExhibit.title })
    ).toBeVisible();

    // Ensure there is enough page height to trigger "scroll to bottom" logic
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      filler.setAttribute('data-test-id', 'scroll-filler');
      document.body.appendChild(filler);
    });

    // Scroll to bottom and wait until the badge request is sent
    await Promise.all([
      page.waitForRequest(req =>
        badgeUrlRegex.test(req.url()) && req.method() === 'POST',
        { timeout: 30000 }
      ),
      page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      }),
    ]);

    // Assert badge modal UI with increased timeout
    const overlay = page.locator('.earn-badge-modal-overlay');
    await expect(overlay).toBeVisible({ timeout: 10000 });

    const modal = overlay.locator('.earn-badge-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });

    await expect(modal.getByText('Badge unlocked!')).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText(/"Test Exhibit"/)).toBeVisible();

    const badgeImg = modal.locator('img.earn-badge-image');
    await expect(badgeImg).toBeVisible();
    await expect(badgeImg).toHaveAttribute('alt', 'Test Exhibit badge');

    const closeButton = modal.getByRole('button', {
      name: 'Keep exploring',
    });
    await expect(closeButton).toBeVisible();

    await closeButton.click();
    await expect(overlay).toBeHidden();
  });

  test('does NOT show badge modal when badge is already claimed', async ({ page }) => {
    // Mock exhibit details
    await page.route(exhibitUrlPattern, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExhibit),
      });
    });

    // Mock badge assignment as "already claimed"
    await page.route(badgeUrlRegex, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Badge already claimed',
          badgeId: 'badge-1',
          image_url: '/badges/badge-1.png',
        }),
      });
    });

    await page.goto(`${FRONTEND_URL}/exhibit/${EXHIBIT_ID}`);

    await expect(
      page.getByRole('heading', { name: mockExhibit.title })
    ).toBeVisible();

    // Ensure there is enough page height
    await page.evaluate(() => {
      const filler = document.createElement('div');
      filler.style.height = '2000px';
      filler.setAttribute('data-test-id', 'scroll-filler');
      document.body.appendChild(filler);
    });

    // Scroll to bottom and wait for the "already claimed" request
    await Promise.all([
      page.waitForRequest(req =>
        badgeUrlRegex.test(req.url()) && req.method() === 'POST'
      ),
      page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      }),
    ]);

    // The badge has already been claimed, so the modal should not appear
    const overlay = page.locator('.earn-badge-modal-overlay');
    await expect(overlay).toHaveCount(0);
    // or: await expect(overlay).toBeHidden();
  });
});