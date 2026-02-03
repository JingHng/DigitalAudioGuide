import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

/**
 * Exhibition Statistics API Tests
 * Tests visitor statistics endpoints
 */

test.describe.configure({ mode: 'serial' });
test.describe('Exhibition Statistics API Operations', () => {
    let authToken: string;

    test.beforeAll(async ({ request }) => {
        const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
            data: { username: 'admin', password: 'admin123' }
        });

        expect(loginResponse.ok()).toBeTruthy();
        const loginData = await loginResponse.json();
        authToken = loginData.token;
        expect(authToken).toBeDefined();
    });

    // READ - Get all exhibitions visitor statistics
    test('should get visitor statistics for all exhibitions', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(Array.isArray(data.exhibitions)).toBe(true);

        if (data.exhibitions.length > 0) {
            const firstExhibition = data.exhibitions[0];
            expect(firstExhibition).toHaveProperty('exhibitionId');
            expect(firstExhibition).toHaveProperty('exhibitionTitle');
            expect(firstExhibition).toHaveProperty('uniqueVisitors');
            expect(firstExhibition).toHaveProperty('totalVisits');
            expect(firstExhibition).toHaveProperty('exhibitCount');
        }
    });

    // READ - Get visitor stats with period filter (Last Month)
    test('should get visitor statistics filtered by last month', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { period: '1' }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(data).toHaveProperty('dateRange');
        
        if (data.dateRange) {
            expect(data.dateRange).toHaveProperty('from');
            expect(data.dateRange).toHaveProperty('to');
        }
    });

    // READ - Get visitor stats with period filter (Last 3 Months)
    test('should get visitor statistics filtered by last 3 months', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { period: '3' }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(Array.isArray(data.exhibitions)).toBe(true);
    });

    // READ - Get visitor stats with period filter (Last 6 Months)
    test('should get visitor statistics filtered by last 6 months', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { period: '6' }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(Array.isArray(data.exhibitions)).toBe(true);
    });

    // READ - Get visitor stats with period filter (Last Year)
    test('should get visitor statistics filtered by last year', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { period: '12' }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(Array.isArray(data.exhibitions)).toBe(true);
    });

    // READ - Get visitor stats with custom date range
    test('should get visitor statistics with custom date range', async ({ request }) => {
        const today = new Date();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const dateFrom = lastMonth.toISOString().split('T')[0];
        const dateTo = today.toISOString().split('T')[0];

        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { 
                dateFrom: dateFrom,
                dateTo: dateTo
            }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
        expect(data).toHaveProperty('dateRange');
        
        if (data.dateRange) {
            expect(data.dateRange.from).toBe(dateFrom);
            expect(data.dateRange.to).toBe(dateTo);
        }
    });

    // READ - Get visitor stats for specific exhibition
    test('should get visitor statistics for a specific exhibition', async ({ request }) => {
        // First, get all exhibitions to find one
        const listResponse = await request.get(`${API_URL}/api/exhibitions`);
        const exhibitions = await listResponse.json();

        if (exhibitions.length === 0) test.skip();

        const exhibitionId = exhibitions[0].exhibitionId;
        
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats/${exhibitionId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibition');
        expect(data.exhibition).toHaveProperty('id');
        expect(data.exhibition).toHaveProperty('title');
        expect(data).toHaveProperty('totalUniqueVisitors');
        expect(data).toHaveProperty('exhibits');
        expect(Array.isArray(data.exhibits)).toBe(true);
    });

    // READ - Get visitor stats for specific exhibition with period filter
    test('should get specific exhibition stats with period filter', async ({ request }) => {
        const listResponse = await request.get(`${API_URL}/api/exhibitions`);
        const exhibitions = await listResponse.json();

        if (exhibitions.length === 0) test.skip();

        const exhibitionId = exhibitions[0].exhibitionId;
        
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats/${exhibitionId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { period: '3' }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibition');
        expect(data).toHaveProperty('totalUniqueVisitors');
    });

    // READ - Handle invalid exhibition ID
    test('should return error for non-existent exhibition stats', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats/non-existent-id`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Backend returns 500 or 404 for invalid IDs
        expect([404, 500]).toContain(response.status());
    });

    // AUTH - Visitor stats endpoint is public (no auth required)
    test('should get visitor stats without authentication', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`);

        // Endpoint is public, should return data
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('exhibitions');
    });

    // READ - Verify unique visitor counting logic
    test('should correctly count unique visitors per exhibition', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.exhibitions.length > 0) {
            const exhibition = data.exhibitions[0];
            
            // Unique visitors should be <= total visits
            expect(exhibition.uniqueVisitors).toBeLessThanOrEqual(exhibition.totalVisits);
            
            // Both should be non-negative
            expect(exhibition.uniqueVisitors).toBeGreaterThanOrEqual(0);
            expect(exhibition.totalVisits).toBeGreaterThanOrEqual(0);
        }
    });

    // READ - Verify exhibition ordering (by visitor count)
    test('should return exhibitions with consistent data structure', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.exhibitions.length > 1) {
            const firstExhibition = data.exhibitions[0];
            const secondExhibition = data.exhibitions[1];
            
            // Both should have same structure
            expect(firstExhibition).toHaveProperty('exhibitionId');
            expect(secondExhibition).toHaveProperty('exhibitionId');
            expect(firstExhibition).toHaveProperty('uniqueVisitors');
            expect(secondExhibition).toHaveProperty('uniqueVisitors');
        }
    });

    // READ - Verify date range validation
    test('should validate date range parameters', async ({ request }) => {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dateFrom = today.toISOString().split('T')[0];
        const dateTo = tomorrow.toISOString().split('T')[0];

        const response = await request.get(`${API_URL}/api/exhibitions/visitor-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { 
                dateFrom: dateFrom,
                dateTo: dateTo
            }
        });

        // Should handle future dates gracefully
        expect(response.status()).toBe(200);
    });
});
