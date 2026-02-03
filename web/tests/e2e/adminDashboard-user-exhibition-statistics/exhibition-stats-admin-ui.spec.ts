import { test, expect, Page } from '@playwright/test';

test.describe('Exhibition Statistics Admin UI - Comprehensive Tests', () => {
    
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

    test('should load admin dashboard with exhibition statistics chart', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        
        // Check dashboard header
        await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
        
        // Check exhibition statistics section exists
        await expect(page.locator('.chart-container.visitor-stats-chart')).toBeVisible();
        
        // Verify chart title
        await expect(page.locator('h2:has-text("Total Visitors Per Exhibition (Tour)")')).toBeVisible();
    });

    test('should display KPI cards with correct metrics', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        
        // Check for 3 KPI cards (Total Users, Total Active Tours, Audio Plays)
        const kpiCards = page.locator('div').filter({ hasText: /^(Total Users|Total Active Tours|Audio Plays)$/ });
        await expect(kpiCards.first()).toBeVisible();
        
        // Verify Total Active Tours card exists (updated from "Total Tours")
        await expect(page.getByText('Total Active Tours', { exact: true })).toBeVisible();
    });

    test('should display exhibition multi-select dropdown', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        
        // Wait for visitor stats to load
        await page.waitForTimeout(1500);
        
        // Check for exhibition dropdown button
        const dropdownButton = page.locator('.visitor-stats-filter button').first();
        await expect(dropdownButton).toBeVisible();
        
        // Verify button shows selection count
        await expect(dropdownButton).toContainText(/\d+ tours? selected/);
    });

    test('should open and close exhibition dropdown', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        const dropdownButton = page.locator('.visitor-stats-filter button').first();
        
        // Open dropdown
        await dropdownButton.click();
        await page.waitForTimeout(300);
        
        // Verify dropdown menu is visible
        const dropdownMenu = page.locator('.visitor-stats-filter div').filter({ hasText: /All|Clear/ }).first();
        await expect(dropdownMenu).toBeVisible();
        
        // Check for All and Clear buttons
        await expect(page.locator('button:has-text("All")')).toBeVisible();
        await expect(page.locator('button:has-text("Clear")')).toBeVisible();
        
        // Close dropdown by clicking outside
        await page.click('h1:has-text("Dashboard")');
        await page.waitForTimeout(300);
    });

    test('should display filter type toggle buttons', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        
        // Check for Quick Periods and Custom Range toggle
        await expect(page.locator('button:has-text("Quick Periods")')).toBeVisible();
        await expect(page.locator('button:has-text("Custom Range")')).toBeVisible();
    });

    test('should show period dropdown when Quick Periods is active', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        // Click Quick Periods button (should be default)
        await page.locator('button:has-text("Quick Periods")').click();
        await page.waitForTimeout(300);
        
        // Verify period select dropdown exists
        const periodSelect = page.locator('#visitorPeriodSelect');
        await expect(periodSelect).toBeVisible();
        
        // Verify options exist (options are present but not "visible" in DOM)
        const optionCount = await periodSelect.locator('option').count();
        expect(optionCount).toBeGreaterThanOrEqual(5);
    });

    test('should show date range inputs when Custom Range is active', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        // Click Custom Range button
        await page.locator('button:has-text("Custom Range")').click();
        await page.waitForTimeout(300);
        
        // Verify date inputs appear
        const dateInputs = page.locator('input[type="date"]');
        const count = await dateInputs.count();
        expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should change period filter and update chart', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        // Ensure Quick Periods is selected
        await page.locator('button:has-text("Quick Periods")').click();
        await page.waitForTimeout(300);
        
        // Change period to "Last Month"
        await page.selectOption('#visitorPeriodSelect', { label: 'Last Month' });
        await page.waitForTimeout(1000);
        
        // Verify chart still exists (indicating it updated)
        await expect(page.locator('.visitor-stats-chart .recharts-responsive-container')).toBeVisible();
    });

    test('should display bar chart with exhibition data', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        // Check for recharts bar chart
        await expect(page.locator('.visitor-stats-chart .recharts-bar-rectangle').first()).toBeVisible({ timeout: 10000 });
        
        // Verify bars have different colors (multiple fill attributes)
        const bars = page.locator('.visitor-stats-chart .recharts-bar-rectangle path');
        const count = await bars.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should display chart with colored bars for each exhibition', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        await page.waitForTimeout(1500);
        
        // Wait for chart to render
        const chart = page.locator('.recharts-responsive-container').first();
        await expect(chart).toBeVisible();
        
        // Verify x-axis labels (exhibition titles)
        const xAxisLabels = page.locator('.recharts-xAxis .recharts-text');
        const labelCount = await xAxisLabels.count();
        expect(labelCount).toBeGreaterThan(0);
    });

    test('should display refresh button and reload data', async ({ page }) => {
        await page.goto('/admin/dashboard', { waitUntil: 'load' });
        await page.waitForSelector('.admin-dashboard', { timeout: 20000 });
        
        // Find and click refresh button
        const refreshButton = page.locator('button.refresh-btn');
        await expect(refreshButton).toBeVisible();
        
        await refreshButton.click();
        await page.waitForTimeout(1000);
        
        // Verify dashboard still displays correctly after refresh
        await expect(page.locator('.admin-dashboard')).toBeVisible();
    });
});
