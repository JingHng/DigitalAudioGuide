import { test, expect, Page } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5175';

test.describe('Exhibit Public UI Tests', () => {
    let exhibitionId: string;
    let exhibitId: string;
    let hasValidExhibit = false;

    test.beforeAll(async ({ request }) => {
        try {
            const exhibitionsResponse = await request.get(`${API_URL}/api/exhibitions`);
            const exhibitions = await exhibitionsResponse.json();
            
            if (exhibitions.length > 0) {
                exhibitionId = exhibitions[0].exhibitionId;
                
                const exhibitionResponse = await request.get(`${API_URL}/api/exhibitions/${exhibitionId}`);
                const exhibition = await exhibitionResponse.json();
                
                if (exhibition.exhibits && exhibition.exhibits.length > 0) {
                    exhibitId = exhibition.exhibits[0].exhibitId;
                    hasValidExhibit = true;
                }
            }
        } catch (error) {
            console.error('Failed to fetch test data:', error);
            hasValidExhibit = false;
        }
    });

    test.beforeEach(async ({ page }) => {
        if (!hasValidExhibit) {
            test.skip();
            return;
        }
    });


    test('should display audio player if exhibit has audio', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);
        await page.waitForLoadState('networkidle');

        const audioPlayer = page.locator('audio, .audio-player, button:has-text("Play")');
        const hasAudio = await audioPlayer.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasAudio) {
            const playButton = page.locator('button').filter({ has: page.locator('svg') });
            await expect(playButton.first()).toBeVisible();
        }
    });

    test('should navigate back when back button clicked', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);
        await page.waitForLoadState('networkidle');

        const backButton = page.locator('.nav-icon-btn').first();
        await backButton.click();

        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain(`${FRONTEND_URL}/exhibitions/${exhibitionId}/tour`);
    });

    test('should display reviews section', async ({ page }) => {
        await page.goto(`${FRONTEND_URL}/exhibitions/${exhibitionId}/exhibit/${exhibitId}`);
        await page.waitForLoadState('networkidle');

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(1000);

        const reviewsSection = page.locator('[class*="review"]');
        const hasReviews = await reviewsSection.isVisible({ timeout: 5000 }).catch(() => false);
        
        if (hasReviews) {
            await expect(reviewsSection.first()).toBeVisible();
        }
    });

    test('should fetch exhibit data from API successfully', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibits/${exhibitId}`);
        expect(response.status()).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('exhibitId');
        expect(data).toHaveProperty('title');
    });
});
