const express = require('express');
const { verifyToken } = require('../middleware/jwtMiddleware');
const {
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats
} = require('../controllers/auditLogsController');

const router = express.Router();

router.get('/',verifyToken, getAllAuditLogs);
router.get('/stats',verifyToken, getAuditStats);
router.get('/:id', verifyToken, getAuditLogById);

module.exports = router;