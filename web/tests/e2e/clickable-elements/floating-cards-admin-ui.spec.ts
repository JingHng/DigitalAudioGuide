import { test, expect, Page } from '@playwright/test';

test.describe('Floating Cards Admin UI Tests', () => {
    
    async function loginAsAdmin(page: Page) {
        await page.goto('/login');
        await page.fill('input[name="username"]', 'admin');
        await page.fill('input[name="password"]', 'admin123');
        await page.click('button[type="submit"]');
        await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 15000 });
    }

    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should load floating cards management page', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await expect(page.locator('h2:has-text("Clickable Elements")')).toBeVisible();
        await expect(page.locator('button:has-text("Add Card")')).toBeVisible();
    });

    test('should display existing cards with 3 max limit', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        const cardItems = page.locator('.card-item');
        const count = await cardItems.count();
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(3);
    });

    test('should show card with title and icon', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        const firstCard = page.locator('.card-item').first();
        await expect(firstCard.locator('.card-icon-preview')).toBeVisible();
        await expect(firstCard.locator('.card-header-row h3')).toBeVisible();
    });

    test('should open add card modal', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await page.click('button:has-text("Add Card")');
        await page.waitForSelector('.admin-modal-overlay', { state: 'visible' });
        
        await expect(page.locator('.modal-header h3')).toContainText('Add New Clickable Element');
    });

    test('should display icon grid with 12 icons', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await page.click('button:has-text("Add Card")');
        await page.waitForSelector('.admin-modal-overlay', { state: 'visible' });
        
        const iconOptions = page.locator('.icon-option');
        const count = await iconOptions.count();
        expect(count).toBe(12);
    });

    test('should allow selecting an icon', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await page.click('button:has-text("Add Card")');
        await page.waitForSelector('.admin-modal-overlay', { state: 'visible' });
        
        const firstIcon = page.locator('.icon-option').first();
        await firstIcon.click();
        await page.waitForTimeout(300);
        
        await expect(firstIcon).toHaveClass(/selected/);
    });

    test('should switch to edit mode', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        const firstCard = page.locator('.card-item').first();
        await firstCard.locator('.action-btn.edit').click();
        await page.waitForTimeout(300);
        
        // Edit mode shows multiple input fields
        const inputs = firstCard.locator('input[type="text"]');
        const count = await inputs.count();
        expect(count).toBeGreaterThanOrEqual(1);
    });

    test('should display visitor routes in dropdown', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await page.click('button:has-text("Add Card")');
        await page.waitForSelector('.admin-modal-overlay', { state: 'visible' });
        
        const select = page.locator('select.modern-select');
        const options = await select.locator('option').allTextContents();
        
        expect(options.some(opt => opt.includes('Scan') || opt.includes('scan'))).toBeTruthy();
    });

    test('should close modal when clicking cancel', async ({ page }) => {
        await page.goto('/admin/floating-cards', { waitUntil: 'load' });
        await page.waitForSelector('.admin-floating-cards', { timeout: 20000 });
        
        await page.click('button:has-text("Add Card")');
        await page.waitForSelector('.admin-modal-overlay', { state: 'visible' });
        
        // Look for cancel or close button
        const cancelBtn = page.locator('button:has-text("Cancel"), button.close-btn, button:has-text("Close")').first();
        if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(300);
            await expect(page.locator('.admin-modal-overlay')).not.toBeVisible();
        }
    });
});
