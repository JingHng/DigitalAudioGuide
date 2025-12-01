// import { test, expect } from '@playwright/test';

// const API_URL = 'http://localhost:5175';
// const FRONTEND_URL = 'http://localhost:5173';

// const TEST_USER = {
//   username: 'admin',
//   password: 'admin123',
// };

// test.describe('Audio Analytics E2E Tests', () => {
//   let exhibitId: string | null = null;
//   let audioId: string | null = null;
//   let userId: string | null = null;

//   // Setup: Get a valid exhibit with audio for testing
//   test.beforeAll(async ({ request }) => {
//     try {
//       // Get exhibits to find one with audio
//       const exhibitsResponse = await request.get(`${API_URL}/api/exhibits`);
//       const exhibits = await exhibitsResponse.json();
      
//       // Find an exhibit with audio
//       for (const exhibit of exhibits) {
//         if (exhibit.audio && exhibit.audio.length > 0) {
//           exhibitId = exhibit.exhibitId;
//           audioId = exhibit.audio[0].audioId;
//           break;
//         }
//       }

//       // Get user ID for the admin user
//       const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
//         data: {
//           username: TEST_USER.username,
//           password: TEST_USER.password,
//         },
//       });
//       const loginData = await loginResponse.json();
//       // Extract userId from token or make another API call
//       // For now, we'll get it from the user endpoint
//       const usersResponse = await request.get(`${API_URL}/api/users`, {
//         headers: {
//           Authorization: `Bearer ${loginData.token}`,
//         },
//       });
//       const users = await usersResponse.json();
//       const adminUser = users.find((u: any) => u.username === TEST_USER.username);
//       if (adminUser) {
//         userId = adminUser.userId;
//       }
//     } catch (error) {
//       console.log('Setup error:', error);
//     }
//   });

//   // Login before each test
//   test.beforeEach(async ({ page }) => {
//     await page.goto(`${FRONTEND_URL}/login`);

//     await page
//       .getByPlaceholder('Enter your username')
//       .fill(TEST_USER.username);

//     await page
//       .getByPlaceholder('Enter your password')
//       .fill(TEST_USER.password);

//     await page.getByRole('button', { name: 'Login' }).click();

//     // Wait for redirect to dashboard
//     await page.waitForURL('**/admin/dashboard', { timeout: 15000 });
//   });

//   // Test 1: Verify Audio Analytics page loads and displays correctly
//   test('should load audio analytics page and display main components', async ({ page }) => {
//     // Navigate to audio analytics page
//     await page.goto(`${FRONTEND_URL}/admin/audio-analytics`);

//     // Wait for the page to load
//     await page.waitForSelector('.admin-content', { state: 'visible', timeout: 10000 });

//     // Verify page title/header
//     const pageTitle = page.locator('h2.admin-table-title');
//     await expect(pageTitle).toBeVisible();
//     await expect(pageTitle).toContainText('Audio Playback Analytics');

//     // Verify period filter exists
//     const periodFilter = page.locator('label:has-text("Period")').locator('..').locator('select');
//     await expect(periodFilter).toBeVisible();

//     // Verify exhibit filter exists
//     const exhibitFilter = page.locator('label:has-text("Exhibit")').locator('..').locator('select');
//     await expect(exhibitFilter).toBeVisible();

//     // Wait for analytics data to load (or show loading state)
//     await page.waitForTimeout(2000);

//     // Verify KPI cards section exists
//     const kpiCards = page.locator('.kpi-cards');
//     await expect(kpiCards).toBeVisible();

//     // Verify KPI cards are present
//     const totalPlaysCard = page.locator('.kpi-card').filter({ hasText: 'Total Plays' });
//     await expect(totalPlaysCard).toBeVisible();

//     const uniqueUsersCard = page.locator('.kpi-card').filter({ hasText: 'Unique Users' });
//     await expect(uniqueUsersCard).toBeVisible();

//     const totalDurationCard = page.locator('.kpi-card').filter({ hasText: 'Total Duration' });
//     await expect(totalDurationCard).toBeVisible();

//     const avgDurationCard = page.locator('.kpi-card').filter({ hasText: 'Avg Duration' });
//     await expect(avgDurationCard).toBeVisible();

//     // Verify activity table section exists
//     const activityTable = page.locator('.admin-card').filter({ hasText: 'User Activity by Exhibit' });
//     await expect(activityTable).toBeVisible();
//   });

//   // Test 2: Verify analytics data is displayed correctly
//   test('should display analytics data in KPI cards', async ({ page }) => {
//     await page.goto(`${FRONTEND_URL}/admin/audio-analytics`);

//     // Wait for analytics to load
//     await page.waitForSelector('.kpi-cards', { state: 'visible', timeout: 10000 });
//     await page.waitForTimeout(3000); // Give time for data to load

//     // Check that KPI values are displayed (they should be numbers)
//     const totalPlaysValue = page.locator('.kpi-card').filter({ hasText: 'Total Plays' }).locator('.kpi-value .value');
//     await expect(totalPlaysValue).toBeVisible();
//     const totalPlaysText = await totalPlaysValue.textContent();
//     expect(totalPlaysText).toBeTruthy();
//     // Should be a number (even if 0)
//     expect(parseInt(totalPlaysText || '0', 10)).toBeGreaterThanOrEqual(0);

//     const uniqueUsersValue = page.locator('.kpi-card').filter({ hasText: 'Unique Users' }).locator('.kpi-value .value');
//     await expect(uniqueUsersValue).toBeVisible();
//     const uniqueUsersText = await uniqueUsersValue.textContent();
//     expect(uniqueUsersText).toBeTruthy();
//     expect(parseInt(uniqueUsersText || '0', 10)).toBeGreaterThanOrEqual(0);
//   });

//   // Test 3: Test period filter functionality
//   test('should filter analytics by period', async ({ page }) => {
//     await page.goto(`${FRONTEND_URL}/admin/audio-analytics`);

//     // Wait for page to load
//     await page.waitForSelector('.admin-content', { state: 'visible', timeout: 10000 });
//     await page.waitForTimeout(2000);

//     // Get initial total plays value
//     const initialTotalPlays = page.locator('.kpi-card').filter({ hasText: 'Total Plays' }).locator('.kpi-value .value');
//     const initialValue = await initialTotalPlays.textContent();

//     // Change period filter to 7 days
//     const periodFilter = page.locator('label:has-text("Period")').locator('..').locator('select');
//     await periodFilter.selectOption('7d');

//     // Wait for data to reload
//     await page.waitForTimeout(3000);

//     // Verify the page still displays data (values may change)
//     const newTotalPlays = page.locator('.kpi-card').filter({ hasText: 'Total Plays' }).locator('.kpi-value .value');
//     await expect(newTotalPlays).toBeVisible();
//     const newValue = await newTotalPlays.textContent();
//     expect(newValue).toBeTruthy();

//     // Change to 90 days
//     await periodFilter.selectOption('90d');
//     await page.waitForTimeout(3000);

//     // Verify data still loads
//     await expect(newTotalPlays).toBeVisible();
//   });

//   // Test 4: Test that audio playback creates analytics data
//   test('should track audio playback and display in analytics', async ({ page }) => {
//     // Skip if no exhibit with audio was found
//     if (!exhibitId || !audioId) {
//       test.skip();
//       return;
//     }

//     // Navigate to exhibit details page
//     await page.goto(`${FRONTEND_URL}/exhibit/${exhibitId}`);

//     // Wait for exhibit page to load
//     await page.waitForSelector('.exhibit-detail-container', { state: 'visible', timeout: 15000 });
//     await page.waitForSelector('.audio-guide-section', { state: 'visible', timeout: 10000 });

//     // Check if audio player is available and enabled
//     const playButton = page.locator('button.play-pause');
//     const isDisabled = await playButton.getAttribute('disabled');

//     if (isDisabled === null) {
//       // Audio is available, play it
//       await playButton.click();

//       // Wait for audio to start playing
//       await page.waitForTimeout(2000);

//       // Verify play button changed to pause
//       const buttonTitle = await playButton.getAttribute('title');
//       if (buttonTitle === 'Pause') {
//         console.log('✓ Audio playback started');

//         // Play for a few seconds to generate meaningful analytics
//         await page.waitForTimeout(3000);

//         // Pause the audio
//         await playButton.click();
//         await page.waitForTimeout(1000);

//         // Wait a moment for the log to be saved
//         await page.waitForTimeout(2000);
//       }
//     } else {
//       console.log('⚠ Audio player is disabled, skipping playback test');
//     }

//     // Navigate to audio analytics page
//     await page.goto(`${FRONTEND_URL}/admin/audio-analytics`);

//     // Wait for analytics to load
//     await page.waitForSelector('.kpi-cards', { state: 'visible', timeout: 10000 });
//     await page.waitForTimeout(3000);

//     // Verify analytics page loaded successfully
//     const pageTitle = page.locator('h2.admin-table-title');
//     await expect(pageTitle).toBeVisible();
//     await expect(pageTitle).toContainText('Audio Playback Analytics');

//     // Verify KPI cards show data
//     const totalPlaysValue = page.locator('.kpi-card').filter({ hasText: 'Total Plays' }).locator('.kpi-value .value');
//     await expect(totalPlaysValue).toBeVisible();
//   });

//   // Test 5: Verify user activity table displays correctly
//   test('should display user activity table with proper structure', async ({ page }) => {
//     await page.goto(`${FRONTEND_URL}/admin/audio-analytics`);

//     // Wait for page to load
//     await page.waitForSelector('.admin-content', { state: 'visible', timeout: 10000 });
//     await page.waitForTimeout(3000);

//     // Find the activity table section
//     const activitySection = page.locator('.admin-card').filter({ hasText: 'User Activity by Exhibit' });
//     await expect(activitySection).toBeVisible();

//     // Check if table exists
//     const table = activitySection.locator('.admin-table');
//     const tableExists = await table.isVisible().catch(() => false);

//     if (tableExists) {
//       // Verify table headers
//       const headers = table.locator('thead th');
//       await expect(headers.filter({ hasText: 'User' })).toBeVisible();
//       await expect(headers.filter({ hasText: 'Exhibit' })).toBeVisible();
//       await expect(headers.filter({ hasText: 'Total Plays' })).toBeVisible();
//       await expect(headers.filter({ hasText: 'Total Duration' })).toBeVisible();
//       await expect(headers.filter({ hasText: 'First Play' })).toBeVisible();
//       await expect(headers.filter({ hasText: 'Last Activity' })).toBeVisible();

//       // Check if there are any rows (may be empty)
//       const rows = table.locator('tbody tr');
//       const rowCount = await rows.count();
//       console.log(`Found ${rowCount} activity rows in table`);
//     } else {
//       // Table might not exist if there's no data, check for "No playback logs" message
//       const noDataMessage = activitySection.locator('text=No playback logs available');
//       const hasNoData = await noDataMessage.isVisible().catch(() => false);
//       if (hasNoData) {
//         console.log('ℹ No playback logs available (expected for empty database)');
//       }
//     }
//   });

//   // Test 6: Verify API endpoint returns correct data structure
//   test('should verify audio analytics API endpoint returns correct data', async ({ request }) => {
//     // Login to get token
//     const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
//       data: {
//         username: TEST_USER.username,
//         password: TEST_USER.password,
//       },
//     });

//     expect(loginResponse.status()).toBe(200);
//     const loginData = await loginResponse.json();
//     const token = loginData.token;

//     // Test analytics endpoint
//     const analyticsResponse = await request.get(`${API_URL}/api/audio-logs/analytics?period=30d`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     expect(analyticsResponse.status()).toBe(200);

//     const analytics = await analyticsResponse.json();

//     // Verify response structure
//     expect(analytics).toHaveProperty('period');
//     expect(analytics).toHaveProperty('dateRange');
//     expect(analytics).toHaveProperty('summary');
//     expect(analytics).toHaveProperty('topAudioContent');
//     expect(analytics).toHaveProperty('audioByLanguage');

//     // Verify summary structure
//     expect(analytics.summary).toHaveProperty('totalPlays');
//     expect(analytics.summary).toHaveProperty('uniqueUsers');
//     expect(analytics.summary).toHaveProperty('totalDuration');
//     expect(analytics.summary).toHaveProperty('averageDuration');

//     // Verify data types
//     expect(typeof analytics.summary.totalPlays).toBe('number');
//     expect(typeof analytics.summary.uniqueUsers).toBe('number');
//     expect(typeof analytics.summary.totalDuration).toBe('number');
//     expect(typeof analytics.summary.averageDuration).toBe('number');

//     // Verify values are non-negative
//     expect(analytics.summary.totalPlays).toBeGreaterThanOrEqual(0);
//     expect(analytics.summary.uniqueUsers).toBeGreaterThanOrEqual(0);
//     expect(analytics.summary.totalDuration).toBeGreaterThanOrEqual(0);
//     expect(analytics.summary.averageDuration).toBeGreaterThanOrEqual(0);
//   });

//   // Test 7: Verify playback logs API endpoint
//   test('should verify playback logs API endpoint returns correct data', async ({ request }) => {
//     // Login to get token
//     const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
//       data: {
//         username: TEST_USER.username,
//         password: TEST_USER.password,
//       },
//     });

//     expect(loginResponse.status()).toBe(200);
//     const loginData = await loginResponse.json();
//     const token = loginData.token;

//     // Test playback logs endpoint
//     const logsResponse = await request.get(`${API_URL}/api/audio-logs?page=1&limit=10`, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//     expect(logsResponse.status()).toBe(200);

//     const logsData = await logsResponse.json();

//     // Verify response structure
//     expect(logsData).toHaveProperty('logs');
//     expect(logsData).toHaveProperty('pagination');

//     // Verify logs is an array
//     expect(Array.isArray(logsData.logs)).toBe(true);

//     // Verify pagination structure
//     expect(logsData.pagination).toHaveProperty('currentPage');
//     expect(logsData.pagination).toHaveProperty('totalPages');
//     expect(logsData.pagination).toHaveProperty('totalItems');
//     expect(logsData.pagination).toHaveProperty('itemsPerPage');

//     // If there are logs, verify their structure
//     if (logsData.logs.length > 0) {
//       const log = logsData.logs[0];
//       expect(log).toHaveProperty('audioLogsId');
//       expect(log).toHaveProperty('userId');
//       expect(log).toHaveProperty('audioStart');
//       expect(log).toHaveProperty('durationListened');
//     }
//   });
// });

