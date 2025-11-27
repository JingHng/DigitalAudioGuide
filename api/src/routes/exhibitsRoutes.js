const express = require('express');
const router = express.Router();
const exhibitController = require('../controllers/exhibitsController');


const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { uploadImage } = require('../middleware/fileUploads');



// Route to get all exhibits
router.get('/', exhibitController.getExhibits);
// Route to get a specific exhibit by ID
router.get('/:id', exhibitController.getExhibitById);


// ==========================================
// ===    PRIVATE / PROTECTED ROUTES      ===
// ==========================================
// Create a new exhibit
router.post(
  '/', 
  jwtMiddleware.verifyToken, 
  uploadImage.array('images', 10), 
  exhibitController.createExhibit
);
// Update an exhibit's details (title, description)
router.put('/:id', jwtMiddleware.verifyToken, exhibitController.updateExhibit);

// Delete an exhibit
router.delete('/:id', jwtMiddleware.verifyToken, exhibitController.deleteExhibit);

// Upload one or more images for an exhibit
router.post('/:id/image', jwtMiddleware.verifyToken, uploadImage.array('images', 10), exhibitController.uploadExhibitImage); // Handles up to 10 images

// Generate TTS for an exhibit
router.post('/:id/tts', jwtMiddleware.verifyToken, exhibitController.generateExhibitTTS);

// Get QR code for an exhibit
router.get('/:id/qr', exhibitController.getExhibitQRCode);

//Update exhibit's activity status
router.patch(
  '/:id/reactivate', 
  jwtMiddleware.verifyToken, 
  checkPermission('update_exhibit'), 
  exhibitController.reactivateExhibit
);

module.exports = router;
