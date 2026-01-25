import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

/**
 * AI Assistant CRUD Tests
 * Tests core functionality without using Gemini API quota
 */

test.describe.configure({ mode: 'serial' });
test.describe('AI Assistant CRUD Operations', () => {
    let authToken: string;
    let createdConversationId: string;

    test.beforeAll(async ({ request }) => {
        const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
            data: { username: 'admin', password: 'admin123' }
        });

        expect(loginResponse.ok()).toBeTruthy();
        const loginData = await loginResponse.json();
        authToken = loginData.token;
        expect(authToken).toBeDefined();
    });

    test.afterAll(async ({ request }) => {
        // Cleanup: Delete created conversation
        if (authToken && createdConversationId) {
            await request.delete(`${API_URL}/api/assistant/conversations/${createdConversationId}`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        }
    });

    // READ - Get all conversations
    test('should get all conversations', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/assistant/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            params: { page: 1, pageSize: 10 }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data).toHaveProperty('data');
        expect(Array.isArray(data.data.conversationList)).toBe(true);
    });

    // READ - Get conversation by ID
    test('should get a specific conversation by ID', async ({ request }) => {
        const listResponse = await request.get(`${API_URL}/api/assistant/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const listData = await listResponse.json();

        if (listData.data.conversationList.length === 0) test.skip();

        const conversationId = listData.data.conversationList[0].conversationId;
        const response = await request.get(`${API_URL}/api/assistant/conversations/${conversationId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(data.conversation.conversationId).toBe(conversationId);
    });

    // READ - Get non-existent conversation
    test('should return error for non-existent conversation', async ({ request }) => {
        const response = await request.get(`${API_URL}/api/assistant/conversations/non-existent-id`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        // Backend returns 500 for invalid IDs
        expect(response.status()).toBe(500);
    });

    // CREATE - Create new conversation
    test('should create a new conversation', async ({ request }) => {
        if (!authToken) test.skip();

        const uniqueTitle = `Test Conversation - ${Date.now()}`;

        const response = await request.post(`${API_URL}/api/assistant/conversations`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { title: uniqueTitle }
        });

        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body.conversation.title).toBe(uniqueTitle);

        createdConversationId = body.conversation.conversationId;
    });

    // CREATE - Validation test
    test('should fail to create conversation without authentication', async ({ request }) => {
        const response = await request.post(`${API_URL}/api/assistant/conversations`, {
            data: { title: 'Unauthorized Test' }
        });

        expect(response.status()).toBe(401);
    });

    // DELETE - Delete conversation
    test('should delete a conversation', async ({ request }) => {
        if (!authToken || !createdConversationId) test.skip();

        const response = await request.delete(`${API_URL}/api/assistant/conversations/${createdConversationId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(200);
    });

    // DELETE - Verify deletion
    test('should verify conversation deletion', async ({ request }) => {
        if (!createdConversationId) test.skip();

        const response = await request.get(`${API_URL}/api/assistant/conversations/${createdConversationId}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(response.status()).toBe(404);
    });
});
