const express = require('express');
const router = express.Router();
const {
  createPlaybackLog,
  updatePlaybackLog,
  getAllPlaybackLogs,
  getPlaybackAnalytics,
  getUserPlaybackLogs
} = require('../controllers/audioPlaybackController');

// POST /api/audio-logs - Create new playback log entry
router.post('/', createPlaybackLog);

// PUT /api/audio-logs/:logId - Update existing playback log
router.put('/:logId', updatePlaybackLog);

// GET /api/audio-logs - Get all playback logs with pagination and filtering
router.get('/', getAllPlaybackLogs);

// GET /api/audio-logs/analytics - Get playback analytics and statistics
router.get('/analytics', getPlaybackAnalytics);

// GET /api/audio-logs/user/:userId - Get playback logs for specific user
router.get('/user/:userId', getUserPlaybackLogs);

module.exports = router;