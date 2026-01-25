const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/jwtMiddleware');

// GET system settings (admin only)
router.get('/system', verifyToken, requireAdmin, settingsController.getSystemSettings);

// PUT system settings (admin only)
router.put('/system', verifyToken, requireAdmin, settingsController.updateSystemSettings);

// GET Gemini API key (admin only)
router.get('/gemini-api-key', verifyToken, requireAdmin, settingsController.getGeminiApiKey);

// PUT Gemini API key (admin only)
router.put('/gemini-api-key', verifyToken, requireAdmin, settingsController.updateGeminiApiKey);

// DELETE Gemini API key (admin only)
router.delete('/gemini-api-key', verifyToken, requireAdmin, settingsController.deleteGeminiApiKey);

module.exports = router;
