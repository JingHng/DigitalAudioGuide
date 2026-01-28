const express = require("express");
const router = express.Router();

// Badge business logic (CRUD, assignment, queries)
const badgeController = require("../controllers/badgeController");

// JWT authentication middleware (verifies logged-in users)
const jwtMiddleware = require("../middleware/jwtMiddleware");

// Permission-based access control for admin routes
const { checkPermission } = require('../middleware/permissionMiddleware');

// Image upload middleware (multer-based, saves files to /public/images)
const { uploadImage } = require("../middleware/fileUploads");


/* =========================================================
   PUBLIC ROUTES
   These routes can be accessed by anyone (no login required)
   ========================================================= */

// Get all badges with exhibit & exhibition information
// Used for public badge browsing or admin tables
router.get("/allBadges", badgeController.getAllBadges);


/* =========================================================
   USER ROUTES
   These routes require the user to be logged in
   ========================================================= */

// Get all badges earned by the currently logged-in user
router.get(
  "/userBadges",
  jwtMiddleware.verifyToken,     // Ensures user is authenticated
  badgeController.getUserBadges // Returns badges linked to this user
);

// Assign the badge of a specific exhibit to the logged-in user
// The badge is determined via the exhibitId → badge relationship
router.post(
  "/assignBadges/:exhibitId",
  jwtMiddleware.verifyToken,         // User must be logged in
  badgeController.assignBadgesToUser // Links badge to user if not already owned
);


/* =========================================================
   ADMIN ROUTES
   These routes are restricted to admin / super_admin users
   Used for managing badge data
   ========================================================= */

// Create a new badge and assign it to an exhibit
router.post(
  "/",
  jwtMiddleware.verifyToken,                 // Must be authenticated
  checkPermission('create_exhibit'),         // Must have the permission of create exhibit
  badgeController.createBadge                // Creates badge & binds to exhibit
);

// Get all distinct badge styles from the database
// Used to populate the filter dropdown in the admin UI
router.get(
  "/styles",
  jwtMiddleware.verifyToken,
  checkPermission('read_exhibit'), 
  badgeController.getAllBadgeStyles
);

// Update an existing badge (name, description, style, exhibit binding, etc.)
router.put(
  "/:id",
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'), 
  badgeController.updateBadge
);

// Upload or replace the image of a badge
// Expects multipart/form-data with field name "image"
router.post(
  "/:badgeId/upload-image",
  jwtMiddleware.verifyToken,
  checkPermission('update_exhibit'), 
  uploadImage.single("image"),      // Handles file upload & saves it to /public/images
  badgeController.uploadBadgeImage // Updates badge.imageUrl in database
);

// Delete a badge and unassign it from any exhibit
router.delete(
  "/:id",
  jwtMiddleware.verifyToken,
  checkPermission('delete_exhibit'), 
  badgeController.deleteBadge
);

// Admin badge statistics dashboard
router.get(
  "/stats/dashboard",
  jwtMiddleware.verifyToken,
  checkPermission("read_exhibit"),
  badgeController.getBadgeStatsDashboard
);

// Admin exhibition dropdown options for filtering
router.get(
  "/stats/exhibitions",
  jwtMiddleware.verifyToken,
  checkPermission("read_exhibit"),
  badgeController.getExhibitionOptionsForStats
);

module.exports = router;
