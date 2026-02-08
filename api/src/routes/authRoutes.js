const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { uploadImage } = require('../middleware/fileUploads');

// Login route
router.post(
  "/login",
  authController.login,
  jwtMiddleware.generateToken,
  jwtMiddleware.sendToken
);

// Register route
router.post(
  "/register",
  authController.register,
  jwtMiddleware.generateToken,
  jwtMiddleware.sendToken
);

// Forgot password route
router.post("/forgot-password", authController.forgotPassword);

// Reset password route
router.post("/reset-password", authController.resetPassword);

// Email verification routes
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);

// Protected routes (require authentication)
router.get("/profile", jwtMiddleware.verifyToken, authController.getProfile);
router.put("/profile", jwtMiddleware.verifyToken, authController.updateProfile);
router.put("/change-password", jwtMiddleware.verifyToken, authController.changePassword);
router.put("/change-email", jwtMiddleware.verifyToken, authController.changeEmail);
router.put("/change-username", jwtMiddleware.verifyToken, authController.changeUsername);
router.put("/language-preference", jwtMiddleware.verifyToken, authController.updateLanguagePreference);
router.post("/upload-profile-pic", jwtMiddleware.verifyToken, uploadImage.single('profilePicture'), authController.updateProfilePicture );

module.exports = router;




