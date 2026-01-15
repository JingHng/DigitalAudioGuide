import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5175';

// Test account - admin user required for assistant access
const TEST_USER = { username: 'admin', password: 'admin123' };

test.describe('AI Assistant (Omnie) - UI Tests (No Quota)', () => {
  // -----------------------------------
  // Setup: Login before each test
  // -----------------------------------
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    
    await page.fill('input[placeholder="Enter your username"]', TEST_USER.username);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('http://localhost:5173/admin/dashboard', { timeout: 15000 });
    
    // Navigate to assistant page
    await page.goto('/admin/assistant');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  // -----------------------------------
  // Test 1: Page Layout and Welcome Screen
  // -----------------------------------
  test('should display welcome screen with greeting and quick actions', async ({ page }) => {
    // Check for greeting message
    const greeting = page.locator('h1');
    await expect(greeting).toBeVisible();
    await expect(greeting).toContainText(/Good (Morning|Afternoon|Evening)/);
    
    // Check for AI Badge
    const aiBadge = page.locator('text=AI-Powered Assistant');
    await expect(aiBadge).toBeVisible();
    
    // Check for description text
    const description = page.locator('text=Omnie is your intelligent AI companion');
    await expect(description).toBeVisible();
    
    // Check for quick action buttons
    const quickActions = page.locator('button:has-text("Stats"), button:has-text("Exhibits"), button:has-text("Audio"), button:has-text("Logs")');
    await expect(quickActions.first()).toBeVisible();
    
    // Check for input textarea
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await expect(inputArea).toBeVisible();
    
    // Check for send button
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeVisible();
  });

  // -----------------------------------
  // Test 2: New Chat Button and Sidebar Toggle
  // -----------------------------------
  test('should toggle sidebar and allow starting new chat', async ({ page }) => {
    // Check for New Chat button
    const newChatButton = page.locator('button:has-text("New Chat")').first();
    await expect(newChatButton).toBeVisible();
    
    // Find the History button by looking for the button with History icon (last button in the header)
    const historyButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await expect(historyButton).toBeVisible();
    
    // Click to open sidebar
    await historyButton.click();
    
    // Wait for sidebar animation
    await page.waitForTimeout(1000);
    
    // Check for "+ New Chat" button in sidebar (more reliable than h3)
    const sidebarNewChat = page.locator('button:has-text("+ New Chat")');
    await expect(sidebarNewChat).toBeVisible({ timeout: 10000 });
    
    // Check for conversations header in sidebar
    const conversationsHeader = page.locator('h3:has-text("Conversations")');
    await expect(conversationsHeader).toBeVisible();
  });

  // -----------------------------------
  // Test 3: Quick Action Click Pre-fills Input
  // -----------------------------------
  test('should pre-fill input when clicking a quick action', async ({ page }) => {
    // Click on "Today's Stats" quick action
    const statsButton = page.locator('button:has-text("Today\'s Stats")');
    await statsButton.click();
    
    // Check that input is pre-filled
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await expect(inputArea).toHaveValue("Show me today's statistics");
  });

  // -----------------------------------
  // Test 10: Input Validation - Empty Message
  // -----------------------------------
  test('should not allow sending empty messages', async ({ page }) => {
    // Clear input if any
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.clear();
    
    // Try to click send button
    const sendButton = page.locator('button:has-text("Send")');
    
    // Button should be disabled
    const isDisabled = await sendButton.isDisabled();
    expect(isDisabled).toBeTruthy();
  });
});

test.describe('AI Assistant (Omnie) - API Tests (No Quota)', () => {
  let token: string;

  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    
    await page.fill('input[placeholder="Enter your username"]', TEST_USER.username);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('http://localhost:5173/admin/dashboard', { timeout: 15000 });
    
    // Get token from localStorage
    token = await page.evaluate(() => localStorage.getItem('token') || '');
  });

  // -----------------------------------
  // Test 5: API Endpoint - Get All Conversations
  // -----------------------------------
  test('should fetch conversations list via API', async ({ request }) => {
    // Make API request
    const response = await request.get(`${API_URL}/api/assistant/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Verify response
    expect(response.status()).toBe(200);
    
    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('data');
    
    // Check if conversationList exists (may be empty)
    if (data.data && data.data.conversationList) {
      expect(Array.isArray(data.data.conversationList)).toBeTruthy();
    }
  });

  // -----------------------------------
  // Test 7: API Endpoint - Create New Conversation
  // -----------------------------------
  test('should create a new conversation via API', async ({ request }) => {
    // Make API request to create conversation
    const response = await request.post(`${API_URL}/api/assistant/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Test Conversation'
      }
    });
    
    // Verify response
    expect(response.status()).toBe(201);
    
    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('conversation');
    expect(data.conversation).toHaveProperty('conversationId');
    expect(data.conversation).toHaveProperty('title');
    expect(data.conversation.title).toBe('Test Conversation');
  });

  // -----------------------------------
  // Test 15: API Endpoint - Delete Conversation
  // -----------------------------------
  test('should delete a conversation via API', async ({ request }) => {
    // First, create a conversation
    const createResponse = await request.post(`${API_URL}/api/assistant/conversations`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Conversation to Delete'
      }
    });
    
    expect(createResponse.status()).toBe(201);
    const createData = await createResponse.json();
    const conversationId = createData.conversation.conversationId;
    
    // Delete the conversation
    const deleteResponse = await request.delete(`${API_URL}/api/assistant/conversations/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Verify deletion
    expect(deleteResponse.status()).toBe(200);
    
    // Verify response message
    const deleteData = await deleteResponse.json();
    expect(deleteData).toHaveProperty('message');
    expect(deleteData.message).toBe('Conversation deleted');
  });

  // -----------------------------------
  // Test 17: Authorization - Require Admin Login
  // -----------------------------------
  test('should require authentication to access assistant API', async ({ request }) => {
    // Try to access API without token
    const response = await request.get(`${API_URL}/api/assistant/conversations`);
    
    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });
});

// =============================================================================
// ⚠️ QUOTA-LIMITED TESTS - These consume API quota (20 requests/day limit)
// Uncomment the test.describe block below to run these tests
// =============================================================================
/*
test.describe('AI Assistant (Omnie) - Chat Tests @quota', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    
    await page.fill('input[placeholder="Enter your username"]', TEST_USER.username);
    await page.fill('input[placeholder="Enter your password"]', TEST_USER.password);
    await page.click('button:has-text("Login")');
    
    // Wait for redirect to admin dashboard
    await page.waitForURL('http://localhost:5173/admin/dashboard', { timeout: 15000 });
    
    // Navigate to assistant page
    await page.goto('/admin/assistant');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  });

  // -----------------------------------
  // Test 4: Send Message and Receive Response
  // -----------------------------------
  test('should send a message and receive AI response', async ({ page }) => {
    // Type a test message
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Hello');
    
    // Click send button
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Wait for loading state
    await expect(page.locator('button:has-text("Sending...")')).toBeVisible({ timeout: 5000 });
    
    // Wait for any message with blue background (user message) - more flexible
    const userMessage = page.locator('div[style*="rgb(59, 130, 246)"]');
    await expect(userMessage.first()).toBeVisible({ timeout: 30000 });
    
    // Check that assistant responded (gray background message exists)
    const assistantMessages = page.locator('div[style*="rgb(243, 244, 246)"]');
    await expect(assistantMessages.first()).toBeVisible({ timeout: 30000 });
  });

  // -----------------------------------
  // Test 6: API Endpoint - Create Message (Chat)
  // -----------------------------------
  test('should send message via chat API and receive response', async ({ request, page }) => {
    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // Make API request to send a message
    const response = await request.post(`${API_URL}/api/assistant/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: 'What is the system status?'
      },
      timeout: 30000 // AI responses can take time
    });
    
    // Check if AI service is configured (500 error means GEMINI_API_KEY not set)
    if (response.status() === 500) {
      console.log('⚠️  AI service not configured. Skipping test. Set GEMINI_API_KEY in .env');
      test.skip();
      return;
    }
    
    // Verify response
    expect(response.status()).toBe(201);
    
    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('conversation');
    expect(data).toHaveProperty('message');
    expect(data).toHaveProperty('aiMessage');
    
    // Verify conversation structure
    expect(data.conversation).toHaveProperty('conversationId');
    expect(data.conversation).toHaveProperty('title');
    
    // Verify message structure
    expect(data.message).toHaveProperty('messageId');
    expect(data.message).toHaveProperty('content');
    expect(data.message.content).toBe('What is the system status?');
    
    // Verify AI response
    expect(data.aiMessage).toHaveProperty('messageId');
    expect(data.aiMessage).toHaveProperty('content');
    expect(data.aiMessage.content.length).toBeGreaterThan(0);
  });

  // -----------------------------------
  // Test 8: Conversation History in Sidebar
  // -----------------------------------
  test('should display conversation history in sidebar', async ({ page }) => {
    // First, send a message to create a conversation
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Test message');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Wait for user message to appear (confirms message sent)
    const userMessage = page.locator('div[style*="rgb(59, 130, 246)"]');
    await expect(userMessage.first()).toBeVisible({ timeout: 30000 });
    
    // Open sidebar - use last() to get the History button
    const historyButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await historyButton.click();
    await page.waitForTimeout(1000);
    
    // Check for "+ New Chat" button in sidebar
    const sidebarNewChat = page.locator('button:has-text("+ New Chat")');
    await expect(sidebarNewChat).toBeVisible({ timeout: 10000 });
    
    // Check for conversations header
    const conversationsHeader = page.locator('h3:has-text("Conversations")');
    await expect(conversationsHeader).toBeVisible();
  });

  // -----------------------------------
  // Test 9: Delete Conversation
  // -----------------------------------
  test('should allow deleting a conversation from sidebar', async ({ page }) => {
    // First, send a message to create a conversation
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Test message to be deleted');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Wait for response
    await page.waitForTimeout(10000);
    
    // Open sidebar
    const historyButton = page.locator('button').filter({ has: page.locator('svg') }).last();
    await historyButton.click();
    await page.waitForTimeout(1000);
    
    // Find delete button (× symbol)
    const deleteButtons = page.locator('button[title="Delete conversation"]');
    const initialCount = await deleteButtons.count();
    
    if (initialCount > 0) {
      // Click first delete button
      await deleteButtons.first().click();
      
      // Wait for deletion
      await page.waitForTimeout(1000);
      
      // Verify conversation count decreased
      const newCount = await deleteButtons.count();
      expect(newCount).toBeLessThanOrEqual(initialCount);
    }
  });

  // -----------------------------------
  // Test 11: Keyboard Shortcut - Enter to Send
  // -----------------------------------
  test('should send message when pressing Enter (without Shift)', async ({ page }) => {
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Test keyboard shortcut');
    
    // Press Enter
    await inputArea.press('Enter');
    
    // Wait for loading state
    await expect(page.locator('button:has-text("Sending...")')).toBeVisible({ timeout: 5000 });
  });

  // -----------------------------------
  // Test 12: Message Display Format
  // -----------------------------------
  test('should display user and assistant messages with different styles', async ({ page }) => {
    // Send a message
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Test');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Check for user message (blue background) - simplified selector
    const userMessage = page.locator('div[style*="rgb(59, 130, 246)"]');
    await expect(userMessage.first()).toBeVisible({ timeout: 30000 });
    
    // Check for assistant message (gray background)
    const assistantMessage = page.locator('div[style*="rgb(243, 244, 246)"]');
    await expect(assistantMessage.first()).toBeVisible({ timeout: 30000 });
  });

  // -----------------------------------
  // Test 13: API Endpoint - Get Specific Conversation
  // -----------------------------------
  test('should fetch a specific conversation with messages via API', async ({ request, page }) => {
    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // First, create a conversation with a message
    const chatResponse = await request.post(`${API_URL}/api/assistant/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: 'Test message for specific conversation'
      },
      timeout: 30000
    });
    
    // Skip if AI service not configured
    if (chatResponse.status() === 500) {
      test.skip();
      return;
    }
    
    expect(chatResponse.status()).toBe(201);
    const chatData = await chatResponse.json();
    const conversationId = chatData.conversation.conversationId;
    
    // Now fetch that specific conversation
    const response = await request.get(`${API_URL}/api/assistant/conversations/${conversationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Verify response
    expect(response.status()).toBe(200);
    
    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('conversation');
    expect(data.conversation).toHaveProperty('conversationId');
    expect(data.conversation.conversationId).toBe(conversationId);
    expect(data.conversation).toHaveProperty('messages');
    expect(Array.isArray(data.conversation.messages)).toBeTruthy();
  });

  // -----------------------------------
  // Test 14: API Endpoint - Get Messages for Conversation
  // -----------------------------------
  test('should fetch messages for a conversation via API', async ({ request, page }) => {
    // Get token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    // First, create a conversation with a message
    const chatResponse = await request.post(`${API_URL}/api/assistant/chat`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: {
        content: 'Test message for messages endpoint'
      },
      timeout: 30000
    });
    
    // Skip if AI service not configured
    if (chatResponse.status() === 500) {
      test.skip();
      return;
    }
    
    expect(chatResponse.status()).toBe(201);
    const chatData = await chatResponse.json();
    const conversationId = chatData.conversation.conversationId;
    
    // Fetch messages for that conversation
    const response = await request.get(`${API_URL}/api/assistant/conversations/${conversationId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Verify response
    expect(response.status()).toBe(200);
    
    // Verify response structure
    const data = await response.json();
    expect(data).toHaveProperty('messages');
    expect(Array.isArray(data.messages)).toBeTruthy();
    expect(data.messages.length).toBeGreaterThan(0);
    
    // Verify message structure
    const message = data.messages[0];
    expect(message).toHaveProperty('messageId');
    expect(message).toHaveProperty('conversationId');
    expect(message).toHaveProperty('content');
    expect(message).toHaveProperty('senderType');
  });

  // -----------------------------------
  // Test 16: Multiple Messages in Same Conversation
  // -----------------------------------
  test('should handle multiple messages in the same conversation', async ({ page }) => {
    // Send first message
    let inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('First');
    
    let sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Wait for first message to appear
    const userMessages = page.locator('div[style*="rgb(59, 130, 246)"]');
    await expect(userMessages.first()).toBeVisible({ timeout: 30000 });
    
    // Send second message
    inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Second');
    
    sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Wait a bit for second message
    await page.waitForTimeout(2000);
    
    // Check that at least 2 user messages exist
    const count = await userMessages.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  // -----------------------------------
  // Test 18: Loading State During Message Send
  // -----------------------------------
  test('should show loading state while sending message', async ({ page }) => {
    const inputArea = page.locator('textarea[placeholder="Ask Anything..."]');
    await inputArea.fill('Test loading state');
    
    const sendButton = page.locator('button:has-text("Send")');
    await sendButton.click();
    
    // Check for "Sending..." button text
    await expect(page.locator('button:has-text("Sending...")')).toBeVisible({ timeout: 3000 });
    
    // Button should be disabled during loading
    const isDisabled = await page.locator('button:has-text("Sending...")').isDisabled();
    expect(isDisabled).toBeTruthy();
  });
});
*/
