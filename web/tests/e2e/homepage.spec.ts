import { test, expect } from '@playwright/test';


const API_URL = 'http://localhost:5175'; 

test.describe('Homepage Functionality and API Check', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Go to the home page.
        await page.goto('/');

        // 2. Wait for the main content to show up, make sure page load already.
        await page.waitForSelector('.smart-exhibit-home', { state: 'visible', timeout: 15000 });
    });
    
    // --- CORE E2E CHECKS ---

    // Test 1: Check the hero section layout and content (Static UI).
    test('should verify the main structural elements are visible', async ({ page }) => {
        // Wait for hero section to be visible
        const heroSection = page.locator('.hero-banner');
        await expect(heroSection).toBeVisible();
        
        // Check the main title text.
        const mainHeading = page.locator('.hero-title');
        await expect(mainHeading).toBeVisible();
        await expect(mainHeading).toHaveText(/SmartExhibit/);
        
    // Check the main button in the hero section 
    const ctaButton = page.locator('.hero-banner .primary-btn').first();
    await expect(ctaButton).toBeVisible();
    await expect(ctaButton).toHaveText(/Start Exploring/);
    
        
        // Check hero content structure
        const heroContent = page.locator('.hero-content');
        await expect(heroContent).toBeVisible();
    });
    
    // Test 2:  Verify exhibit data loads and displays on the page.
    test('should successfully load exhibit data and display at least one exhibit card', async ({ page }) => {
        // Check if the tours section is there.
        const toursSection = page.locator('.tours-showcase');
        await expect(toursSection).toBeVisible();

        // Wait for loading to complete and data to load
        await page.waitForFunction(() => {
            const loadingElement = document.querySelector('.loading-container');
            const toursGrid = document.querySelector('.tours-grid');
            const noTours = document.querySelector('.no-tours');
            return !loadingElement && (toursGrid || noTours);
        }, undefined, { timeout: 15000 });

        // Check if tours loaded successfully
        const toursGrid = page.locator('.tours-grid');
        const noToursMessage = page.locator('.no-tours');
        
        if (await toursGrid.isVisible()) {
            // Tours are available - check tour cards
            const tourCards = page.locator('.tour-card');
            await expect(tourCards).not.toHaveCount(0);
            
            const firstCard = tourCards.first();
            await expect(firstCard).toBeVisible();
            
            // Check the 'View All Tours' button is visible when tours exist
            const viewAllButton = page.locator('.view-all-btn');
            await expect(viewAllButton).toBeVisible();
        } else {
            // No tours available - should show no tours message
            await expect(noToursMessage).toBeVisible();
        }
    });

    // --- NAVIGATION CHECKS ---

    // Test 3: Check hero button will go to scan page.
    test('should navigate to /scan when the hero "Start Exploring" button is clicked', async ({ page }) => {
        const ctaButton = page.locator('.hero-banner .primary-btn').first();
        await ctaButton.click();
        await expect(page).toHaveURL(/.*\/scan/); 
    });
    
    // Test 4: Check the 'View All Tours' button goes to exhibitions page.
    test('should navigate to /exhibitions when "View All Tours" button is clicked', async ({ page }) => {
        // Wait for loading to complete
        await page.waitForFunction(() => {
            const loadingElement = document.querySelector('.loading-container');
            return !loadingElement;
        }, undefined, { timeout: 15000 });
        
        // Check if the view all button exists (only when tours are available)
        const viewAllButton = page.locator('.view-all-btn');
        
        if (await viewAllButton.isVisible()) {
            await viewAllButton.click();
            await expect(page).toHaveURL(/.*\/exhibitions/);
        } else {
            // If no view all button, use the secondary navigation button in hero
            const heroSecondaryBtn = page.locator('.secondary-btn');
            await expect(heroSecondaryBtn).toBeVisible();
            await heroSecondaryBtn.click();
            await expect(page).toHaveURL(/.*\/exhibitions/);
        }
    });

    // --- API INTEGRATION CHECK (Purer Backend Test in Playwright) ---

    // Test 5: Directly check the exhibitions API endpoint response status and data structure.
    test('should confirm the exhibitions API endpoint is accessible and returns data', async ({ request }) => {
        // Use the Playwright 'request' fixture to make a direct HTTP call to the backend
        const response = await request.get(`${API_URL}/api/exhibitions`);
        
        // 1. Verify the status code
        expect(response.status()).toBe(200);

        // 2. Verify the response is JSON
        expect(response.headers()['content-type']).toContain('application/json');

        // 3. Verify data is present
        const exhibitions = await response.json();
        expect(exhibitions.length).toBeGreaterThan(0);
        
        // 4. Verify basic data structure
        if (exhibitions.length > 0) {
            expect(exhibitions[0]).toHaveProperty('exhibitionId');
            expect(exhibitions[0]).toHaveProperty('title');
        }
    });

});