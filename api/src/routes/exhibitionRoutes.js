
const express = require('express');
const router = express.Router();
const exhibitionsController = require('../controllers/exhibitionController');
const jwtMiddleware = require("../middleware/jwtMiddleware"); 
const { checkPermission } = require("../middleware/permissionMiddleware"); 
const { uploadImage } = require('../middleware/fileUploads');


// --- PUBLIC ROUTES ---
// This route gets the list of all main exhibitions
router.get('/', exhibitionsController.getAllExhibitions);
// This route gets a single exhibition and the list of exhibits inside it
router.get('/:id', exhibitionsController.getExhibitionById);

// --- TOUR ROUTES (Public) ---
// Get exhibition with exhibits ordered by sequence for tour experience
router.get('/:id/tour', exhibitionsController.getExhibitionTour);


// --- ADMIN-ONLY ROUTES ---
// Route to create a new main exhibition
router.post(
  '/',
  jwtMiddleware.verifyToken,
  checkPermission('create_exhibit'),
  uploadImage.single('image'), 
  exhibitionsController.createExhibition
);

// Route to update a main exhibition
router.put(
  '/:id',
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'),
  uploadImage.single('image'), 
  exhibitionsController.updateExhibition
);

// Route to delete a main exhibition
router.delete(
  '/:id',
  jwtMiddleware.verifyToken,
  checkPermission('delete_exhibit'),
  exhibitionsController.deleteExhibition
);


router.get(
  '/admin/all',
  jwtMiddleware.verifyToken,
  checkPermission('read_exhibit'),
  exhibitionsController.getAllExhibitionsWithExhibits
);

router.patch(
  '/:id/reactivate',
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'), // Use the same permission as update
  exhibitionsController.reactivateExhibition
);


module.exports = router;