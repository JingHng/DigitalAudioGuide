// courseRoutes.js

const express = require('express');
const router = express.Router();
// 1. **REQUIRED FIX:** Import the correct controller file and function names
const courseController = require('../controllers/courseController'); 


const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');
const { uploadImage } = require('../middleware/fileUploads');



// Route to get all courses (formerly exhibits)
router.get('/', courseController.getCourses);
// Route to get a specific course by ID
router.get('/:id', courseController.getCourseById);


// ==========================================
// ===    PRIVATE / PROTECTED ROUTES      ===
// ==========================================
// Create a new course
router.post(
  '/', 
  jwtMiddleware.verifyToken, 
  uploadImage.array('images', 10), 
  courseController.createCourse // Updated from exhibitController.createExhibit
);
// Update a course's details (title, description)
router.put('/:id', jwtMiddleware.verifyToken, courseController.updateCourse); // Updated from exhibitController.updateExhibit

// Delete a course
router.delete('/:id', jwtMiddleware.verifyToken, courseController.deleteCourse); // Updated from exhibitController.deleteExhibit

// Upload one or more images for a course
router.post('/:id/image', jwtMiddleware.verifyToken, uploadImage.array('images', 10), courseController.uploadCourseImage); // Updated from exhibitController.uploadExhibitImage

// Generate TTS for a course
router.post('/:id/tts', jwtMiddleware.verifyToken, courseController.generateCourseTTS); // Updated from exhibitController.generateExhibitTTS

// Get QR code for a course
router.get('/:id/qr', courseController.getCourseQRCode); // Updated from exhibitController.getExhibitQRCode

//Update course's activity status
router.patch(
  '/:id/reactivate', 
  jwtMiddleware.verifyToken, 
  checkPermission('update_exhibit'), 
  courseController.reactivateCourse // Updated from exhibitController.reactivateExhibit
);

module.exports = router;