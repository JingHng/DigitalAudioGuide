const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { verifyToken, requireAdmin } = require('../middleware/jwtMiddleware');

// GET system settings (admin only)
router.get('/system', verifyToken, requireAdmin, settingsController.getSystemSettings);

// PUT system settings (admin only)
router.put('/system', verifyToken, requireAdmin, settingsController.updateSystemSettings);

module.exports = router;
