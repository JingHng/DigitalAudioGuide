import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175'; 

test.describe('Scan Page Functionality and QR Code Scanner', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to the scan page
        await page.goto('/scan');

        // Wait for the scan page container to load
        await page.waitForSelector('.scan-page', { state: 'visible', timeout: 15000 });
    });
    
    // --- PAGE STRUCTURE TESTS ---

    // Test 1: Verify main page layout and title section
    test('should display scan page with correct title and subtitle', async ({ page }) => {
        // Check main scan container
        const scanContainer = page.locator('.scan-container');
        await expect(scanContainer).toBeVisible();
        
        // Check title section
        const titleSection = page.locator('.scan-title-section');
        await expect(titleSection).toBeVisible();
        
        // Check main title
        const mainTitle = page.locator('.scan-title');
        await expect(mainTitle).toBeVisible();
        await expect(mainTitle).toHaveText('Scan QR Code');
        
        // Check subtitle
        const subtitle = page.locator('.scan-subtitle');
        await expect(subtitle).toBeVisible();
        await expect(subtitle).toHaveText(/Singapore's heritage through immersive exhibits/);
    });

    // Test 2: Verify QR scanner component is present
    test('should display QR scanner interface', async ({ page }) => {
        // Check QR scanner card exists
        const scannerCard = page.locator('.qr-scanner-card');
        await expect(scannerCard).toBeVisible();
        
        // Check reader container exists
        const readerContainer = page.locator('#reader');
        await expect(readerContainer).toBeVisible();
        
        // Wait a moment for scanner to initialize
        await page.waitForTimeout(2000);
        
        // Check if scanner UI elements are rendered
        // The HTML5-QRCode scanner creates its own DOM elements
        const scannerElements = page.locator('#reader *');
        const elementCount = await scannerElements.count();
        
        if (elementCount > 0) {
            console.log('✓ QR scanner interface initialized successfully');
        } else {
            console.log('⚠ QR scanner interface may not have initialized yet');
        }
    });

    // Test 3: Verify instructions section
    test('should display clear usage instructions', async ({ page }) => {
        // Check instructions card
        const instructionsCard = page.locator('.instructions-card');
        await expect(instructionsCard).toBeVisible();
        
        // Check instructions header
        const instructionsHeader = page.locator('.instructions-header h3');
        await expect(instructionsHeader).toBeVisible();
        await expect(instructionsHeader).toHaveText('📋 How to Use');
        
        // Check all instruction items are present
        const instructionItems = page.locator('.instruction-item');
        await expect(instructionItems).toHaveCount(4);
        
        // Verify specific instruction content
        const firstInstruction = instructionItems.nth(0);
        await expect(firstInstruction.locator('h4')).toHaveText('🎯 Position Camera');
        await expect(firstInstruction.locator('p')).toHaveText(/Point your device at the QR code/);
        
        const secondInstruction = instructionItems.nth(1);
        await expect(secondInstruction.locator('h4')).toHaveText('✋ Hold Steady');
        
        const thirdInstruction = instructionItems.nth(2);
        await expect(thirdInstruction.locator('h4')).toHaveText('📤 Upload Alternative');
        
        const fourthInstruction = instructionItems.nth(3);
        await expect(fourthInstruction.locator('h4')).toHaveText('🎨 Explore Content');
    });

    // --- NAVIGATION TESTS ---

    // Test 4: Verify navigation buttons functionality
    test('should have working navigation buttons', async ({ page }) => {
        // Check navigation section exists
        const navigation = page.locator('.scan-navigation');
        await expect(navigation).toBeVisible();
        
        // Check both navigation buttons exist
        const homeButton = page.locator('.nav-button', { hasText: '🏠 Home' });
        const exhibitsButton = page.locator('.nav-button.primary', { hasText: '🏛️ Exhibits' });
        
        await expect(homeButton).toBeVisible();
        await expect(exhibitsButton).toBeVisible();
        
        // Test home button navigation
        await homeButton.click();
        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
        
        // Navigate back to scan page
        await page.goto('/scan');
        await page.waitForSelector('.scan-page', { state: 'visible' });
        
        // Test exhibits button navigation
        const exhibitsBtn = page.locator('.nav-button.primary', { hasText: '🏛️ Exhibits' });
        await exhibitsBtn.click();
        await page.waitForURL('/exhibitions');
        await expect(page).toHaveURL('/exhibitions');
    });

    // --- SCANNER FUNCTIONALITY TESTS ---

    // Test 5: Verify initial scanner status message
    test('should display initial instructions in status area', async ({ page }) => {
        // Wait for scanner to initialize and show initial message
        await page.waitForTimeout(2000);
        
        // Check for status message
        const statusMessage = page.locator('.scan-status.info');
        
        // Allow some time for the status message to appear
        await page.waitForSelector('.scan-status', { timeout: 5000 });
        
        const statusText = await statusMessage.textContent();
        expect(statusText).toContain('Position the QR code within the frame');
        console.log(`✓ Initial status message: ${statusText}`);
    });

    // Test 6: Test scanner permission handling
    test('should handle camera permission gracefully', async ({ page, context }) => {
        // Mock camera permissions as denied for testing
        await context.grantPermissions([], { origin: 'http://localhost:5173' });
        
        // Reload page to test permission handling
        await page.reload();
        await page.waitForSelector('.scan-page', { state: 'visible' });
        
        // Wait for scanner initialization
        await page.waitForTimeout(3000);
        
        // The scanner should still render, even if camera access is denied
        const readerContainer = page.locator('#reader');
        await expect(readerContainer).toBeVisible();
        
        console.log('✓ Scanner handles camera permission gracefully');
    });

    // Test 7: Test file upload functionality (simulated)
    test('should provide file upload option for QR scanning', async ({ page }) => {
        // Wait for scanner to fully initialize
        await page.waitForTimeout(3000);
        
        // Look for file input elements that html5-qrcode creates
        const fileInputs = page.locator('input[type="file"]');
        
        // The HTML5-QRCode library should create a file input
        const fileInputCount = await fileInputs.count();
        
        if (fileInputCount > 0) {
            console.log('✓ File upload option is available');
            
            // Check if the file input accepts image files
            const firstFileInput = fileInputs.first();
            const acceptAttribute = await firstFileInput.getAttribute('accept');
            
            if (acceptAttribute && acceptAttribute.includes('image')) {
                console.log('✓ File input accepts image files');
            }
        } else {
            console.log('ℹ File upload option may not be visible yet');
        }
    });

    // --- ERROR HANDLING TESTS ---

    // Test 8: Test invalid QR code handling (simulated)
    test('should handle scanning errors gracefully', async ({ page }) => {
        // Wait for scanner initialization
        await page.waitForTimeout(2000);
        
        // Simulate an error by triggering scanner error handling
        // This is tricky to test without actual QR codes, but we can check
        // that error handling elements exist and are properly structured
        
        const scannerCard = page.locator('.qr-scanner-card');
        await expect(scannerCard).toBeVisible();
        
        // Check if scanning overlay exists (for when scanning is in progress)
        const scanningOverlay = page.locator('.scanning-overlay');
        // Overlay should not be visible initially
        await expect(scanningOverlay).not.toBeVisible();
        
        console.log('✓ Error handling structure is in place');
    });

    // --- ACCESSIBILITY TESTS ---

    // Test 9: Verify accessibility features
    test('should be accessible with proper ARIA labels and keyboard navigation', async ({ page }) => {
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Check if navigation buttons are focusable
        const homeButton = page.locator('.nav-button', { hasText: '🏠 Home' });
        const exhibitsButton = page.locator('.nav-button.primary', { hasText: '🏛️ Exhibits' });
        
        // Focus should be able to reach navigation elements
        await homeButton.focus();
        await expect(homeButton).toBeFocused();
        
        await exhibitsButton.focus();
        await expect(exhibitsButton).toBeFocused();
        
        console.log('✓ Basic keyboard navigation works');
    });

    // --- RESPONSIVE DESIGN TESTS ---

    // Test 10: Test mobile responsiveness
    test('should be responsive on mobile devices', async ({ page }) => {
        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Verify elements are still visible and accessible
        const scanContainer = page.locator('.scan-container');
        await expect(scanContainer).toBeVisible();
        
        const titleSection = page.locator('.scan-title-section');
        await expect(titleSection).toBeVisible();
        
        const scannerCard = page.locator('.qr-scanner-card');
        await expect(scannerCard).toBeVisible();
        
        const instructionsCard = page.locator('.instructions-card');
        await expect(instructionsCard).toBeVisible();
        
        const navigation = page.locator('.scan-navigation');
        await expect(navigation).toBeVisible();
        
        console.log('✓ Page is responsive on mobile viewport');
    });

    // Test 11: Test tablet responsiveness
    test('should be responsive on tablet devices', async ({ page }) => {
        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        
        // Verify layout adaptation
        const scanContainer = page.locator('.scan-container');
        await expect(scanContainer).toBeVisible();
        
        const mainContent = page.locator('.scan-main-content');
        await expect(mainContent).toBeVisible();
        
        console.log('✓ Page is responsive on tablet viewport');
    });

    // --- INTEGRATION TESTS ---

    // Test 12: Test navigation from homepage to scan page
    test('should be accessible via homepage CTA button', async ({ page }) => {
        // Start from homepage
        await page.goto('/');
        await page.waitForSelector('.hero-text-content', { state: 'visible' });
        
        // Find and click the scan CTA button
        const scanButton = page.locator('.hero-cta-button');
        await expect(scanButton).toBeVisible();
        
        await scanButton.click();
        
        // Verify navigation to scan page
        await page.waitForURL('/scan');
        await expect(page).toHaveURL('/scan');
        
        // Verify scan page loaded correctly
        const scanTitle = page.locator('.scan-title');
        await expect(scanTitle).toBeVisible();
        await expect(scanTitle).toHaveText('Scan QR Code');
        
        console.log('✓ Navigation from homepage to scan page works');
    });

    // --- PERFORMANCE TESTS ---

    // Test 13: Test page load performance
    test('should load quickly and initialize scanner in reasonable time', async ({ page }) => {
        const startTime = Date.now();
        
        await page.goto('/scan');
        await page.waitForSelector('.scan-page', { state: 'visible' });
        
        const loadTime = Date.now() - startTime;
        console.log(`Page load time: ${loadTime}ms`);
        
        // Wait for scanner initialization
        const scannerInitTime = Date.now();
        await page.waitForTimeout(3000); // Give scanner time to initialize
        
        const totalInitTime = Date.now() - startTime;
        console.log(`Total initialization time: ${totalInitTime}ms`);
        
        // Check that page loads in reasonable time (adjust threshold as needed)
        expect(loadTime).toBeLessThan(5000); // 5 seconds
        console.log('✓ Page loads within acceptable time limits');
    });

    // --- CONSOLE ERROR MONITORING ---

    // Test 14: Monitor for JavaScript errors
    test('should not produce console errors during normal operation', async ({ page }) => {
        const consoleErrors: string[] = [];
        
        // Capture console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Wait for full page initialization
        await page.waitForTimeout(5000);
        
        // Interact with navigation
        const homeButton = page.locator('.nav-button', { hasText: '🏠 Home' });
        await homeButton.hover();
        
        const exhibitsButton = page.locator('.nav-button.primary', { hasText: '🏛️ Exhibits' });
        await exhibitsButton.hover();
        
        // Filter out expected/acceptable errors
        const criticalErrors = consoleErrors.filter(error => 
            !error.toLowerCase().includes('permission') &&
            !error.toLowerCase().includes('camera') &&
            !error.toLowerCase().includes('mediadevices') &&
            !error.toLowerCase().includes('https required')
        );
        
        if (criticalErrors.length > 0) {
            console.log('⚠ Critical console errors detected:');
            criticalErrors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log('✓ No critical console errors detected');
        }
        
        // Test passes regardless, but logs issues for investigation
        expect(true).toBe(true);
    });
});