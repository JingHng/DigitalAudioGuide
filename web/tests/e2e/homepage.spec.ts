import { test, expect } from '@playwright/test';


const API_URL = 'http://localhost:5175'; 

test.describe('Homepage Functionality and API Check', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Go to the home page.
        await page.goto('/');

        // 2. Wait for the main content to show up, make sure page load already.
        await page.waitForSelector('.hero-text-content', { state: 'visible', timeout: 15000 });
    });
    
    // --- CORE E2E CHECKS ---

    // Test 1: Check the hero section layout and content (Static UI).
    test('should verify the main structural elements are visible', async ({ page }) => {
        // Check the main title text.
        const mainHeading = page.locator('.hero-text-content h1');
        await expect(mainHeading).toBeVisible();
        await expect(mainHeading).toHaveText(/Unlock the Next Chapter of History/);
        
        // Check the main button in the hero section.
        const ctaButton = page.locator('.hero-cta-button');
        await expect(ctaButton).toBeVisible();
        await expect(ctaButton).toHaveText(/Scan to Start/);
    });
    
    // Test 2:  Verify exhibit data loads and displays on the page.
    test('should successfully load exhibit data and display at least one exhibit card', async ({ page }) => {
        // Check if the exhibits section is there.
        const exhibitSection = page.locator('.exhibits-section');
        await expect(exhibitSection).toBeVisible();

        // Check at least one exhibit slide is present (from successful API call).
        const swiperSlides = page.locator('.exhibit-swiper .swiper-slide');
        // This assertion is critical: it verifies data dependency!
        await expect(swiperSlides).not.toHaveCount(0, { timeout: 15000 }); 
        
        const firstCard = swiperSlides.first().locator('.exhibit-card');
        await expect(firstCard).toBeVisible();
        
        // Check the 'View All Collections' link is visible.
        await expect(page.getByRole('link', { name: 'View All Collections' })).toBeVisible();
    });

    // --- NAVIGATION CHECKS ---

    // Test 3: Check hero button will go to scan page.
    test('should navigate to /scan when the hero "Scan to Start" button is clicked', async ({ page }) => {
        const ctaButton = page.locator('.hero-cta-button');
        await ctaButton.click();
        await expect(page).toHaveURL(/.*\/scan/); 
    });
    
    // Test 4: Check the 'View All Collections' link goes to exhibitions page.
    test('should navigate to /exhibitions when "View All Collections" link is clicked', async ({ page }) => {
        const viewAllLink = page.getByRole('link', { name: 'View All Collections' });
        await viewAllLink.scrollIntoViewIfNeeded(); // Ensure element is clickable

        await viewAllLink.click();
        await expect(page).toHaveURL(/.*\/exhibitions/);
    });

    // --- API INTEGRATION CHECK (Purer Backend Test in Playwright) ---

    // Test 5: Directly check the exhibits API endpoint response status and data structure.
    test('should confirm the exhibits API endpoint is accessible and returns data', async ({ request }) => {
        // Use the Playwright 'request' fixture to make a direct HTTP call to the backend
        const response = await request.get(`${API_URL}/api/exhibits`);
        
        // 1. Verify the status code
        expect(response.status()).toBe(200);

        // 2. Verify the response is JSON
        expect(response.headers()['content-type']).toContain('application/json');

        // 3. Verify data is present
        const exhibits = await response.json();
        expect(exhibits.length).toBeGreaterThan(0);
        
        // 4. Verify basic data structure
        if (exhibits.length > 0) {
            expect(exhibits[0]).toHaveProperty('exhibitId');
            expect(exhibits[0]).toHaveProperty('title');
        }
    });

});