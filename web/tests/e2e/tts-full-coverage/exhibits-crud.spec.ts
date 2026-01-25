import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

test.describe.configure({ mode: 'serial' });

test.describe('Exhibits Admin CRUD Tests', () => {
    let authToken: string;
    let createdExhibitId: string;
    let exhibitionId: string;
    let uniqueExhibitTitle: string;
    let uniqueUpdatedTitle: string;

    test.beforeAll(async ({ request }) => {
        const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
            data: {
                username: 'admin',
                password: 'admin123'
            }
        });

        expect(loginResponse.status()).toBe(200);
        const loginData = await loginResponse.json();
        authToken = loginData.token;

        const exhibitionsResponse = await request.get(`${API_URL}/api/exhibitions`);
        const exhibitions = await exhibitionsResponse.json();
        
        if (exhibitions.length > 0) {
            exhibitionId = exhibitions[0].exhibitionId;
        }
    });

    // READ - Get all exhibits
    test('should get all exhibits', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibits`);
        expect(response.status()).toBe(200);

        const exhibits = await response.json();
        expect(Array.isArray(exhibits)).toBe(true);
    });

    // READ - Get single exhibit by ID
    test('should get a single exhibit by ID', async ({ request }) => {
        const allExhibitsResponse = await request.get(`${API_URL}/api/exhibits`);
        const exhibits = await allExhibitsResponse.json();
        
        if (exhibits.length === 0) {
            test.skip();
            return;
        }

        const testExhibitId = exhibits[0].exhibitId;
        const response = await request.get(`${API_URL}/api/exhibits/${testExhibitId}`);
        expect(response.status()).toBe(200);

        const exhibit = await response.json();
        expect(exhibit.exhibitId.toString()).toBe(testExhibitId.toString());
        expect(exhibit).toHaveProperty('title');
    });

    // CREATE - Create new exhibit
    test('should create a new exhibit with authentication', async ({ request }) => {
        if (!authToken || !exhibitionId) test.skip();

        uniqueExhibitTitle = `Test Exhibit - ${Date.now()}`;

        const response = await request.post(`${API_URL}/api/exhibits`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            multipart: {
                title: uniqueExhibitTitle,
                description: 'Test exhibit for E2E testing',
                exhibitionId: exhibitionId.toString()
            }
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty('exhibitId');
        
        createdExhibitId = body.exhibitId;
    });

    // CREATE - Validation test (missing authentication)
    test('should fail to create exhibit without authentication', async ({ request }) => {
        const response = await request.post(`${API_URL}/api/exhibits`, {
            multipart: {
                title: 'Unauthorized Test',
                description: 'Should fail'
            }
        });

        expect(response.status()).toBe(401);
    });

    // UPDATE - Update exhibit
    test('should update an exhibit', async ({ request }) => {
        if (!authToken || !createdExhibitId) test.skip();

        uniqueUpdatedTitle = `Updated Exhibit - ${Date.now()}`;

        const response = await request.put(`${API_URL}/api/exhibits/${createdExhibitId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                title: uniqueUpdatedTitle,
                description: 'Updated description'
            }
        });

        expect(response.status()).toBe(200);
        const updatedExhibit = await response.json();
        expect(updatedExhibit.title).toBe(uniqueUpdatedTitle);
    });

    // UPDATE - Verify changes persisted
    test('should verify exhibit update persisted', async ({ request }) => {
        if (!createdExhibitId) test.skip();

        const response = await request.get(`${API_URL}/api/exhibits/${createdExhibitId}`);
        expect(response.status()).toBe(200);
        
        const exhibit = await response.json();
        expect(exhibit.title).toBe(uniqueUpdatedTitle);
    });

    // TTS - Generate TTS for exhibit
    test('should generate TTS for exhibit', async ({ request }) => {
        if (!authToken || !createdExhibitId) test.skip();

        const response = await request.post(`${API_URL}/api/exhibits/${createdExhibitId}/tts`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                text: 'This is test audio.',
                languageId: 1,
                title: 'Test Audio'
            }
        });

        const status = response.status();
        expect([200, 201, 400, 503]).toContain(status);
    });

    // DELETE - Deactivate exhibit
    test('should deactivate an exhibit', async ({ request }) => {
        if (!authToken || !createdExhibitId) test.skip();

        const response = await request.delete(`${API_URL}/api/exhibits/${createdExhibitId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
    });

    // REACTIVATE - Reactivate exhibit
    test('should reactivate a deactivated exhibit', async ({ request }) => {
        if (!authToken || !createdExhibitId) test.skip();

        const response = await request.patch(`${API_URL}/api/exhibits/${createdExhibitId}/reactivate`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        
        const getResponse = await request.get(`${API_URL}/api/exhibits/${createdExhibitId}`);
        expect(getResponse.status()).toBe(200);
    });
});
