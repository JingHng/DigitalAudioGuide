const { PrismaClient } = require('../../generated/prisma');
const { logUserAction } = require('./auditLogsController');


const prisma = new PrismaClient();

// Get all permissions with pagination, filtering, and sorting
const getAllPermissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = search
      ? {
          OR: [
            { permissionName: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    // Get permissions with related data
    const permissions = await prisma.permission.findMany({
      skip,
      take,
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        rolePermissions: {
          include: {
            role: {
              include: {
                userRoles: {
                  include: {
                    user: {
                      select: {
                        userId: true,
                        username: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalPermissions = await prisma.permission.count({ where });
    const totalPages = Math.ceil(totalPermissions / take);

    // Transform data for frontend
    const transformedPermissions = permissions.map((permission) => {
      // Get unique users who have this permission through roles
      const usersWithPermission = new Map();
      permission.rolePermissions.forEach((rp) => {
        rp.role.userRoles.forEach((ur) => {
          usersWithPermission.set(ur.user.userId.toString(), {
            userId: ur.user.userId.toString(),
            username: ur.user.username,
            email: ur.user.email,
            roleName: rp.role.roleName,
          });
        });
      });

      return {
        permissionId: permission.permissionId,
        permissionName: permission.permissionName,
        description: permission.description,
        roles: permission.rolePermissions.map((rp) => ({
          roleId: rp.role.roleId,
          roleName: rp.role.roleName,
          description: rp.role.description,
          userCount: rp.role.userRoles.length,
        })),
        users: Array.from(usersWithPermission.values()),
        roleCount: permission._count.rolePermissions,
        userCount: usersWithPermission.size,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      };
    });

    res.json({
      permissions: transformedPermissions,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalPermissions,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({ error: "Failed to fetch permissions" });
  }
};

// Get permission by ID
const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await prisma.permission.findUnique({
      where: { permissionId: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            role: {
              include: {
                userRoles: {
                  include: {
                    user: {
                      select: {
                        userId: true,
                        username: true,
                        email: true,
                        status: true,
                        lastLoginAt: true,
                        createdAt: true,
                      },
                    },
                  },
                  orderBy: {
                    createdAt: "desc",
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Get unique users who have this permission through roles
    const usersWithPermission = new Map();
    permission.rolePermissions.forEach((rp) => {
      rp.role.userRoles.forEach((ur) => {
        const userId = ur.user.userId.toString();
        if (!usersWithPermission.has(userId)) {
          usersWithPermission.set(userId, {
            userId,
            username: ur.user.username,
            email: ur.user.email,
            status: ur.user.status?.statusName,
            lastLoginAt: ur.user.lastLoginAt,
            userCreatedAt: ur.user.createdAt,
            roles: [],
          });
        }
        usersWithPermission.get(userId).roles.push({
          roleId: rp.role.roleId,
          roleName: rp.role.roleName,
          assignedAt: ur.createdAt,
        });
      });
    });

    // Transform data
    const transformedPermission = {
      permissionId: permission.permissionId,
      permissionName: permission.permissionName,
      description: permission.description,
      roles: permission.rolePermissions.map((rp) => ({
        roleId: rp.role.roleId,
        roleName: rp.role.roleName,
        description: rp.role.description,
        userCount: rp.role.userRoles.length,
        users: rp.role.userRoles.map((ur) => ({
          userId: ur.user.userId.toString(),
          username: ur.user.username,
          email: ur.user.email,
          status: ur.user.status?.statusName,
          assignedAt: ur.createdAt,
        })),
      })),
      users: Array.from(usersWithPermission.values()),
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };

    res.json(transformedPermission);
  } catch (error) {
    console.error("Error fetching permission:", error);
    res.status(500).json({ error: "Failed to fetch permission" });
  }
};

// Create new permission
const createPermission = async (req, res) => {
  try {
    const { permissionName, description } = req.body;

    // Validate required fields
    if (!permissionName) {
      return res.status(400).json({ error: "Permission name is required" });
    }

    // Check if permission already exists
    const existingPermission = await prisma.permission.findUnique({
      where: { permissionName },
    });

    if (existingPermission) {
      return res
        .status(409)
        .json({ error: "Permission with this name already exists" });
    }

    // Create permission
    const permission = await prisma.permission.create({
      data: {
        permissionName,
        description: description || null,
      },
    });

    // Log audit action
    await logUserAction(
      res.locals.userId || null,
      null,
      'CREATE_PERMISSION',
      {
        permissionName: permission.permissionName,
        description: permission.description
      },
      { ip: req.ip, userAgent: req.get('User-Agent') }
    );

    res.status(201).json({
      permissionId: permission.permissionId,
      permissionName: permission.permissionName,
      description: permission.description,
      createdAt: permission.createdAt,
    });
  } catch (error) {
    console.error("Error creating permission:", error);
    res.status(500).json({ error: "Failed to create permission" });
  }
};

// Update permission
const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionName, description } = req.body;

    // Check if permission exists and get original data for audit
    const existingPermission = await prisma.permission.findUnique({
      where: { permissionId: parseInt(id) },
    });

    if (!existingPermission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Check for permission name conflicts
    if (
      permissionName &&
      permissionName !== existingPermission.permissionName
    ) {
      const conflictPermission = await prisma.permission.findUnique({
        where: { permissionName },
      });

      if (conflictPermission) {
        return res
          .status(409)
          .json({ error: "Permission name already exists" });
      }
    }

    // Prepare update data
    const updateData = {};
    if (permissionName) updateData.permissionName = permissionName;
    if (description !== undefined) updateData.description = description || null;

    // Update permission
    const updatedPermission = await prisma.permission.update({
      where: { permissionId: parseInt(id) },
      data: updateData,
    });

    // Prepare audit changes
    const changes = {
      before: {
        permissionName: existingPermission.permissionName,
        description: existingPermission.description
      },
      after: {
        permissionName: updatedPermission.permissionName,
        description: updatedPermission.description
      }
    };

    // Log audit action
    await logUserAction(
      res.locals.userId || null,
      null,
      'UPDATE_PERMISSION',
      changes,
      { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        permissionId: updatedPermission.permissionId
      }
    );

    res.json({
      permissionId: updatedPermission.permissionId,
      permissionName: updatedPermission.permissionName,
      description: updatedPermission.description,
      updatedAt: updatedPermission.updatedAt,
    });
  } catch (error) {
    console.error("Error updating permission:", error);
    res.status(500).json({ error: "Failed to update permission" });
  }
};

// Delete permission
const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if permission exists and get data for audit
    const permission = await prisma.permission.findUnique({
      where: { permissionId: parseInt(id) },
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Check if permission is assigned to roles
    if (permission._count.rolePermissions > 0) {
      return res.status(400).json({
        error: `Cannot delete permission. It is assigned to ${permission._count.rolePermissions} role(s)`,
      });
    }

    // Log audit action before deletion
    await logUserAction(
      res.locals.userId || null,
      null,
      'DELETE_PERMISSION',
      {
        deletedPermission: {
          permissionName: permission.permissionName,
          description: permission.description,
          roleCount: permission._count.rolePermissions
        }
      },
      { 
        ip: req.ip, 
        userAgent: req.get('User-Agent'),
        permissionId: permission.permissionId
      }
    );

    // Delete permission
    await prisma.permission.delete({
      where: { permissionId: parseInt(id) },
    });

    res.json({ message: "Permission deleted successfully" });
  } catch (error) {
    console.error("Error deleting permission:", error);
    res.status(500).json({ error: "Failed to delete permission" });
  }
};

// Get permission statistics
const getPermissionStats = async (req, res) => {
  try {
    const totalPermissions = await prisma.permission.count();

    const permissionsWithRoleCounts = await prisma.permission.findMany({
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
        rolePermissions: {
          include: {
            role: {
              include: {
                _count: {
                  select: {
                    userRoles: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        rolePermissions: {
          _count: "desc",
        },
      },
    });

    const mostUsedPermissions = permissionsWithRoleCounts
      .slice(0, 5)
      .map((permission) => {
        const totalUsers = permission.rolePermissions.reduce(
          (sum, rp) => sum + rp.role._count.userRoles,
          0
        );

        return {
          permissionId: permission.permissionId,
          permissionName: permission.permissionName,
          roleCount: permission._count.rolePermissions,
          userCount: totalUsers,
        };
      });

    const recentPermissions = await prisma.permission.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            rolePermissions: true,
          },
        },
      },
    });

    // Get permissions by category (if we had categories)
    const permissionsByType = await prisma.permission.groupBy({
      by: ["permissionName"],
      _count: {
        permissionId: true,
      },
    });

    // Categorize permissions by common prefixes
    const categories = {};
    permissionsByType.forEach((p) => {
      const prefix = p.permissionName.split("_")[0] || "other";
      if (!categories[prefix]) {
        categories[prefix] = 0;
      }
      categories[prefix] += p._count.permissionId;
    });

    res.json({
      totalPermissions,
      mostUsedPermissions,
      recentPermissions: recentPermissions.map((permission) => ({
        permissionId: permission.permissionId,
        permissionName: permission.permissionName,
        description: permission.description,
        roleCount: permission._count.rolePermissions,
        createdAt: permission.createdAt,
      })),
      categorizedPermissions: Object.entries(categories).map(
        ([category, count]) => ({
          category,
          count,
        })
      ),
    });
  } catch (error) {
    console.error("Error fetching permission stats:", error);
    res.status(500).json({ error: "Failed to fetch permission statistics" });
  }
};

// Assign permission to role
const assignPermissionToRole = async (req, res) => {
  try {
    const { id } = req.params; // permission id
    const { roleId } = req.body;

    // Validate inputs
    if (!roleId) {
      return res.status(400).json({ error: "Role ID is required" });
    }

    // Check if permission exists
    const permission = await prisma.permission.findUnique({
      where: { permissionId: parseInt(id) },
    });

    if (!permission) {
      return res.status(404).json({ error: "Permission not found" });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { roleId: parseInt(roleId) },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: parseInt(roleId),
          permissionId: parseInt(id),
        },
      },
    });

    if (existingAssignment) {
      return res
        .status(409)
        .json({ error: "Role already has this permission" });
    }

    // Create assignment
    await prisma.rolePermission.create({
      data: {
        roleId: parseInt(roleId),
        permissionId: parseInt(id),
      },
    });

    res.json({ message: "Permission assigned to role successfully" });
  } catch (error) {
    console.error("Error assigning permission to role:", error);
    res.status(500).json({ error: "Failed to assign permission to role" });
  }
};

// Remove permission from role
const removePermissionFromRole = async (req, res) => {
  try {
    const { id } = req.params; // permission id
    const { roleId } = req.body;

    // Validate inputs
    if (!roleId) {
      return res.status(400).json({ error: "Role ID is required" });
    }

    // Check if assignment exists
    const assignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: {
          roleId: parseInt(roleId),
          permissionId: parseInt(id),
        },
      },
    });

    if (!assignment) {
      return res
        .status(404)
        .json({ error: "Role does not have this permission" });
    }

    // Remove assignment
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: parseInt(roleId),
          permissionId: parseInt(id),
        },
      },
    });

    res.json({ message: "Permission removed from role successfully" });
  } catch (error) {
    console.error("Error removing permission from role:", error);
    res.status(500).json({ error: "Failed to remove permission from role" });
  }
};

module.exports = {
  getAllPermissions,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getPermissionStats,
  assignPermissionToRole,
  removePermissionFromRole,
};
