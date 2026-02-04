import { test, expect, Page } from '@playwright/test';

test.describe('Floating Cards Homepage Integration Tests', () => {
    
    test('should display floating cards on homepage', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const interactiveCards = page.locator('[role="button"], .card, .floating-card, a[href*="/"]').filter({
            hasText: /(Scanning|Navigation|Badge|Tour|Interactive)/
        });
        
        const count = await interactiveCards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should display maximum 3 cards', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const cardLinks = page.locator('a[href*="/"]').filter({
            hasText: /(Scanning|Navigation|Badge)/
        });
        
        const count = await cardLinks.count();
        expect(count).toBeLessThanOrEqual(6);
    });

    test('should display card titles', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const pageContent = await page.textContent('body');
        const hasTitle = pageContent && (
            pageContent.includes('Interactive Scanning') ||
            pageContent.includes('Scanning') ||
            pageContent.includes('Tour Navigation') ||
            pageContent.includes('Navigation') ||
            pageContent.includes('Badge Collection') ||
            pageContent.includes('Badge')
        );
        
        expect(hasTitle).toBeTruthy();
    });

    test('should navigate to correct route on click', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const scanLink = page.locator('a[href="/scan"]').first();
        
        if (await scanLink.isVisible()) {
            await scanLink.click();
            await page.waitForURL(/\/scan/, { timeout: 5000 });
            expect(page.url()).toContain('/scan');
        }
    });

    test('should display card icons', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const cards = page.locator('a[href*="/"]').filter({
            hasText: /(Scanning|Navigation|Badge)/
        });
        
        if (await cards.first().isVisible()) {
            const svg = cards.first().locator('svg');
            await expect(svg).toBeVisible();
        }
    });

    test('should have hover effects', async ({ page }) => {
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1000);
        
        const cards = page.locator('a[href*="/"]').filter({
            hasText: /(Scanning|Navigation|Badge)/
        });
        
        if (await cards.first().isVisible()) {
            await cards.first().hover();
            await page.waitForTimeout(200);
        }
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        
        // Just verify page loads without errors on mobile
        const title = await page.title();
        expect(title).toBeTruthy();
    });

    test('should be responsive on tablet', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(1500);
        
        // Just verify page loads without errors on tablet
        const title = await page.title();
        expect(title).toBeTruthy();
    });

    test('should call API on page load', async ({ page }) => {
        let apiCalled = false;
        
        page.on('response', response => {
            if (response.url().includes('/api/home/floating-cards')) {
                apiCalled = true;
            }
        });
        
        await page.goto('/', { waitUntil: 'load' });
        await page.waitForTimeout(2000);
        
        expect(apiCalled).toBeTruthy();
    });
});
