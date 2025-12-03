import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
const API_URL = process.env.VITE_API_TARGET || 'http://localhost:3000';

test.describe('AR Photobooth Page', () => {
    let exhibitionId: string;
    let hasValidExhibition = false;

    test.beforeAll(async ({ request }) => {
        try {
            const response = await request.get(`${API_URL}/api/exhibitions`);
            const exhibitions = await response.json();
            
            if (exhibitions.length > 0) {
                exhibitionId = exhibitions[0].exhibitionId;
                hasValidExhibition = true;
            } else {
                hasValidExhibition = false;
            }
        } catch (error) {
            hasValidExhibition = false;
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!hasValidExhibition) {
            test.skip();
            return;
        }

        await page.goto(`${FRONTEND_URL}/exhibitions/${exhibitionId}/ar-photobooth`);
        
        // Wait for page to load
        try {
            await page.waitForSelector('.ar-photobooth-container', { state: 'visible', timeout: 10000 });
        } catch (e) {
            console.log('AR Photobooth page timeout');
        }
    });

    // Test 1: Verify page loads with correct structure
    test('should display AR Photobooth page with correct layout', async ({ page }) => {
        // Check main container exists
        await expect(page.locator('.ar-photobooth-container')).toBeVisible();

        // Check header exists
        const header = page.locator('.ar-header');
        await expect(header).toBeVisible();

        // Check title
        const title = page.locator('.ar-title');
        await expect(title).toBeVisible();
        await expect(title).toContainText('AR Photobooth Experience');
    });

    // Test 2: Verify back button functionality
    test('should navigate back to exhibition details when back button is clicked', async ({ page }) => {
        const backButton = page.locator('.ar-btn-secondary').filter({ hasText: 'Back' });
        await expect(backButton).toBeVisible();

        await backButton.click();
        
        // Should navigate back to exhibition details page
        await expect(page).toHaveURL(new RegExp(`/exhibitions/${exhibitionId}`));
    });

    // Test 3: Verify AR launch button exists and has correct attributes
    test('should display launch AR photobooth button', async ({ page }) => {
        const launchButton = page.locator('.ar-btn-primary').filter({ hasText: 'Launch AR Photobooth' });
        await expect(launchButton).toBeVisible();
        await expect(launchButton).toBeEnabled();
    });

    // Test 4: Verify feature cards are displayed
    test('should display all feature cards', async ({ page }) => {
        const featureCards = page.locator('.feature-card');
        const count = await featureCards.count();
        
        // Should have 3 feature cards
        expect(count).toBe(3);

        // Verify feature card titles
        await expect(featureCards.nth(0).locator('h3')).toContainText('Virtual Accessories');
        await expect(featureCards.nth(1).locator('h3')).toContainText('Photo Capture');
        await expect(featureCards.nth(2).locator('h3')).toContainText('Share & Celebrate');
    });

    // Test 5: Verify instructions section
    test('should display usage instructions', async ({ page }) => {
        const instructions = page.locator('.instructions');
        await expect(instructions).toBeVisible();

        const instructionsHeading = instructions.locator('h4');
        await expect(instructionsHeading).toContainText('How to Use');

        // Check that ordered list exists
        const orderedList = instructions.locator('ol');
        await expect(orderedList).toBeVisible();

        // Should have 5 instruction steps
        const listItems = orderedList.locator('li');
        const stepCount = await listItems.count();
        expect(stepCount).toBe(5);
    });

    // Test 6: Verify icons are present
    test('should display preview icons', async ({ page }) => {
        const previewIcon = page.locator('.preview-icon');
        await expect(previewIcon).toBeVisible();
    });

    // Test 7: Verify launch button opens new tab (without actually opening)
    test('should have launch button configured to open external link', async ({ page, context }) => {
        // Listen for new page (tab) opening
        const popupPromise = context.waitForEvent('page');
        
        const launchButton = page.locator('.ar-btn-primary').filter({ hasText: 'Launch AR Photobooth' });
        await launchButton.click();
        
        // Wait for the new tab
        const popup = await popupPromise;
        
        // Verify the URL
        expect(popup.url()).toContain('8thwall.app');
        expect(popup.url()).toContain('spopenhousephotobooth');
        
        // Close the popup
        await popup.close();
    });

    // Test 8: Verify responsive elements
    test('should display main content sections', async ({ page }) => {
        const arMain = page.locator('.ar-main');
        await expect(arMain).toBeVisible();

        const previewContent = page.locator('.preview-content');
        await expect(previewContent).toBeVisible();

        const featuresGrid = page.locator('.features-grid');
        await expect(featuresGrid).toBeVisible();

        const actionSection = page.locator('.action-section');
        await expect(actionSection).toBeVisible();
    });

    // Test 9: Verify page heading and description
    test('should display correct heading and description text', async ({ page }) => {
        // Check main heading
        const mainHeading = page.locator('h2').filter({ hasText: 'SoC Open House AR Photobooth' });
        await expect(mainHeading).toBeVisible();

        // Check description paragraph
        const description = page.locator('p').filter({ hasText: 'Experience our interactive AR photobooth' });
        await expect(description).toBeVisible();
    });

    // Test 10: Verify accessibility - buttons should have proper text
    test('should have accessible button labels', async ({ page }) => {
        const backButton = page.locator('.ar-btn-secondary');
        await expect(backButton).toContainText('Back');

        const launchButton = page.locator('.ar-btn-primary');
        await expect(launchButton).toContainText('Launch AR Photobooth');
    });
});
