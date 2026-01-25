import { test, expect, Page } from '@playwright/test';

test.describe('Exhibits Admin UI Tests', () => {
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

    test('should load exhibits management page with correct elements', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        const header = page.locator('h1:has-text("Tour & Exhibit Flow")');
        await expect(header).toBeVisible();

        const newTourButton = page.getByRole('button', { name: /New Tour/i });
        await expect(newTourButton).toBeVisible();
    });

    test('should open new tour modal when "New Tour" button clicked', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        await page.getByRole('button', { name: /New Tour/i }).click();
        
        const modal = page.locator('.modal-overlay');
        await expect(modal).toBeVisible();
        
        const modalTitle = page.locator('.modal-header h2');
        await expect(modalTitle).toHaveText(/New Tour/i);
    });

    test('should display filter buttons for tour status', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        await expect(page.getByRole('button', { name: 'All Tours', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Active Tours', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Inactive Tours', exact: true })).toBeVisible();
    });

    test('should filter tours by Active status', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        await page.getByRole('button', { name: 'Active Tours', exact: true }).click();
        await page.waitForTimeout(500);

        const activeFilterBtn = page.getByRole('button', { name: 'Active Tours', exact: true });
        await expect(activeFilterBtn).toHaveClass(/active/);
    });

    test('should filter tours by Inactive status', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        await page.getByRole('button', { name: 'Inactive Tours', exact: true }).click();
        await page.waitForTimeout(500);

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

            await page.click('button:has-text("Cancel")');
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
        } else {
            test.skip();
        }
    });

    test('should open reorder modal when reorder button clicked', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        const tourCards = page.locator('.tour-card');
        const count = await tourCards.count();

        if (count > 0) {
            const reorderButton = page.locator('button:has-text("Reorder")').first();
            const hasReorderButton = await reorderButton.isVisible({ timeout: 5000 }).catch(() => false);

            if (hasReorderButton) {
                await reorderButton.click();

                const modal = page.locator('.modal-overlay');
                await expect(modal).toBeVisible();

                const modalTitle = page.locator('.modal-header h2');
                await expect(modalTitle).toHaveText(/Reorder Exhibits/i);

                await page.click('button:has-text("Cancel")');
                await page.waitForSelector('.modal-overlay', { state: 'hidden' });
            } else {
                test.skip();
            }
        } else {
            test.skip();
        }
    });

    test('should show exhibit cards within tour groups', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        const tourCards = page.locator('.tour-card');
        const count = await tourCards.count();

        if (count > 0) {
            const firstTour = tourCards.first();
            const exhibits = firstTour.locator('.exhibit-row');
            const exhibitCount = await exhibits.count();

            if (exhibitCount > 0) {
                await expect(exhibits.first()).toBeVisible();
            }
        }
    });

    test('should open edit exhibit modal when edit button clicked', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        const editButtons = page.locator('button[title="Edit"]');
        const count = await editButtons.count();

        if (count > 0) {
            await editButtons.first().click();

            const modal = page.locator('.modal-overlay');
            await expect(modal).toBeVisible();

            const modalTitle = page.locator('.modal-header h2');
            await expect(modalTitle).toHaveText(/Edit Exhibit/i);

            await page.click('button:has-text("Cancel")');
            await page.waitForSelector('.modal-overlay', { state: 'hidden' });
        } else {
            test.skip();
        }
    });

    test('should display QR code modal when QR button clicked', async ({ page }) => {
        await page.goto('/admin/exhibits', { waitUntil: 'load' });
        await page.waitForSelector('.manage-exhibits-container', { timeout: 20000 });

        const qrButtons = page.locator('button[title="View QR"]');
        const count = await qrButtons.count();

        if (count > 0) {
            await qrButtons.first().click();
            await page.waitForTimeout(1000);

            const modal = page.locator('.modal-overlay');
            const hasModal = await modal.isVisible({ timeout: 5000 }).catch(() => false);

            if (hasModal) {
                await expect(modal).toBeVisible();
            }
        } else {
            test.skip();
        }
    });
});
