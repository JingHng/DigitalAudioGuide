const prisma = require('../db/prisma');
const { logAuditAction } = require('./auditLogsController');

// Get all roles with pagination, filtering, and sorting
const getAllRoles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "desc",
      dateFrom = "",
      dateTo = "",
      hasUsers = "",
      permissionCount = ""
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      AND: [
        search ? {
          OR: [
            { roleName: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        } : {},
        dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {},
        dateTo ? { createdAt: { lte: new Date(dateTo) } } : {},
        hasUsers === 'true' ? { userRoles: { some: {} } } : 
        hasUsers === 'false' ? { userRoles: { none: {} } } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Get roles with related data
    const roles = await prisma.role.findMany({
      skip,
      take,
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                email: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });

    // Get total count for pagination
    const totalRoles = await prisma.role.count({ where });
    const totalPages = Math.ceil(totalRoles / take);

    // Transform data for frontend
    const transformedRoles = roles.map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        permissionId: rp.permission.permissionId,
        permissionName: rp.permission.permissionName,
        description: rp.permission.description,
      })),
      users: role.userRoles.map((ur) => ({
        userId: ur.user.userId.toString(),
        username: ur.user.username,
        email: ur.user.email,
        status: ur.user.status?.statusName,
        assignedAt: ur.createdAt,
      })),
      userCount: role._count.userRoles,
      permissionCount: role._count.rolePermissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    res.json({
      roles: transformedRoles,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalRoles,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
};

// Get role by ID
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await prisma.role.findUnique({
      where: { roleId: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
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
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Transform data
    const transformedRole = {
      roleId: role.roleId,
      roleName: role.roleName,
      description: role.description,
      permissions: role.rolePermissions.map((rp) => ({
        permissionId: rp.permission.permissionId,
        permissionName: rp.permission.permissionName,
        description: rp.permission.description,
      })),
      users: role.userRoles.map((ur) => ({
        userId: ur.user.userId.toString(),
        username: ur.user.username,
        email: ur.user.email,
        status: ur.user.status?.statusName,
        lastLoginAt: ur.user.lastLoginAt,
        assignedAt: ur.createdAt,
        userCreatedAt: ur.user.createdAt,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };

    res.json(transformedRole);
  } catch (error) {
    console.error("Error fetching role:", error);
    res.status(500).json({ error: "Failed to fetch role" });
  }
};

// Create new role
const createRole = async (req, res) => {
  try {
    const { roleName, description, permissionIds = [] } = req.body;

    // Validate required fields
    if (!roleName) {
      return res.status(400).json({ error: "Role name is required" });
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { roleName },
    });

    if (existingRole) {
      return res
        .status(409)
        .json({ error: "Role with this name already exists" });
    }

    // Validate permissions exist
    if (permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          permissionId: {
            in: permissionIds.map((id) => parseInt(id)),
          },
        },
      });

      if (permissions.length !== permissionIds.length) {
        return res
          .status(400)
          .json({ error: "One or more permissions do not exist" });
      }
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        roleName,
        description: description || null,
      },
    });

    // Assign permissions if provided
    if (permissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: role.roleId,
          permissionId: parseInt(permissionId),
        })),
      });
    }

    // Fetch role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { roleId: role.roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Log the audit action
    const adminUserId = req.user?.userId;
    console.log('Admin user from req.user in createRole:', req.user);
    await logAuditAction(
      adminUserId,
      null,
      'role',
      'create',
      {
        roleId: role.roleId,
        roleName: role.roleName,
        description: role.description,
        permissions: roleWithPermissions.rolePermissions.map(rp => ({
          permissionId: rp.permission.permissionId,
          permissionName: rp.permission.permissionName
        })),
        permissionCount: roleWithPermissions.rolePermissions.length
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      roleId: roleWithPermissions.roleId,
      roleName: roleWithPermissions.roleName,
      description: roleWithPermissions.description,
      permissions: roleWithPermissions.rolePermissions.map((rp) => ({
        permissionId: rp.permission.permissionId,
        permissionName: rp.permission.permissionName,
        description: rp.permission.description,
      })),
      createdAt: roleWithPermissions.createdAt,
    });
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ error: "Failed to create role" });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleName, description, permissionIds } = req.body;

    // Check if role exists and get current permissions for comparison
    const existingRole = await prisma.role.findUnique({
      where: { roleId: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        }
      }
    });

    if (!existingRole) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check for role name conflicts
    if (roleName && roleName !== existingRole.roleName) {
      const conflictRole = await prisma.role.findUnique({
        where: { roleName },
      });

      if (conflictRole) {
        return res.status(409).json({ error: "Role name already exists" });
      }
    }

    // Validate permissions exist if provided
    if (permissionIds && permissionIds.length > 0) {
      const permissions = await prisma.permission.findMany({
        where: {
          permissionId: {
            in: permissionIds.map((id) => parseInt(id)),
          },
        },
      });

      if (permissions.length !== permissionIds.length) {
        return res
          .status(400)
          .json({ error: "One or more permissions do not exist" });
      }
    }

    // Prepare update data
    const updateData = {};
    if (roleName) updateData.roleName = roleName;
    if (description !== undefined) updateData.description = description || null;

    // Update role
    const updatedRole = await prisma.role.update({
      where: { roleId: parseInt(id) },
      data: updateData,
    });

    // Update permissions if provided
    if (permissionIds !== undefined) {
      // Remove existing permissions
      await prisma.rolePermission.deleteMany({
        where: { roleId: parseInt(id) },
      });

      // Add new permissions
      if (permissionIds.length > 0) {
        await prisma.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({
            roleId: parseInt(id),
            permissionId: parseInt(permissionId),
          })),
        });
      }
    }

    // Fetch updated role with permissions
    const roleWithPermissions = await prisma.role.findUnique({
      where: { roleId: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    // Log the audit action
    const adminUserId = req.user?.userId;
    const oldPermissions = existingRole.rolePermissions.map(rp => ({
      permissionId: rp.permission.permissionId,
      permissionName: rp.permission.permissionName
    }));
    const newPermissions = roleWithPermissions.rolePermissions.map(rp => ({
      permissionId: rp.permission.permissionId,
      permissionName: rp.permission.permissionName
    }));

    await logAuditAction(
      adminUserId,
      null,
      'role',
      'update',
      {
        roleId: parseInt(id),
        changes: {
          roleName: existingRole.roleName !== roleWithPermissions.roleName ? {
            from: existingRole.roleName,
            to: roleWithPermissions.roleName
          } : undefined,
          description: existingRole.description !== roleWithPermissions.description ? {
            from: existingRole.description,
            to: roleWithPermissions.description
          } : undefined,
          permissions: JSON.stringify(oldPermissions) !== JSON.stringify(newPermissions) ? {
            from: oldPermissions,
            to: newPermissions,
            added: newPermissions.filter(np => !oldPermissions.some(op => op.permissionId === np.permissionId)),
            removed: oldPermissions.filter(op => !newPermissions.some(np => np.permissionId === op.permissionId))
          } : undefined
        }
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.json({
      roleId: roleWithPermissions.roleId,
      roleName: roleWithPermissions.roleName,
      description: roleWithPermissions.description,
      permissions: roleWithPermissions.rolePermissions.map((rp) => ({
        permissionId: rp.permission.permissionId,
        permissionName: rp.permission.permissionName,
        description: rp.permission.description,
      })),
      updatedAt: roleWithPermissions.updatedAt,
    });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists and get its details
    const role = await prisma.role.findUnique({
      where: { roleId: parseInt(id) },
      include: {
        rolePermissions: {
          include: {
            permission: true
          }
        },
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true
          }
        }
      }
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if role is assigned to users
    if (role._count.userRoles > 0) {
      return res.status(400).json({
        error: `Cannot delete role. It is assigned to ${role._count.userRoles} user(s)`,
      });
    }

    // Delete role (cascade will handle role permissions)
    await prisma.role.delete({
      where: { roleId: parseInt(id) },
    });

    // Log the audit action
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      null,
      'role',
      'delete',
      {
        roleId: parseInt(id),
        roleName: role.roleName,
        description: role.description,
        deletedPermissions: role.rolePermissions.map(rp => ({
          permissionId: rp.permission.permissionId,
          permissionName: rp.permission.permissionName
        })),
        permissionCount: role._count.rolePermissions,
        wasAssignedToUsers: role._count.userRoles
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ error: "Failed to delete role" });
  }
};

// Get role statistics
const getRoleStats = async (req, res) => {
  try {
    const totalRoles = await prisma.role.count();

    const rolesWithUserCounts = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
      orderBy: {
        userRoles: {
          _count: "desc",
        },
      },
    });

    const mostUsedRoles = rolesWithUserCounts.slice(0, 5).map((role) => ({
      roleId: role.roleId,
      roleName: role.roleName,
      userCount: role._count.userRoles,
      permissionCount: role._count.rolePermissions,
    }));

    const recentRoles = await prisma.role.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            userRoles: true,
            rolePermissions: true,
          },
        },
      },
    });

    res.json({
      totalRoles,
      mostUsedRoles,
      recentRoles: recentRoles.map((role) => ({
        roleId: role.roleId,
        roleName: role.roleName,
        description: role.description,
        userCount: role._count.userRoles,
        permissionCount: role._count.rolePermissions,
        createdAt: role.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching role stats:", error);
    res.status(500).json({ error: "Failed to fetch role statistics" });
  }
};

// Assign role to user
const assignRoleToUser = async (req, res) => {
  try {
    const { id } = req.params; // role id
    const { userId } = req.body;

    // Validate inputs
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { roleId: parseInt(id) },
    });

    if (!role) {
      return res.status(404).json({ error: "Role not found" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: BigInt(userId),
          roleId: parseInt(id),
        },
      },
    });

    if (existingAssignment) {
      return res.status(409).json({ error: "User already has this role" });
    }

    // Create assignment
    await prisma.userRole.create({
      data: {
        userId: BigInt(userId),
        roleId: parseInt(id),
      },
    });

    // Log the audit action
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      userId,
      'role',
      'assign',
      {
        roleId: parseInt(id),
        roleName: role.roleName,
        targetUserId: userId,
        targetUsername: user.username,
        targetEmail: user.email
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.json({ message: 'Role assigned to user successfully' });
  } catch (error) {
    console.error("Error assigning role to user:", error);
    res.status(500).json({ error: "Failed to assign role to user" });
  }
};

// Remove role from user
const removeRoleFromUser = async (req, res) => {
  try {
    const { id } = req.params; // role id
    const { userId } = req.body;

    // Validate inputs
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if assignment exists and get role/user details
    const assignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: BigInt(userId),
          roleId: parseInt(id)
        }
      },
      include: {
        role: true,
        user: {
          select: {
            userId: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ error: "User does not have this role" });
    }

    // Remove assignment
    await prisma.userRole.delete({
      where: {
        userId_roleId: {
          userId: BigInt(userId),
          roleId: parseInt(id),
        },
      },
    });

    // Log the audit action
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      userId,
      'role',
      'unassign',
      {
        roleId: parseInt(id),
        roleName: assignment.role.roleName,
        targetUserId: userId,
        targetUsername: assignment.user.username,
        targetEmail: assignment.user.email,
        assignmentDuration: assignment.createdAt ? new Date() - new Date(assignment.createdAt) : null
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.json({ message: 'Role removed from user successfully' });
  } catch (error) {
    console.error("Error removing role from user:", error);
    res.status(500).json({ error: "Failed to remove role from user" });
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRoleStats,
  assignRoleToUser,
  removeRoleFromUser,
};
