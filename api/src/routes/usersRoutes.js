const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  getUserStats,
} = require("../controllers/usersController");
const jwtMiddleware = require("../middleware/jwtMiddleware");
const { checkPermission } = require("../middleware/permissionMiddleware");

// GET /api/users - Get all users with pagination, filtering, and sorting
router.get("/", jwtMiddleware.verifyToken, getAllUsers);

// GET /api/users/stats - Get user statistics
router.get("/stats", jwtMiddleware.verifyToken, getUserStats);

// GET /api/users/:id - Get user by ID
router.get("/:id", jwtMiddleware.verifyToken, getUserById);

// POST /api/users - Create new user
router.post("/", jwtMiddleware.verifyToken, createUser);

// PUT /api/users/:id - Update user
router.put("/:id", jwtMiddleware.verifyToken, updateUser);

// DELETE /api/users/:id - Delete user (suspend)
router.delete("/:id", jwtMiddleware.verifyToken, deleteUser);

// PATCH /api/users/:id/reactivate - Reactivate suspended user
router.patch("/:id/reactivate", jwtMiddleware.verifyToken, reactivateUser);

module.exports = router;
