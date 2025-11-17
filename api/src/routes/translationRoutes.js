const express = require('express');
const router = express.Router();
const { translateText } = require('../controllers/translationController');
const jwtMiddleware = require('../middleware/jwtMiddleware');

router.post('/', jwtMiddleware.verifyToken, translateText);

module.exports = router;