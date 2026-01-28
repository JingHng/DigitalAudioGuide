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

// --- TOUR NAVIGATION ROUTES (Public) ---
const exhibitionController = require('../controllers/exhibitionController');
// Get next exhibit in tour sequence
router.get('/:id/next', exhibitionController.getNextExhibit);
// Get previous exhibit in tour sequence
router.get('/:id/previous', exhibitionController.getPreviousExhibit);


// ==========================================
// ===    PRIVATE / PROTECTED ROUTES      ===
// ==========================================
// Create a new exhibit
router.post(
  '/', 
  jwtMiddleware.verifyToken, 
  uploadImage.fields([
    { name: 'primaryImage', maxCount: 1 },
    { name: 'additionalImages', maxCount: 4 }
  ]), 
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

// --- ADMIN SEQUENCE MANAGEMENT ---
// Batch update exhibit sequences for entire exhibition (OPTIMIZED - Use this for drag-and-drop reordering)
router.put(
  '/exhibition/:exhibitionId/reorder',
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'),
  exhibitionController.batchUpdateExhibitSequences
);

// Update single exhibit sequence order (Admin only)
router.put(
  '/:id/sequence',
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'),
  exhibitionController.updateExhibitSequence
);

module.exports = router;
