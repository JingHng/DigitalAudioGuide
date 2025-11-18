// src/middleware/fileUploads.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define storage paths
const imagesDir = path.join(__dirname, '..', 'public', 'images');
const audioDir = path.join(__dirname, '..', 'public', 'audios');

// Ensure directories exist
fs.mkdirSync(imagesDir, { recursive: true });
fs.mkdirSync(audioDir, { recursive: true });

// Configure storage for image files
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory traversal attacks
    const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + safeOriginalName);
  },
});

// Configure storage for audio files
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, audioDir),
  filename: (req, file, cb) => {
    // Sanitize filename to prevent directory traversal attacks
    const safeOriginalName = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + safeOriginalName);
  },
});

exports.uploadImage = multer({ storage: imageStorage });
exports.uploadAudio = multer({ 
  storage: audioStorage,
  fileFilter: (req, file, cb) => {
    // Accept common audio formats
    const allowedMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
  }
});