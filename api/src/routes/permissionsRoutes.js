const express = require('express');
const router = express.Router();
const {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionStats,
  assignPermissionToRole,
  removePermissionFromRole
} = require('../controllers/permissionsController');
const { verifyToken } = require('../middleware/jwtMiddleware');

// GET /api/permissions - Get all permissions with pagination, filtering, and sorting
router.get('/', getAllPermissions);

// GET /api/permissions/stats - Get permission statistics
router.get('/stats', getPermissionStats);

// GET /api/permissions/:id - Get permission by ID
router.get('/:id', getPermissionById);

// POST /api/permissions - Create new permission
router.post('/', verifyToken, createPermission);

// PUT /api/permissions/:id - Update permission
router.put('/:id', verifyToken, updatePermission);

// DELETE /api/permissions/:id - Delete permission
router.delete('/:id', verifyToken, deletePermission);

// POST /api/permissions/:id/assign-role - Assign permission to role
router.post('/:id/assign-role', verifyToken, assignPermissionToRole);

// DELETE /api/permissions/:id/remove-role - Remove permission from role
router.delete('/:id/remove-role', verifyToken, removePermissionFromRole);

module.exports = router;
