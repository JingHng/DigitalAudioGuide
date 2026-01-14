const express = require('express');
const assistantController = require('../controllers/assistantController');
const { verifyToken } = require('../middleware/jwtMiddleware');

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Chat endpoint
router.post('/chat', assistantController.createMessage);

// Conversation management
router.get('/conversations', assistantController.getAllConversations);
router.post('/conversations', assistantController.createConversation);
router.get('/conversations/:conversationId', assistantController.getConversation);
router.delete('/conversations/:conversationId', assistantController.deleteConversation);

// Messages
router.get('/conversations/:conversationId/messages', assistantController.listMessages);

module.exports = router;
