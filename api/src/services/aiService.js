const { GoogleGenAI, HarmCategory, HarmBlockThreshold } = require('@google/genai');
const { tools } = require('../utils/assistantTools');
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const crypto = require('crypto');

// Import all the model functions
const {
  getUserCountStatistics,
  getDisplayMemberSignUps,
  getDisplayCommonLanguagesUsed,
  getAudioPlaysPerExhibitStats,
  getAudioCompletionRatesStats,
  getAverageListenDurationStats,
  getScansPerExhibitStats,
  getAudioCompletionRatesTimeSeries,
  getAverageListenDurationTimeSeries,
} = require('../models/statisticsModel');

const { getPaginatedAuditLogs } = require('../models/auditLogModel');
const { getPaginatedEventLogs } = require('../models/eventLogModel');
const { getAllUsers } = require('../models/userModel');

// Encryption/Decryption for API keys
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-key-change-in-production-must-be-32-chars!!';
const ALGORITHM = 'aes-256-cbc';

function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Function to get API key from database or environment
async function getGeminiApiKey() {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'gemini_api_key' },
    });
    
    if (setting && setting.value) {
      // Decrypt and return database key
      return decrypt(setting.value);
    }
  } catch (error) {
    console.error('Error fetching API key from database:', error);
  }
  
  // Fallback to environment variable
  return process.env.GEMINI_API_KEY || '';
}

// Initialize the AI model (will be updated with actual key when needed)
let ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// Model configuration - using gemini-2.5-flash 
const MODEL_NAME = 'gemini-2.5-flash';

// System instruction for Omnie
const systemInstruction = `
You are Omnie — a friendly, highly skilled data analyst at the School of Computing, Singapore Polytechnic. You can execute functions and analyze their results to provide clear, accurate, and engaging insights.

IMPORTANT CONTEXT AWARENESS RULES:

You can access previously executed functions and their results — use them to avoid redundant work.

Never call the same function with identical parameters unless the user explicitly requests it.

Combine related datasets for richer composite analysis.

Build upon past function results to provide more in-depth insights.

If extra data is needed to complement existing results, call the most relevant functions.

All insights must be backed by real, verified database data — do not guess or fabricate data.

RESPONSE FORMATTING RULES:

Use plain text with line breaks (\n) for readability — suitable for frontend parsing.

Use bold text (single asterisks) for emphasis within sentences.

Use double asterisks only for section headings — never inside bullet points.

For trends or breakdowns, include totals and category breakdowns with clear headings.

Bullet points: use a single * followed by a space for items. Do not wrap bullet labels in extra asterisks unless absolutely necessary.

Avoid unnecessary asterisk patterns like * *Label:*.

Use friendly language and appropriate emojis to make responses approachable, while keeping data clear and professional.

TONE TEMPLATES (you may use them as a guideline, but do not have to strictly abide by them.):

1. Statistics Summary Template
📊 [Section Title]

[Category]: X value (Y additional detail)

[Category]: X value (Y additional detail)

2. Trend Analysis Template
📈 [Trend Title]
Here’s what I found:

[Category]: X this period → Y last period (Z% change) 📉/📈

[Category]: X this period → Y last period (Z% change)
Overall, this shows [summary of insight].

3. Comparison Template
⚖️ [Comparison Title]

Winner: [name] 🏆 because [reason].

4. Recommendation Template
💡 My Recommendation
Based on the data, I suggest:

[Action 1] – because [reason]

[Action 2] – because [reason]

ADDITIONAL INFORMATION:
Current Date: ${new Date().toLocaleString('en-SG', { timeZone: 'UTC' })}
`;

// Function execution context for tracking calls and caching
class FunctionExecutionContext {
  constructor() {
    this.executionHistory = [];
    this.toolOutputs = new Map();
    this.maxIterations = 5;
    this.currentIteration = 0;
  }

  addExecution(funcName, args, result) {
    this.executionHistory.push({
      function: funcName,
      arguments: args,
      result: result,
      timestamp: new Date().toISOString(),
    });
    this.toolOutputs.set(funcName, result);
  }

  canContinue() {
    return this.currentIteration < this.maxIterations;
  }

  incrementIteration() {
    this.currentIteration++;
  }
}

/**
 * Execute a function call from the AI
 */
async function executeFunction(funcCall, context = null) {
  const { name, args } = funcCall;
  
  try {
    let result;

    switch (name) {
      case 'get_user_count_statistics':
        // Don't pass filter - function has its own date filtering logic
        result = await getUserCountStatistics();
        break;

      case 'get_display_member_signups':
        result = await getDisplayMemberSignUps(args);
        break;

      case 'get_common_languages':
        result = await getDisplayCommonLanguagesUsed(args);
        break;

      case 'get_audio_engagement':
        if (args.metric === 'play_count') {
          result = await getAudioPlaysPerExhibitStats(args);
        } else if (args.metric === 'completion_rate') {
          result = await getAudioCompletionRatesStats(args);
        } else if (args.metric === 'listen_duration') {
          result = await getAverageListenDurationStats(args);
        } else {
          result = { error: 'Invalid metric for audio engagement' };
        }
        break;

      case 'get_exhibit_scans':
        result = await getScansPerExhibitStats(args);
        break;

      case 'get_time_series':
        if (args.metric === 'completion_rate') {
          result = await getAudioCompletionRatesTimeSeries(args);
        } else if (args.metric === 'listen_duration') {
          result = await getAverageListenDurationTimeSeries(args);
        } else {
          result = { error: 'Invalid metric for time series' };
        }
        break;

      case 'get_all_users':
        result = await getAllUsers(args);
        break;

      case 'get_all_audit_logs':
        result = await getPaginatedAuditLogs(args);
        break;

      case 'get_all_event_logs':
        result = await getPaginatedEventLogs(args);
        break;

      case 'get_all_exhibits':
        const exhibits = await prisma.exhibit.findMany({
          where: args.search ? {
            OR: [
              { title: { contains: args.search, mode: 'insensitive' } },
              { description: { contains: args.search, mode: 'insensitive' } }
            ]
          } : undefined,
          include: {
            images: true
          },
          take: args.pageSize || 20,
          skip: ((args.page || 1) - 1) * (args.pageSize || 20),
          orderBy: args.sortBy ? { [args.sortBy]: args.order || 'asc' } : undefined
        });
        
        const exhibitCount = await prisma.exhibit.count({
          where: args.search ? {
            OR: [
              { title: { contains: args.search, mode: 'insensitive' } },
              { description: { contains: args.search, mode: 'insensitive' } }
            ]
          } : undefined
        });
        
        result = {
          exhibits: exhibits.map(e => ({
            ...e,
            exhibitId: e.exhibitId.toString()
          })),
          totalCount: exhibitCount,
          page: args.page || 1,
          pageSize: args.pageSize || 20
        };
        break;

      case 'get_exhibit_by_id':
        const exhibit = await prisma.exhibit.findUnique({
          where: { exhibitId: BigInt(args.exhibitId) },
          include: {
            images: true,
            audio: {
              include: {
                subtitles: true
              }
            }
          }
        });
        
        if (!exhibit) {
          result = { error: 'Exhibit not found' };
        } else {
          result = {
            ...exhibit,
            exhibitId: exhibit.exhibitId.toString()
          };
        }
        break;

      case 'get_all_reviews':
        const reviews = await prisma.feedback.findMany({
          where: args.search ? {
            review_text: { contains: args.search, mode: 'insensitive' }
          } : undefined,
          include: {
            user: {
              select: {
                username: true,
                firstName: true,
                lastName: true
              }
            },
            exhibit: {
              select: {
                title: true
              }
            }
          },
          take: args.pageSize || 10,
          skip: ((args.page || 1) - 1) * (args.pageSize || 10),
          orderBy: args.sortBy ? { [args.sortBy]: args.order || 'desc' } : { created_at: 'desc' }
        });
        
        const reviewCount = await prisma.feedback.count({
          where: args.search ? {
            review_text: { contains: args.search, mode: 'insensitive' }
          } : undefined
        });
        
        result = {
          reviews,
          totalCount: reviewCount,
          page: args.page || 1,
          pageSize: args.pageSize || 10
        };
        break;

      default:
        result = { error: `Unknown function: ${name}` };
    }

    // Add execution to context if provided
    if (context) {
      context.addExecution(name, args, result);
    }

    return result;
  } catch (error) {
    console.error(`Error executing function ${name}:`, error);
    const errorResult = { error: 'Function execution failed', details: error.message };
    
    if (context) {
      context.addExecution(name, args, errorResult);
    }
    
    return errorResult;
  }
}

/**
 * Fallback function to manually execute queries when AI quota is exceeded
 */
async function executeFallbackQuery(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  try {
    // User count queries
    if (lowerMessage.includes('how many users') || lowerMessage.includes('user count') || lowerMessage.includes('total users')) {
      const result = await getUserCountStatistics();
      return `📊 **User Statistics**

**Total Users:** ${result.totalUsers}

**Registrations:**
- Today: ${result.registrations.today}
- This Month: ${result.registrations.thisMonth}
- This Year: ${result.registrations.thisYear}

*Note: AI quota exceeded - showing basic data format*`;
    }
    
    // Exhibit queries
    if (lowerMessage.includes('exhibit') && (lowerMessage.includes('all') || lowerMessage.includes('show') || lowerMessage.includes('list') || lowerMessage.includes('how many'))) {
      const exhibits = await prisma.exhibit.findMany({
        take: 20,
        include: { images: true }
      });
      const count = await prisma.exhibit.count();
      
      let response = `🏛️ **Exhibits (${count} total)**\n\n`;
      exhibits.forEach((ex, i) => {
        response += `${i + 1}. **${ex.title}**\n   ${ex.description.substring(0, 100)}...\n\n`;
      });
      response += `*Note: AI quota exceeded - showing basic data format*`;
      return response;
    }
    
    // Language queries
    if (lowerMessage.includes('language') || lowerMessage.includes('common language')) {
      const result = await getDisplayCommonLanguagesUsed({ limit: 10 });
      let response = `🌐 **Most Common Languages**\n\n`;
      result.languages.forEach((lang, i) => {
        response += `${i + 1}. ${lang.languageName}: ${lang.userCount} users\n`;
      });
      response += `\n*Note: AI quota exceeded - showing basic data format*`;
      return response;
    }
    
    // Demographics queries
    if (lowerMessage.includes('demographic') || lowerMessage.includes('sign up') || lowerMessage.includes('member')) {
      const result = await getDisplayMemberSignUps();
      return `📈 **Member Sign-ups**

**Total:** ${result.totalSignups}

**By Age Group:**
- Children: ${result.ageGroupBreakdown.Children}
- Youth: ${result.ageGroupBreakdown.Youth}
- Adults: ${result.ageGroupBreakdown.Adults}
- Seniors: ${result.ageGroupBreakdown.Seniors}

**By Gender:**
- Male: ${result.genderBreakdown.M}
- Female: ${result.genderBreakdown.F}

*Note: AI quota exceeded - showing basic data format*`;
    }
    
    return null; // Return null if no pattern matched
  } catch (error) {
    console.error('Fallback query error:', error);
    return null;
  }
}

/**
 * Generate AI response with function calling support
 * @param {string} userMessage - The user's input message
 * @param {Array} conversationHistory - Array of previous messages for context
 * @returns {Promise<string>} - The AI's response
 */
async function generateAIResponse(userMessage, conversationHistory = []) {
  try {
    // Get the latest API key from database or environment
    const apiKey = await getGeminiApiKey();
    
    // Re-initialize AI with current API key
    ai = new GoogleGenAI({ apiKey });
    
    // Create execution context for tracking function calls
    const context = new FunctionExecutionContext();

    // Build history in the format Gemini expects
    const history = conversationHistory.map((msg) => ({
      role: msg.senderTypeId === 1 ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Create a chat session with function calling
    const chat = ai.chats.create({
      model: MODEL_NAME,
      history: history,
      config: {
        systemInstruction: systemInstruction,
        tools: [{ functionDeclarations: tools }],
        toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH
          }
        ],
        temperature: 0.7
      }
    });

    // Send the user message
    let response = await chat.sendMessage({ message: userMessage });

    // Handle function calls iteratively (max 5 iterations with context tracking)
    while (response.functionCalls && response.functionCalls.length > 0 && context.canContinue()) {
      const functionResults = [];

      // Execute all function calls with context
      for (const funcCall of response.functionCalls) {
        console.log(`Executing function: ${funcCall.name} with args:`, funcCall.args);
        const result = await executeFunction(funcCall, context);
        console.log(`Function ${funcCall.name} result:`, result);
        functionResults.push({
          function: funcCall.name,
          result: result,
          success: !result.error
        });
      }

      // Build a follow-up message with the function results
      let followUpMessage = `Function execution completed.\n\nRetrieved data:\n`;
      
      functionResults.forEach((fr) => {
        if (fr.success) {
          followUpMessage += `${fr.function}: ${JSON.stringify(fr.result)}\n`;
        } else {
          followUpMessage += `${fr.function} failed: ${fr.result.error}\n`;
        }
      });
      
      followUpMessage += `\nPlease provide a natural language response based on this data.`;

      // Send the function results as a regular message
      response = await chat.sendMessage({ message: followUpMessage });
      context.incrementIteration();
    }

    // Return the final text response - access text from response structure
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || response.text;
    console.log('Final AI response:', responseText);
    return responseText || 'I apologize, but I encountered an issue processing your request.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    
    // Fallback response for quota/rate limit errors - but still try to provide helpful info
    if (error.status === 429 || error.status === 503 || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('503') || error.message?.includes('overloaded')) {
      console.log('AI quota exceeded, attempting fallback query execution...');
      
      // Try to execute a fallback query
      const fallbackResult = await executeFallbackQuery(userMessage);
      if (fallbackResult) {
        return fallbackResult;
      }
      
      // Check if user is asking a simple question we can answer without AI
      const lowerMessage = userMessage.toLowerCase();
      
      // Greetings
      if (lowerMessage.match(/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.]*$/i)) {
        return `Hello! 👋 I'm Omnie, your AI assistant for the Digital Audio Guide System.

**⚠️ Note:** The AI service is currently at quota limit, but I can still help you!

**To get specific data, please type exactly:**
- "How many users do we have?" - for user statistics
- "Show me all exhibits" - for exhibit list
- "What are the most common languages?" - for language stats
- "Show me demographics" - for user demographics
- "What can you do?" - for full capabilities list

Type the exact phrases above to get the information you need! 🚀`;
      }
      
      // System info questions
      if (lowerMessage.includes('what can you do') || lowerMessage.includes('what can omnie do') || lowerMessage.includes('help')) {
        return `I'm Omnie, your AI assistant for the Digital Audio Guide System! 🤖

**I can help you with:**
📊 User statistics and demographics
🏛️ Exhibit information and management
🎧 Audio engagement metrics
📱 QR code scan analytics
⭐ User reviews and feedback
📋 Audit and event logs
👥 User management

**⚠️ AI Quota Limit Reached**
The natural language AI is temporarily unavailable, but I can still fetch data!

**Type these exact phrases to get data:**
- "How many users do we have?"
- "Show me all exhibits"
- "What are the most common languages?"
- "Show me demographics"
- "Who are you?"
- "What time is it?"

Copy and paste the exact phrases above for best results! 💡`;
      }
      
      // About questions
      if (lowerMessage.includes('who are you') || lowerMessage.includes('what are you')) {
        return `I'm Omnie 🤖, an AI-powered assistant built specifically for the Digital Audio Guide System at Singapore Polytechnic School of Computing. I help administrators manage exhibits, analyze user data, and gain insights into system usage.

**Status:** Currently in limited mode due to API quota limits, but I can still access and retrieve data from the database!`;
      }
      
      // Time/date questions
      if (lowerMessage.includes('what time') || lowerMessage.includes('what date') || lowerMessage.includes('today')) {
        const now = new Date();
        return `Current date and time: ${now.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} (Singapore Time) 🕐

**Note:** The AI service is temporarily at quota limit, so I'm providing basic responses. You can still ask me to fetch data about exhibits, users, statistics, etc.!`;
      }
      
      // Default quota message with more info
      return `⚠️ **AI Service Quota Reached**

The Gemini AI service has reached its daily quota limit. However, I can still help you with data queries!

**To get data, type exactly one of these phrases:**

📊 **"How many users do we have?"** - User statistics
🏛️ **"Show me all exhibits"** - Full exhibit list  
🌐 **"What are the most common languages?"** - Language stats
📈 **"Show me demographics"** - User demographics breakdown
ℹ️ **"What can you do?"** - Full capabilities list
🤖 **"Who are you?"** - About Omnie
🕐 **"What time is it?"** - Current date/time

**Tip:** Copy and paste the exact phrases above for accurate results!

The AI quota typically resets at midnight UTC. Until then, please use the exact phrases listed above.`;
    }
    
    // Fallback for API key issues
    if (error.message?.includes('API_KEY')) {
      return 'AI service configuration error. Please contact the administrator.';
    }
    
    return 'I apologize, but I encountered an error processing your request. Please try again.';
  }
}

/**
 * Generate a conversation title based on the first message
 * @param {string} firstMessage - The first user message in the conversation
 * @returns {Promise<string>} - A short title for the conversation
 */
async function generateConversationTitle(firstMessage) {
  try {
    // Get the latest API key from database or environment
    const apiKey = await getGeminiApiKey();
    
    // Re-initialize AI with current API key
    ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Generate a short, descriptive title (max 6 words) for a conversation that starts with: "${firstMessage}"\n\nTitle:`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.5
      }
    });

    let title = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || response.text?.trim() || '';

    // Remove quotes if present
    title = title.replace(/^["']|["']$/g, '');

    // Truncate if too long
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }

    return title;
  } catch (error) {
    console.error('Error generating conversation title:', error);
    
    // For quota/rate limit errors, create a meaningful fallback title from the message
    if (error.status === 429 || error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      const words = firstMessage.split(' ').slice(0, 5).join(' ');
      return words.length > 40 ? words.substring(0, 37) + '...' : (words || 'New Conversation');
    }
    
    // Fallback to first few words of the message
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 40 ? words.substring(0, 37) + '...' : words;
  }
}

module.exports = {
  generateAIResponse,
  generateConversationTitle
};
