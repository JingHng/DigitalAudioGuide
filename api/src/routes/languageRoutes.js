const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const {
  getAllLanguages,
  getLanguageById
} = require('../controllers/languageController');

// GET /api/language - Get all languages
router.get('/', jwtMiddleware.verifyToken, checkPermission('read_audio'), getAllLanguages);

// GET /api/language/:id - Get specific language by ID
router.get('/:id', jwtMiddleware.verifyToken, checkPermission('read_audio'), getLanguageById);

module.exports = router;