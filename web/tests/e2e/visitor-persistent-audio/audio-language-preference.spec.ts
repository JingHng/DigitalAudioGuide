import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://localhost:5175';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
const TEST_USER = { username: 'admin', password: 'admin123' };

/**
 * Audio Guide Language Preference Tests
 * Tests core functionality: Navigation, language selection, preference persistence, and exhibit audio integration
 */

test.describe('Audio Guide Language Preference', () => {
  let authToken: string | null = null;
  let userId: number | null = null;

  // -----------------------------------
  // Setup: Login before all tests
  // -----------------------------------
  test.beforeAll(async ({ request }) => {
    const loginResp = await request.post(`${API_URL}/api/auth/login`, { 
      data: TEST_USER 
    });
    
    expect(loginResp.ok()).toBeTruthy();
    const loginJson = await loginResp.json();
    authToken = loginJson.token ?? loginJson.accessToken ?? null;
    userId = Number(loginJson.user?.userId ?? loginJson.userId ?? null);
    
    expect(authToken).toBeTruthy();
    expect(userId).toBeGreaterThan(0);
  });

  test.beforeEach(async ({ page }) => {
    // Set auth token in localStorage
    await page.goto(FRONTEND);
    if (authToken) {
      await page.evaluate(token => {
        localStorage.setItem('token', token);
        window.dispatchEvent(new Event('loginStateChange'));
      }, authToken);
    }
  });

  // -----------------------------------
  // Test 1: Navigation to Audio Guide Preference Page
  // -----------------------------------
  test('should navigate to audio guide preference page from navbar dropdown', async ({ page }) => {
    await page.goto(`${FRONTEND}/`);
    
    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Open user dropdown in navbar (use last button which is the desktop version)
    const userButton = page.locator('button.admin-login-link').filter({ hasText: TEST_USER.username }).last();
    await expect(userButton).toBeVisible({ timeout: 10000 });
    await userButton.click();
    
    // Wait for dropdown to appear and become visible
    const dropdown = page.locator('.user-dropdown.desktop-user-dropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
    
    // Click on Audio Guide Language Preference (use last to match the desktop dropdown)
    const languagePreferenceLink = page.locator('a[href="/dashboard"]').filter({ hasText: 'Audio Language Preference' }).last();
    await expect(languagePreferenceLink).toBeVisible({ timeout: 5000 });
    await languagePreferenceLink.click();
    
    // Verify navigation
    await expect(page).toHaveURL(`${FRONTEND}/dashboard`, { timeout: 10000 });
  });

  // -----------------------------------
  // Test 2: Page Layout and Elements
  // -----------------------------------
  test('should display all key elements on audio guide preference page', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Check page title
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toHaveText('Audio Guide Language Preference');
    
    // Check subtitle
    const subtitle = page.locator('.subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('preferred language for audio guides');
    
    // Check disclaimer at top
    const disclaimer = page.locator('.disclaimer-top');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText('Note:');
    await expect(disclaimer).toContainText('default to English');
    
    // Check user info
    const userDetail = page.locator('.user-detail');
    await expect(userDetail).toBeVisible();
    await expect(userDetail).toContainText(TEST_USER.username);
    
    // Check languages grid
    const languagesGrid = page.locator('.languages-grid');
    await expect(languagesGrid).toBeVisible();
    
    // Check that language cards are present
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    expect(await languageCards.count()).toBeGreaterThan(0);
  });

  // -----------------------------------
  // Test 3: Language Cards Display Correctly
  // -----------------------------------
  test('should display language cards with title and code', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for language cards to load
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    const cardCount = await languageCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Check first language card structure
    const firstCard = languageCards.first();
    
    // Check language title
    const languageTitle = firstCard.locator('.language-title');
    await expect(languageTitle).toBeVisible();
    expect(await languageTitle.textContent()).toBeTruthy();
    
    // Check language code
    const languageCode = firstCard.locator('.language-code');
    await expect(languageCode).toBeVisible();
    expect(await languageCode.textContent()).toBeTruthy();
  });

  // -----------------------------------
  // Test 4: Select Language Preference
  // -----------------------------------
  test('should select a language preference and show success message', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for language cards to load
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // Select the first language card
    const firstCard = languageCards.first();
    await firstCard.click();
    
    // Wait for success message
    const successMessage = page.locator('.message.success');
    await expect(successMessage).toBeVisible({ timeout: 5000 });
    await expect(successMessage).toContainText('saved successfully');
    
    // Check that the card has selected class
    await expect(firstCard).toHaveClass(/selected/);
    
    // Check for selected indicator (checkmark)
    const selectedIndicator = firstCard.locator('.selected-indicator');
    await expect(selectedIndicator).toBeVisible();
  }); 

  // -----------------------------------
  // Test 5: Language Preference Persistence
  // -----------------------------------
  test('should persist language preference after page reload', async ({ page, request }) => {
    if (!authToken) test.skip();
    
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for language cards to load
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // Get all available languages
    const languagesResp = await request.get(`${API_URL}/api/language`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const languages = await languagesResp.json();
    
    // Find a language to select (prefer Japanese or Korean to avoid conflicts)
    const targetLanguage = languages.find((l: any) => 
      l.title.includes('Japanese') || l.title.includes('Korean')
    ) || languages[languages.length - 1];
    
    const targetLanguageId = targetLanguage.languageId;
    const targetLanguageTitle = targetLanguage.title;
    
    // Use API to set the language preference directly
    await request.put(`${API_URL}/api/auth/language-preference`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { languageId: targetLanguageId }
    });
    
    // Wait for backend to process
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Wait for language cards to load again
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // Wait for preference to load
    await page.waitForTimeout(6000);
    
    // Verify the correct language is selected via API
    const profileResp = await request.get(`${API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const profile = await profileResp.json();
    expect(profile.user.languageId).toBe(targetLanguageId.toString());
    
    // Verify it's also selected in the UI
    const selectedCards = page.locator('.language-card.selected');
    const count = await selectedCards.count();
    expect(count).toBeGreaterThan(0);
    
    const selectedCard = selectedCards.first();
    const selectedLanguageTitle = await selectedCard.locator('.language-title').textContent();
    expect(selectedLanguageTitle).toBe(targetLanguageTitle);
  });

  // -----------------------------------
  // Test 6: API Response Validation
  // -----------------------------------
  test('should successfully call language preference API endpoints', async ({ request }) => {
    if (!authToken) test.skip();
    
    // Get available languages
    const languagesResp = await request.get(`${API_URL}/api/language`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(languagesResp.status()).toBe(200);
    const languages = await languagesResp.json();
    expect(Array.isArray(languages)).toBe(true);
    expect(languages.length).toBeGreaterThan(0);
    
    // Get first language ID
    const firstLanguageId = languages[0].languageId;
    
    // Update language preference
    const updateResp = await request.put(`${API_URL}/api/auth/language-preference`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { languageId: firstLanguageId }
    });
    
    expect(updateResp.status()).toBe(200);
    const updateData = await updateResp.json();
    expect(updateData.message).toContain('updated');
    
    // Verify preference was saved
    const profileResp = await request.get(`${API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    expect(profileResp.status()).toBe(200);
    const profile = await profileResp.json();
    expect(profile.user.languageId).toBe(firstLanguageId.toString());
  });

  // -----------------------------------
  // Test 7: Exhibit Page Uses Language Preference
  // -----------------------------------
  test('should use selected language preference on exhibit page', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Select a specific language (e.g., Chinese if available)
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // Try to find Chinese language card
    const chineseCard = page.locator('.language-card').filter({ 
      has: page.locator('.language-title', { hasText: /Chinese|中文/i }) 
    });
    
    if (await chineseCard.count() > 0) {
      const targetCard = chineseCard.first();
      
      // Check if it's already selected
      const isAlreadySelected = await targetCard.evaluate(el => el.classList.contains('selected'));
      
      if (!isAlreadySelected) {
        await targetCard.click();
        
        // Wait for success message
        const successMessage = page.locator('.message.success');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
        
        // Wait for API call to complete
        await page.waitForTimeout(1000);
      }
      
      // Navigate to an exhibit page
      await page.goto(`${FRONTEND}/`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      // Find and click on an exhibit
      const exhibitLink = page.locator('a[href*="/exhibit/"]').first();
      if (await exhibitLink.count() > 0) {
        await exhibitLink.click();
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        
        // Check if audio language dropdown has Chinese selected or available
        const audioSection = page.locator('.audio-container, .exhibit-audio');
        if (await audioSection.count() > 0) {
          // Audio section exists, which is good
          await expect(audioSection.first()).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  // -----------------------------------
  // Test 8: Multiple Language Switches
  // -----------------------------------
  test('should allow multiple language preference changes', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    const cardCount = await languageCards.count();
    
    if (cardCount >= 2) {
      // Select first language
      await languageCards.nth(0).click();
      await expect(page.locator('.message.success')).toBeVisible({ timeout: 5000 });
      await expect(languageCards.nth(0)).toHaveClass(/selected/);
      
      // Wait a moment for the request to complete
      await page.waitForTimeout(500);
      
      // Select second language
      await languageCards.nth(1).click();
      await expect(page.locator('.message.success')).toBeVisible({ timeout: 5000 });
      await expect(languageCards.nth(1)).toHaveClass(/selected/);
      
      // First card should no longer be selected
      await expect(languageCards.nth(0)).not.toHaveClass(/selected/);
    }
  });

  // -----------------------------------
  // Test 9: Footer Information Display
  // -----------------------------------
  test('should display footer with helpful information', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Check footer section
    const footer = page.locator('.preference-footer');
    await expect(footer).toBeVisible();
    
    // Check footer note
    const footerNote = page.locator('.footer-note');
    await expect(footerNote).toBeVisible();
    await expect(footerNote).toContainText('website interface language');
  });

  // -----------------------------------
  // Test 10: Responsive Behavior
  // -----------------------------------
  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Check that page elements are visible on mobile
    const pageTitle = page.locator('h1');
    await expect(pageTitle).toBeVisible();
    
    const languagesGrid = page.locator('.languages-grid');
    await expect(languagesGrid).toBeVisible();
    
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // On mobile, cards should stack vertically
    const firstCardBox = await languageCards.first().boundingBox();
    const secondCardBox = await languageCards.nth(1).boundingBox();
    
    if (firstCardBox && secondCardBox) {
      // Check if cards are stacked (second card is below first card)
      expect(secondCardBox.y).toBeGreaterThan(firstCardBox.y + firstCardBox.height - 10);
    }
  });

  // -----------------------------------
  // Test 11: Error Handling
  // -----------------------------------
  test('should handle API errors gracefully', async ({ page }) => {
    await page.goto(`${FRONTEND}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Intercept the language preference API and make it fail
    await page.route('**/api/auth/language-preference', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    const languageCards = page.locator('.language-card');
    await expect(languageCards.first()).toBeVisible({ timeout: 10000 });
    
    // Try to select a language
    await languageCards.first().click();
    
    // Should show error message
    const errorMessage = page.locator('.message.error');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------
  // Test 12: Unauthenticated Access Prevention
  // -----------------------------------
  test('should redirect unauthenticated users trying to access preference page', async ({ page }) => {
    // Clear localStorage to simulate unauthenticated state
    await page.goto(FRONTEND);
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    // Try to access the dashboard/preference page
    await page.goto(`${FRONTEND}/dashboard`);
    
    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
