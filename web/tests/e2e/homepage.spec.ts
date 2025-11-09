import { test, expect } from '@playwright/test';

const HOME_URL = 'http://localhost:5173/'; 

test.describe('Homepage Functionality Check', () => {

    // This one will run before every test below.
    test.beforeEach(async ({ page }) => {
        // 1. Go to the home page.
        await page.goto(HOME_URL);

        // 2. Wait for the main content to show up, make sure page load already.
        await page.waitForSelector('.hero-text-content', { state: 'visible', timeout: 10000 });
    });

    // Test 1: Check the hero section layout and content.
    test('should load the page and verify key structural elements are visible', async ({ page }) => {
        // Check the main title text.
        const mainHeading = page.locator('.hero-text-content h1');
        await expect(mainHeading).toBeVisible();
        await expect(mainHeading).toHaveText(/Unlock the Next Chapter of History/);
        
        // Check the hero image part is there.
        const heroImageHalf = page.locator('.hero-image-half');
        await expect(heroImageHalf).toBeVisible();

        // Check got 3 feature blocks.
        const featureBlocks = page.locator('.feature-block');
        await expect(featureBlocks).toHaveCount(3); 
        
        // Check the 'Instant Scan' block can see.
        const scanBlock = page.locator('.feature-block', { hasText: 'Instant Scan' });
        await expect(scanBlock).toBeVisible();
        
        // Check the main button in the hero section.
        const ctaButton = page.locator('.hero-cta-button');
        await expect(ctaButton).toBeVisible();
        await expect(ctaButton).toHaveText(/Scan to Start/);
    });
    
    // Test 2: Check if exhibit data can load and card hover works.
    test('should successfully load exhibit data and verify card hover effect', async ({ page }) => {
        // Check if the exhibits section is there.
        const exhibitSection = page.locator('.exhibits-section');
        await expect(exhibitSection).toBeVisible();

        // Check at least got one exhibit slide (from API).
        const swiperSlides = page.locator('.exhibit-swiper .swiper-slide');
        await expect(swiperSlides).not.toHaveCount(0, { timeout: 15000 }); 
        
        const firstCard = swiperSlides.first().locator('.exhibit-card');
        await expect(firstCard).toBeVisible();
        
        // Check the hover effect:
        // 1. Take the original CSS transform value.
        const initialTransform = await firstCard.evaluate(el => getComputedStyle(el).getPropertyValue('transform'));
        
        // 2. Move mouse over (hover).
        await firstCard.hover();
        
        // 3. Wait a bit for animation to finish.
        await page.waitForTimeout(500); 
        
        // 4. Check the transform value change already.
        const hoverTransform = await firstCard.evaluate(el => getComputedStyle(el).getPropertyValue('transform'));
        expect(hoverTransform).not.toEqual(initialTransform);
        
        // Check can see the 'View All Collections' link.
        await expect(page.getByRole('link', { name: 'View All Collections' })).toBeVisible();
    });

    // Test 3: Check the footer layout and important links.
    test('should verify the footer content and essential links', async ({ page }) => {
        const footer = page.locator('.footer');
        await expect(footer).toBeVisible();

        // Check got brand name inside footer.
        const brand = footer.locator('.footer-brand h3');
        await expect(brand).toBeVisible();
        
        // Check got heading for link group.
        await expect(footer.getByRole('heading', { name: 'Legal & Info' })).toBeVisible(); 

        // Check got 'Privacy Policy' link.
        await expect(footer.getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
        
        // Check the copyright.
        const copyright = page.locator('.footer-bottom');
        await expect(copyright).toContainText(/©\s+\d{4}/);
    });

    // Test 4: Check hero button will go to scan page.
    test('should navigate to /scan when the hero "Scan to Start" button is clicked', async ({ page }) => {
        const ctaButton = page.locator('.hero-cta-button');
        // Click the button.
        await ctaButton.click();
        // Check the URL change to /scan.
        await expect(page).toHaveURL(/.*\/scan/); 
    });
    
    // Test 5: Check the 'View All Collections' link goes to exhibitions page.
    test('should navigate to /exhibitions when "View All Collections" link is clicked', async ({ page }) => {
        // Scroll down so can click properly.
        const viewAllLink = page.getByRole('link', { name: 'View All Collections' });
        await viewAllLink.scrollIntoViewIfNeeded();

        // Click the link.
        await viewAllLink.click();
        // Check the URL change to /exhibitions.
        await expect(page).toHaveURL(/.*\/exhibitions/);
    });

});
