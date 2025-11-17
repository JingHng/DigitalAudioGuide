const express = require('express');
const router = express.Router();
const {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleStats,
  assignRoleToUser,
  removeRoleFromUser
} = require('../controllers/rolesController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

// GET /api/roles - Get all roles with pagination, filtering, and sorting
router.get('/', jwtMiddleware.verifyToken, getAllRoles);

// GET /api/roles/stats - Get role statistics
router.get('/stats', jwtMiddleware.verifyToken, getRoleStats);

// GET /api/roles/:id - Get role by ID
router.get('/:id', jwtMiddleware.verifyToken, getRoleById);

// POST /api/roles - Create new role
router.post('/', jwtMiddleware.verifyToken, createRole);

// PUT /api/roles/:id - Update role
router.put('/:id', jwtMiddleware.verifyToken, updateRole);

// DELETE /api/roles/:id - Delete role
router.delete('/:id', jwtMiddleware.verifyToken, deleteRole);

// POST /api/roles/:id/assign-user - Assign role to user
router.post('/:id/assign-user', jwtMiddleware.verifyToken, assignRoleToUser);

// DELETE /api/roles/:id/remove-user - Remove role from user
router.delete('/:id/remove-user', jwtMiddleware.verifyToken, removeRoleFromUser);

module.exports = router;
