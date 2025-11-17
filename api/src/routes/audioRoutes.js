const express = require('express');
const router = express.Router();
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { uploadAudio } = require('../middleware/fileUploads');

const {
  getAllAudio,
  getAudioById,
  createAudio,
  updateAudio,
  deleteAudio,
  getAudioByExhibit,
  uploadAudioFile,
  generateAudioTTS
} = require('../controllers/audioController');

// GET /api/audio - Get all audio files with pagination and filtering
router.get('/', jwtMiddleware.verifyToken, checkPermission('read_audio'), getAllAudio);

// GET /api/audio/:id - Get specific audio file by ID
router.get('/:id', jwtMiddleware.verifyToken, checkPermission('read_audio'), getAudioById);

// POST /api/audio - Create new audio file
router.post('/', jwtMiddleware.verifyToken, checkPermission('create_audio'), createAudio);

// PUT /api/audio/:id - Update audio file
router.put('/:id', jwtMiddleware.verifyToken, checkPermission('update_audio'), updateAudio);

// DELETE /api/audio/:id - Delete audio file
router.delete('/:id', jwtMiddleware.verifyToken, checkPermission('delete_audio'), deleteAudio);

// GET /api/audio/exhibit/:exhibitId - Get audio files for specific exhibit
router.get('/exhibit/:exhibitId', jwtMiddleware.verifyToken, checkPermission('read_audio'), getAudioByExhibit);

// POST /api/audio/upload - Upload audio file
router.post('/upload', jwtMiddleware.verifyToken, checkPermission('create_audio'), uploadAudio.single('audio'), uploadAudioFile);

// POST /api/audio/:id/tts - Generate TTS for audio
router.post('/:id/tts', jwtMiddleware.verifyToken, checkPermission('create_audio'), generateAudioTTS);

module.exports = router;