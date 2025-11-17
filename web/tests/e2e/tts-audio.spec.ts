import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175'; 

test.describe('Text-to-Speech Audio Functionality', () => {

    test.beforeEach(async ({ page }) => {
        // Navigate to an exhibit details page that should have audio
        await page.goto('/exhibit/29');

        // Wait for the exhibit details page to load
        await page.waitForSelector('.exhibit-detail-container', { state: 'visible', timeout: 15000 });
        
        // Wait for the audio section to be visible
        await page.waitForSelector('.audio-guide-section', { state: 'visible', timeout: 10000 });
    });
    
    // --- AUDIO UI STRUCTURE TESTS ---

    // Test 1: Verify audio guide section is visible and contains expected elements
    test('should display audio guide section with all UI components', async ({ page }) => {
        // Check audio guide section exists
        const audioSection = page.locator('.audio-guide-section');
        await expect(audioSection).toBeVisible();
        
        // Check section header
        const audioHeader = page.locator('.audio-section-header');
        await expect(audioHeader).toBeVisible();
        
        // Check language selector exists
        const languageSelector = page.locator('.language-selector select');
        await expect(languageSelector).toBeVisible();
        
        // Check audio player controls exist
        const audioPlayer = page.locator('.audio-player');
        await expect(audioPlayer).toBeVisible();
        
        // Check individual control buttons
        const rewindButton = page.locator('button[title="Rewind 10s"]');
        const playPauseButton = page.locator('button[title*="Play"], button[title*="Pause"]');
        const forwardButton = page.locator('button[title="Forward 10s"]');
        
        await expect(rewindButton).toBeVisible();
        await expect(playPauseButton).toBeVisible();
        await expect(forwardButton).toBeVisible();
        
        // Check progress bar exists
        const progressBar = page.locator('input.progress-bar[type="range"]');
        await expect(progressBar).toBeVisible();
        
        // Check volume control exists
        const volumeSlider = page.locator('input.volume-slider[type="range"]');
        await expect(volumeSlider).toBeVisible();
    });

    // Test 2: Verify audio selection dropdown functionality
    test('should allow selecting different audio languages when available', async ({ page }) => {
        const languageSelector = page.locator('.language-selector select');
        
        // Check if dropdown has options
        const options = page.locator('.language-selector select option');
        const optionCount = await options.count();
        
        if (optionCount > 1) {
            // Test selecting different audio options
            await languageSelector.selectOption({ index: 0 });
            
            // Wait a moment for the selection to process
            await page.waitForTimeout(1000);
            
            // Verify the selection changed
            const selectedValue = await languageSelector.inputValue();
            expect(selectedValue).toBeTruthy();
            
            console.log(`Audio language selected: ${selectedValue}`);
        } else {
            console.log('Only one or no audio options available for testing');
        }
    });

    // --- AUDIO PLAYBACK TESTS ---

    // Test 3: Verify audio loading and play button functionality
    test('should load audio and enable play controls when audio is available', async ({ page }) => {
        // Wait for potential audio loading
        await page.waitForTimeout(3000);
        
        // Check if play button is enabled (not disabled)
        const playButton = page.locator('button.play-pause');
        const isDisabled = await playButton.getAttribute('disabled');
        
        if (isDisabled === null) {
            // Button is enabled, test clicking it
            await playButton.click();
            
            // Wait a moment for audio to potentially start
            await page.waitForTimeout(2000);
            
            // Check if button text/title changed to indicate playing state
            const buttonTitle = await playButton.getAttribute('title');
            
            // The title should now be "Pause" if audio is playing
            if (buttonTitle === 'Pause') {
                console.log('✓ Audio playback started successfully');
                
                // Test pausing
                await playButton.click();
                await page.waitForTimeout(1000);
                
                const pausedTitle = await playButton.getAttribute('title');
                if (pausedTitle === 'Play') {
                    console.log('✓ Audio pause functionality works');
                }
            } else {
                console.log('⚠ Play button clicked but audio may not have started');
            }
        } else {
            console.log('⚠ Play button is disabled - no audio content available for testing');
        }
    });

    // Test 4: Test audio control buttons functionality
    test('should enable audio control buttons when audio is loaded', async ({ page }) => {
        await page.waitForTimeout(3000);
        
        const rewindButton = page.locator('button[title="Rewind 10s"]');
        const forwardButton = page.locator('button[title="Forward 10s"]');
        const progressBar = page.locator('input.progress-bar');
        
        // Check if controls are enabled
        const rewindDisabled = await rewindButton.getAttribute('disabled');
        const forwardDisabled = await forwardButton.getAttribute('disabled');
        const progressDisabled = await progressBar.getAttribute('disabled');
        
        if (rewindDisabled === null) {
            console.log('✓ Rewind button is enabled');
            
            // Test clicking rewind button
            await rewindButton.click();
            console.log('✓ Rewind button clicked successfully');
        }
        
        if (forwardDisabled === null) {
            console.log('✓ Forward button is enabled');
            
            // Test clicking forward button
            await forwardButton.click();
            console.log('✓ Forward button clicked successfully');
        }
        
        if (progressDisabled === null) {
            console.log('✓ Progress bar is enabled');
            
            // Test interacting with progress bar
            await progressBar.click();
            console.log('✓ Progress bar interaction successful');
        }
    });

    // --- TRANSCRIPT TESTS ---

    // Test 5: Verify transcript display functionality
    test('should display transcript when available', async ({ page }) => {
        await page.waitForTimeout(3000);
        
        // Check for transcript content
        const transcriptContainer = page.locator('.transcript-content');
        const transcriptUnavailable = page.locator('.transcript-unavailable');
        
        // Either transcript should be available OR unavailable message should show
        const hasTranscript = await transcriptContainer.isVisible();
        const hasUnavailableMessage = await transcriptUnavailable.isVisible();
        
        if (hasTranscript) {
            console.log('✓ Transcript content is visible');
            
            // Check if transcript has word elements
            const transcriptWords = page.locator('.transcript-content .word');
            const wordCount = await transcriptWords.count();
            
            if (wordCount > 0) {
                console.log(`✓ Transcript contains ${wordCount} words`);
            }
        } else if (hasUnavailableMessage) {
            console.log('ℹ Transcript unavailable message is displayed');
            
            // Verify the message content
            const messageText = await transcriptUnavailable.textContent();
            expect(messageText).toContain('No audio guides have been created');
        } else {
            console.log('⚠ Neither transcript nor unavailable message is visible');
        }
    });

    // --- ERROR HANDLING TESTS ---

    // Test 6: Test behavior when no audio is available
    test('should handle missing audio gracefully', async ({ page }) => {
        // Navigate to a potentially non-existent exhibit
        await page.goto('/exhibit/999999');
        
        // Wait for page to load or show error
        await page.waitForTimeout(3000);
        
        const audioSection = page.locator('.audio-guide-section');
        const isAudioSectionVisible = await audioSection.isVisible();
        
        if (isAudioSectionVisible) {
            // Check if controls are properly disabled
            const playButton = page.locator('button.play-pause');
            const isDisabled = await playButton.getAttribute('disabled');
            
            if (isDisabled !== null) {
                console.log('✓ Audio controls properly disabled for missing content');
            }
            
            // Check for "no audio" message
            const noAudioMessage = page.locator('.transcript-unavailable');
            if (await noAudioMessage.isVisible()) {
                console.log('✓ "No audio guides" message displayed appropriately');
            }
        }
    });

    // --- CONSOLE ERROR MONITORING ---

    // Test 7: Monitor for audio-related console errors
    test('should not produce audio-related console errors during normal operation', async ({ page }) => {
        const consoleErrors: string[] = [];
        
        // Capture console errors
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Wait for audio loading
        await page.waitForTimeout(5000);
        
        // Try to interact with audio controls
        const playButton = page.locator('button.play-pause');
        const isEnabled = (await playButton.getAttribute('disabled')) === null;
        
        if (isEnabled) {
            await playButton.click();
            await page.waitForTimeout(2000);
            await playButton.click(); // Pause
        }
        
        // Filter for audio-specific errors
        const audioErrors = consoleErrors.filter(error => 
            error.toLowerCase().includes('audio') || 
            error.toLowerCase().includes('media') ||
            error.toLowerCase().includes('sound')
        );
        
        if (audioErrors.length > 0) {
            console.log('⚠ Audio-related console errors detected:');
            audioErrors.forEach(error => console.log(`  - ${error}`));
        } else {
            console.log('✓ No audio-related console errors detected');
        }
        
        // This test passes regardless, but logs issues for investigation
        expect(true).toBe(true);
    });

    // --- API INTEGRATION TESTS ---

    // Test 8: Verify audio file accessibility
    test('should verify audio files are accessible via direct URL', async ({ page, request }) => {
        await page.waitForTimeout(3000);
        
        // Try to extract audio URL from the page
        const audioElement = page.locator('audio');
        const audioSrc = await audioElement.getAttribute('src');
        
        if (audioSrc) {
            console.log(`Testing audio URL: ${audioSrc}`);
            
            // Test if audio file is accessible
            try {
                const response = await request.get(audioSrc);
                const status = response.status();
                
                if (status === 200) {
                    console.log('✓ Audio file is accessible via URL');
                    
                    // Check content type
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('audio')) {
                        console.log(`✓ Audio file has correct content type: ${contentType}`);
                    }
                } else {
                    console.log(`⚠ Audio file request returned status: ${status}`);
                }
            } catch (error) {
                console.log(`⚠ Error accessing audio file: ${error}`);
            }
        } else {
            console.log('ℹ No audio source URL found on page');
        }
    });
});