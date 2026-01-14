const assistantModel = require('../models/assistantModel');
const { generateAIResponse, generateConversationTitle } = require('../services/aiService');

// Sender type constants
const SenderTypes = {
  USER: 1,
  ASSISTANT: 2,
};

/**
 * POST /api/assistant/chat
 * Send a message and get AI response
 */
exports.createMessage = async (req, res) => {
  try {
    const userId = req.user.userId; // From JWT middleware
    let { conversationId } = req.query;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Fetch conversation history for context
    let history = [];
    if (conversationId && conversationId !== 'null' && conversationId !== 'undefined') {
      const result = await assistantModel.listMessages(userId, conversationId, 1, 50);
      history = result.messages;
    }

    // Generate AI response using real AI service
    const aiResponseText = await generateAIResponse(content, history);

    // Make sure conversation exists
    let conversation;
    if (!conversationId || conversationId === 'null' || conversationId === 'undefined') {
      // Create new conversation with AI-generated title
      const title = await generateConversationTitle(content);
      conversation = await assistantModel.createConversation(userId, title);
      conversationId = conversation.conversationId;
    } else {
      conversation = await assistantModel.getConversation(userId, conversationId);
      if (!conversation) {
        const title = await generateConversationTitle(content);
        conversation = await assistantModel.createConversation(userId, title);
        conversationId = conversation.conversationId;
      }
    }

    // Store user message
    const message = await assistantModel.createMessage(
      conversationId,
      SenderTypes.USER,
      content,
    );

    // Store assistant message
    const aiMessage = await assistantModel.createMessage(
      conversationId,
      SenderTypes.ASSISTANT,
      aiResponseText,
    );

    res.status(201).json({ conversation, message, aiMessage });
  } catch (error) {
    console.error('Error in createMessage:', error);
    res.status(500).json({ message: 'Error creating message', error: error.message });
  }
};

/**
 * GET /api/assistant/conversations
 * Get all conversations for current user
 */
exports.getAllConversations = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      pageSize = 10,
      sortBy = 'modifiedAt',
      order = 'desc',
      search = '',
    } = req.query;

    const filter = {};

    const result = await assistantModel.getAllConversations({
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      sortBy,
      order,
      search,
      filter,
      userId,
    });

    res.status(200).json({
      status: 'success',
      data: {
        ...result,
        message: 'Successfully retrieved conversation list',
      },
    });
  } catch (error) {
    console.error('Error in getAllConversations:', error);
    res.status(500).json({ message: 'Error fetching conversations', error: error.message });
  }
};

/**
 * DELETE /api/assistant/conversations/:conversationId
 * Soft delete a conversation
 */
exports.deleteConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const deleted = await assistantModel.deleteConversation(userId, conversationId);
    if (!deleted) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.status(200).json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error in deleteConversation:', error);
    res.status(500).json({ message: 'Error deleting conversation', error: error.message });
  }
};

/**
 * GET /api/assistant/conversations/:conversationId
 * Get a single conversation with messages
 */
exports.getConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const conversation = await assistantModel.getConversation(userId, conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    res.status(200).json({ conversation });
  } catch (error) {
    console.error('Error in getConversation:', error);
    res.status(500).json({ message: 'Error fetching conversation', error: error.message });
  }
};

/**
 * GET /api/assistant/conversations/:conversationId/messages
 * Get messages for a conversation
 */
exports.listMessages = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conversationId } = req.params;
    const { page = 1, pageSize = 100 } = req.query;
    const result = await assistantModel.listMessages(
      userId,
      conversationId,
      Number(page),
      Number(pageSize),
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in listMessages:', error);
    res.status(500).json({ message: 'Error fetching messages', error: error.message });
  }
};

/**
 * POST /api/assistant/conversations
 * Create a new conversation
 */
exports.createConversation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title } = req.body;
    const conversation = await assistantModel.createConversation(userId, title);
    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Error in createConversation:', error);
    res.status(500).json({ message: 'Error creating conversation', error: error.message });
  }
};
