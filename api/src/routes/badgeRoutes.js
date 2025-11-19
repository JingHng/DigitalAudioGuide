const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const jwtMiddleware = require("../middleware/jwtMiddleware"); 
// const { checkPermission } = require("../middleware/permissionMiddleware"); 
// const { uploadImage } = require('../middleware/fileUploads');


// --- PUBLIC ROUTES ---
// Get all badges (for everyone)
router.get('/allBadges', badgeController.getAllBadges);
// Get badges of the logged-in user
router.get('/userBadges', jwtMiddleware.verifyToken, badgeController.getUserBadges);


// // --- ADMIN-ONLY ROUTES ---
// // Route to update an existing badge
// router.post(
//   "/:exhibitId/update-badge-image",
//   jwtMiddleware.verifyAccessToken,
//   roleMiddleware(["admin", "super_admin"]),
//   upload.single("image"),
//   exhibitController.updateBadgeImage
// );

module.exports = router;