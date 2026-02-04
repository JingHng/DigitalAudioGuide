const express = require('express');
const {
    getActiveFloatingCards,
    getAllFloatingCards,
    createFloatingCard,
    updateFloatingCard,
    deleteFloatingCard,
} = require('../controllers/floatingCardController.js');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// Public route - get active floating cards for homepage
router.get('/active', getActiveFloatingCards);

// Admin routes - require authentication only (no specific permission needed)
router.get('/', jwtMiddleware.verifyToken, getAllFloatingCards);
router.post('/', jwtMiddleware.verifyToken, createFloatingCard);
router.put('/:id', jwtMiddleware.verifyToken, updateFloatingCard);
router.delete('/:id', jwtMiddleware.verifyToken, deleteFloatingCard);

module.exports = router;
