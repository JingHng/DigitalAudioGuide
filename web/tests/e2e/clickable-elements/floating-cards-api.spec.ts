import { test, expect, Page } from '@playwright/test';

test.describe('Floating Cards API Tests', () => {
    
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

    test('should fetch all floating cards from API', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards', {
            headers: {
                'Authorization': `Bearer ${await page.evaluate(() => localStorage.getItem('token'))}`
            }
        });
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
    });

    test('should fetch active floating cards without auth', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        
        data.forEach((card: any) => {
            expect(card.isActive).toBe(true);
        });
    });

    test('should return cards ordered by position', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.length > 1) {
            for (let i = 1; i < data.length; i++) {
                expect(data[i].position).toBeGreaterThanOrEqual(data[i - 1].position);
            }
        }
    });

    test('should validate required fields exist', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.length > 0) {
            const card = data[0];
            expect(card).toHaveProperty('cardId');
            expect(card).toHaveProperty('title');
            expect(card).toHaveProperty('icon');
            expect(card).toHaveProperty('linkUrl');
            expect(card).toHaveProperty('position');
        }
    });

    test('should validate UUID format for card ID', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.length > 0) {
            const card = data[0];
            const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(card.cardId).toMatch(uuidPattern);
        }
    });

    test('should validate createdAt timestamp', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const data = await response.json();
        
        if (data.length > 0) {
            const card = data[0];
            const createdAt = new Date(card.createdAt);
            expect(createdAt.toString()).not.toBe('Invalid Date');
        }
    });

    test('should validate maximum 3 active cards', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const activeCards = await response.json();
        expect(activeCards.length).toBeLessThanOrEqual(3);
    });

    test('should return active cards only', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const activeCards = await response.json();
        
        activeCards.forEach((card: any) => {
            expect(card.isActive).toBe(true);
        });
    });

    test('should handle concurrent requests', async ({ page }) => {
        const requests = [
            page.request.get('/api/home/floating-cards/active'),
            page.request.get('/api/home/floating-cards/active'),
            page.request.get('/api/home/floating-cards/active')
        ];
        
        const responses = await Promise.all(requests);
        
        responses.forEach(response => {
            expect(response.status()).toBe(200);
        });
    });

    test('should return consistent data structure', async ({ page }) => {
        const response = await page.request.get('/api/home/floating-cards/active');
        
        expect(response.status()).toBe(200);
        const cards = await response.json();
        
        if (cards.length > 0) {
            const requiredFields = ['cardId', 'title', 'icon', 'linkUrl', 'position'];
            cards.forEach((card: any) => {
                requiredFields.forEach(field => {
                    expect(card).toHaveProperty(field);
                });
            });
        }
    });
});
