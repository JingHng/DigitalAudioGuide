import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

test.describe('Exhibits CRUD Operations', () => {
    let authToken: string;
    let createdExhibitId: number;
    let exhibitionId: number;

    // Login before all tests to get auth token
    test.beforeAll(async ({ request }) => {
        try {
            // First, get available exhibitions to use for creating exhibits
            const exhibitionsResponse = await request.get(`${API_URL}/api/exhibitions`);
            const exhibitions = await exhibitionsResponse.json();
            
            if (exhibitions.length > 0) {
                exhibitionId = exhibitions[0].exhibitionId;
            } else {
                console.log('No exhibitions found. Some tests may fail.');
            }

            // Login to get auth token
            const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
                data: {
                    username: 'admin',
                    password: 'admin123'
                }
            });

            if (loginResponse.ok()) {
                const loginData = await loginResponse.json();
                authToken = loginData.accessToken;
            } else {
                console.log('Login failed. CRUD tests will be skipped.');
            }
        } catch (error) {
            console.log('Setup failed:', error);
        }
    });

    // Clean up created exhibit after all tests
    test.afterAll(async ({ request }) => {
        if (authToken && createdExhibitId) {
            try {
                await request.delete(`${API_URL}/api/exhibits/${createdExhibitId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            } catch (error) {
                console.log('Cleanup failed:', error);
            }
        }
    });

    // Test 1: READ - Get all exhibits
    test('should successfully retrieve all exhibits (READ)', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibits`);
        
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const exhibits = await response.json();
        expect(Array.isArray(exhibits)).toBe(true);

        if (exhibits.length > 0) {
            expect(exhibits[0]).toHaveProperty('exhibitId');
            expect(exhibits[0]).toHaveProperty('title');
            expect(exhibits[0]).toHaveProperty('description');
        }
    });

    // Test 2: READ - Get specific exhibit by ID
    test('should successfully retrieve a specific exhibit by ID (READ)', async ({ request }) => {
        // First get all exhibits to get a valid ID
        const listResponse = await request.get(`${API_URL}/api/exhibits`);
        const exhibits = await listResponse.json();

        if (exhibits.length === 0) {
            test.skip();
            return;
        }

        const exhibitId = exhibits[0].exhibitId;
        const response = await request.get(`${API_URL}/api/exhibits/${exhibitId}`);

        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('application/json');

        const exhibit = await response.json();
        expect(exhibit).toHaveProperty('exhibitId', exhibitId);
        expect(exhibit).toHaveProperty('title');
        expect(exhibit).toHaveProperty('description');
    });

    // Test 3: CREATE - Create a new exhibit
    test('should successfully create a new exhibit (CREATE)', async ({ request }) => {
        if (!authToken) {
            test.skip();
            return;
        }

        const newExhibit = {
            title: 'Test Exhibit - Automated',
            description: 'This is a test exhibit created by automated testing',
            exhibitionId: exhibitionId || 1,
            location: 'Test Location',
            yearOfCreation: 2024,
            additionalInformation: 'Additional test information'
        };

        const response = await request.post(`${API_URL}/api/exhibits`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: newExhibit
        });

        expect(response.status()).toBe(201);
        
        const createdExhibit = await response.json();
        expect(createdExhibit).toHaveProperty('exhibitId');
        expect(createdExhibit.title).toBe(newExhibit.title);
        expect(createdExhibit.description).toBe(newExhibit.description);

        // Store the created exhibit ID for later tests
        createdExhibitId = createdExhibit.exhibitId;
    });

    // Test 4: UPDATE - Update an exhibit
    test('should successfully update an existing exhibit (UPDATE)', async ({ request }) => {
        if (!authToken || !createdExhibitId) {
            test.skip();
            return;
        }

        const updatedData = {
            title: 'Updated Test Exhibit',
            description: 'This exhibit has been updated by automated testing',
            location: 'Updated Location',
            yearOfCreation: 2025
        };

        const response = await request.put(`${API_URL}/api/exhibits/${createdExhibitId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            data: updatedData
        });

        expect(response.status()).toBe(200);

        const updatedExhibit = await response.json();
        expect(updatedExhibit.title).toBe(updatedData.title);
        expect(updatedExhibit.description).toBe(updatedData.description);
    });

    // Test 5: READ - Verify updated exhibit
    test('should retrieve the updated exhibit and verify changes (READ)', async ({ request }) => {
        if (!createdExhibitId) {
            test.skip();
            return;
        }

        const response = await request.get(`${API_URL}/api/exhibits/${createdExhibitId}`);
        expect(response.status()).toBe(200);

        const exhibit = await response.json();
        expect(exhibit.title).toBe('Updated Test Exhibit');
        expect(exhibit.description).toContain('updated by automated testing');
    });

    // Test 6: DELETE - Delete an exhibit
    test('should successfully delete an exhibit (DELETE)', async ({ request }) => {
        if (!authToken || !createdExhibitId) {
            test.skip();
            return;
        }

        const response = await request.delete(`${API_URL}/api/exhibits/${createdExhibitId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        expect(response.status()).toBe(200);

        // Verify deletion by trying to GET the deleted exhibit
        const getResponse = await request.get(`${API_URL}/api/exhibits/${createdExhibitId}`);
        expect(getResponse.status()).toBe(404);

        // Clear the ID so cleanup doesn't try to delete again
        createdExhibitId = 0;
    });

    // Test 7: Error Handling - Invalid exhibit ID
    test('should return 404 for non-existent exhibit ID', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibits/999999`);
        expect(response.status()).toBe(404);
    });

    // Test 8: Error Handling - Unauthorized CREATE
    test('should return 401 when creating exhibit without auth token', async ({ request }) => {
        const newExhibit = {
            title: 'Unauthorized Exhibit',
            description: 'This should fail',
            exhibitionId: exhibitionId || 1
        };

        const response = await request.post(`${API_URL}/api/exhibits`, {
            data: newExhibit
        });

        expect(response.status()).toBe(401);
    });

    // Test 9: Error Handling - Unauthorized UPDATE
    test('should return 401 when updating exhibit without auth token', async ({ request }) => {
        // Get a valid exhibit ID first
        const listResponse = await request.get(`${API_URL}/api/exhibits`);
        const exhibits = await listResponse.json();

        if (exhibits.length === 0) {
            test.skip();
            return;
        }

        const exhibitId = exhibits[0].exhibitId;

        const response = await request.put(`${API_URL}/api/exhibits/${exhibitId}`, {
            data: {
                title: 'Unauthorized Update'
            }
        });

        expect(response.status()).toBe(401);
    });

    // Test 10: Error Handling - Unauthorized DELETE
    test('should return 401 when deleting exhibit without auth token', async ({ request }) => {
        // Get a valid exhibit ID first
        const listResponse = await request.get(`${API_URL}/api/exhibits`);
        const exhibits = await listResponse.json();

        if (exhibits.length === 0) {
            test.skip();
            return;
        }

        const exhibitId = exhibits[0].exhibitId;

        const response = await request.delete(`${API_URL}/api/exhibits/${exhibitId}`);

        expect(response.status()).toBe(401);
    });
});

// Additional UI Tests for Exhibits CRUD (if you have admin UI)
test.describe('Exhibits CRUD UI Interactions', () => {
    
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        
        try {
            await page.fill('input[name="username"], input[type="text"]', 'admin');
            await page.fill('input[name="password"], input[type="password"]', 'admin123');
            await page.click('button[type="submit"]');
            
            // Wait for successful login
            await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 5000 });
        } catch (error) {
            console.log('Login UI not available or failed');
        }
    });

    // Test 11: UI - Verify exhibits list page loads
    test('should load exhibits management page', async ({ page }) => {
        // Navigate to exhibits management (adjust URL based on your app)
        await page.goto('/admin/exhibits');
        
        // Wait for page to load
        await page.waitForLoadState('networkidle');
        
        // Check if page loaded successfully
        const pageTitle = page.locator('h1, h2');
        await expect(pageTitle.first()).toBeVisible();
    });
});
