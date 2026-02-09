import { test, expect, Page } from '@playwright/test';

test.describe('Tours Admin UI - Comprehensive Tests', () => {
    
    async function loginAsAdmin(page: Page) {
        await page.goto('/login');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        // Wait for redirect away from login page
        await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 15000 });
    }

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should load tour management page with correct elements', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        // Check header
        const header = page.locator('h1:has-text("Tour & Exhibit Flow")');
        await expect(header).toBeVisible();
        
        // Check "New Tour" button exists
        const newTourBtn = page.locator('button:has-text("New Tour")');
        await expect(newTourBtn).toBeVisible();
        
        // Check filter buttons exist
        await expect(page.getByRole('button', { name: 'All Tours', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Active Tours', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Inactive Tours', exact: true })).toBeVisible();
    });

    test('should open new tour modal with correct form fields', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        await page.click('button:has-text("New Tour")');
        await page.waitForSelector('.modal-overlay', { state: 'visible' });
        
        // Verify form fields exist
        await expect(page.locator('#exhibitionTitle')).toBeVisible();
        await expect(page.locator('#exhibitionDescription')).toBeVisible();
        await expect(page.locator('#exhibitionStartsAt')).toBeVisible();
        await expect(page.locator('#exhibitionEndsAt')).toBeVisible();
        await expect(page.locator('button:has-text("Create Tour")')).toBeVisible();
        await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
        
        // Close modal
        await page.click('button:has-text("Cancel")');
        await page.waitForSelector('.modal-overlay', { state: 'hidden' });
    });

    test('should display existing tours with action buttons', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        // Check if at least one tour card exists
        const tourCards = page.locator('.tour-card');
        const count = await tourCards.count();
        
        if (count > 0) {
            // Verify first tour has action buttons
            const firstCard = tourCards.first();
            await expect(firstCard.locator('button:has-text("Add Exhibit")')).toBeVisible();
            await expect(firstCard.locator('button:has-text("Edit Tour")')).toBeVisible();
            
            // Should have either Deactivate or Reactivate button
            const hasDeactivate = await firstCard.locator('button:has-text("Deactivate")').count();
            const hasReactivate = await firstCard.locator('button:has-text("Reactivate")').count();
            expect(hasDeactivate + hasReactivate).toBeGreaterThan(0);
        }
    });

    test('should open edit tour modal for existing tour', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        const tourCards = page.locator('.tour-card');
        const count = await tourCards.count();
        
        if (count > 0) {
            // Click edit on first tour
            await tourCards.first().locator('button:has-text("Edit Tour")').click();
            await page.waitForSelector('.modal-overlay', { state: 'visible' });
            
            // Verify it's edit mode (should have "Save Changes" button)
            await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
            
            // Close modal
            await page.click('button:has-text("Cancel")');
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
        } else {
            test.skip();
        }
    });

    test('should filter tours by Active status', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        // Click Active filter - use exact match
        await page.getByRole('button', { name: 'Active Tours', exact: true }).click();
        await page.waitForTimeout(500); // Wait for filter to apply
        
        // Check filter button is active
        const activeFilterBtn = page.getByRole('button', { name: 'Active Tours', exact: true });
        await expect(activeFilterBtn).toHaveClass(/active/);
        
        // All visible tours should not have 'tour-inactive' class
        const inactiveTours = page.locator('.tour-card.tour-inactive');
        await expect(inactiveTours).toHaveCount(0);
    });

    test('should filter tours by Inactive status', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        // Click Inactive filter - use exact match
        await page.getByRole('button', { name: 'Inactive Tours', exact: true }).click();
        await page.waitForTimeout(500); // Wait for filter to apply
        
        // Check filter button is active
        const inactiveFilterBtn = page.getByRole('button', { name: 'Inactive Tours', exact: true });
        await expect(inactiveFilterBtn).toHaveClass(/active/);
    });

    test('should open add exhibit modal from tour card', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        const tourCards = page.locator('.tour-card');
        const count = await tourCards.count();
        
        if (count > 0) {
            const addExhibitButton = page.locator('.tour-card .btn-ghost:has-text("Add Exhibit")').first();
            await addExhibitButton.click();
            
            const modal = page.locator('.modal-overlay');
            await expect(modal).toBeVisible();
            
            const modalTitle = page.locator('.modal-header h2');
            await expect(modalTitle).toHaveText(/Add Exhibit/i);
            
            // Close modal
            await page.click('button:has-text("Cancel")');
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
        } else {
            test.skip();
        }
    });

    test('should show tour statistics in filter bar', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });
        
        // Check for filter stats element
        const filterStats = page.locator('.filter-stats');
        await expect(filterStats).toBeVisible();
        
        // Should contain text like "X Tour(s) Listed"
        await expect(filterStats).toContainText(/\d+ Tour/);
    });
});