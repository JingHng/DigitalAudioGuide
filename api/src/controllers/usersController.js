const { PrismaClient } = require('../../generated/prisma');
const bcrypt = require('bcryptjs');
const { logUserAction, logAuditAction } = require('./auditLogsController');

const prisma = new PrismaClient();

// Get all users with pagination, filtering, and sorting
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      role = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      emailVerified = '',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    // Validate sortBy parameter to prevent invalid column errors
    const validSortFields = ['userId', 'username', 'email', 'emailVerified', 'createdAt', 'updatedAt', 'lastLoginAt'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      AND: [
        search ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        } : {},
        status ? { status: { statusName: { equals: status, mode: 'insensitive' } } } : {},
        role ? { roles: { some: { role: { roleName: role } } } } : {},
        emailVerified ? { emailVerified: emailVerified === 'true' } : {},
        dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {},
        dateTo ? { createdAt: { lte: new Date(dateTo) } } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Get users with related data
    const users = await prisma.user.findMany({
      skip,
      take,
      where,
      orderBy: { [safeSortBy]: sortOrder },
      include: {
        status: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            feedbacks: true,
            sessions: true,
            playbackLogs: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalUsers = await prisma.user.count({ where });
    const totalPages = Math.ceil(totalUsers / take);

    // Transform data for frontend
    const transformedUsers = users.map(user => ({
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      status: user.status?.statusName || 'Unknown',
      roles: user.roles.map(ur => ur.role.roleName),
      permissions: [...new Set(
        user.roles.flatMap(ur => 
          ur.role.rolePermissions.map(rp => rp.permission.permissionName)
        )
      )],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        feedbackCount: user._count.feedbacks,
        sessionCount: user._count.sessions,
        playbackCount: user._count.playbackLogs
      }
    }));

    res.json({
      users: transformedUsers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(id) },
      include: {
        status: true,
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        },
        feedbacks: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            exhibit: true
          }
        },
        sessions: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Transform data
    const transformedUser = {
      userId: user.userId.toString(),
      username: user.username,
      email: user.email,
      status: user.status?.statusName || 'Unknown',
      roles: user.roles.map(ur => ({
        roleId: ur.role.roleId,
        roleName: ur.role.roleName,
        assignedAt: ur.createdAt
      })),
      permissions: [...new Set(
        user.roles.flatMap(ur => 
          ur.role.rolePermissions.map(rp => rp.permission.permissionName)
        )
      )],
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      recentFeedbacks: user.feedbacks.map(f => ({
        feedbackId: f.feedbackId.toString(),
        rating: f.rating,
        description: f.description,
        exhibitTitle: f.exhibit?.title,
        createdAt: f.createdAt
      })),
      recentSessions: user.sessions.map(s => ({
        sessionId: s.sessionId,
        createdAt: s.createdAt
      }))
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    console.log('Creating user - Admin user from req.user:', req.user);
    const { username, email, password, statusId = 1, roleIds = [] } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        statusId: parseInt(statusId)
      },
      include: {
        status: true
      }
    });

    // Assign roles if provided
    if (roleIds.length > 0) {
      await prisma.userRole.createMany({
        data: roleIds.map(roleId => ({
          userId: user.userId,
          roleId: parseInt(roleId)
        }))
      });
    }

    // Fetch user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { userId: user.userId },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Log audit action
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      userWithRoles.userId.toString(),
      'user',
      'create',
      {
        userId: userWithRoles.userId.toString(),
        username: userWithRoles.username,
        email: userWithRoles.email,
        status: userWithRoles.status?.statusName,
        roles: userWithRoles.roles.map(ur => ur.role.roleName),
        roleCount: userWithRoles.roles.length
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.status(201).json({
      userId: userWithRoles.userId.toString(),
      username: userWithRoles.username,
      email: userWithRoles.email,
      status: userWithRoles.status?.statusName,
      roles: userWithRoles.roles.map(ur => ur.role.roleName),
      createdAt: userWithRoles.createdAt
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, statusId, roleIds, password } = req.body;

    // Check if user exists and get original data for audit
    const existingUser = await prisma.user.findUnique({
      where: { userId: BigInt(id) },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check for username/email conflicts
    if (username || email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { userId: { not: BigInt(id) } },
            {
              OR: [
                username ? { username } : {},
                email ? { email } : {}
              ]
            }
          ]
        }
      });

      if (conflictUser) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }
    }

    // Prepare update data
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (statusId) updateData.statusId = parseInt(statusId);
    if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { userId: BigInt(id) },
      data: updateData,
      include: {
        status: true
      }
    });

    // Update roles if provided
    if (roleIds !== undefined) {
      // Remove existing roles
      await prisma.userRole.deleteMany({
        where: { userId: BigInt(id) }
      });

      // Add new roles
      if (roleIds.length > 0) {
        await prisma.userRole.createMany({
          data: roleIds.map(roleId => ({
            userId: BigInt(id),
            roleId: parseInt(roleId)
          }))
        });
      }
    }

    // Fetch updated user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { userId: BigInt(id) },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Prepare audit changes
    const changes = {
      before: {
        username: existingUser.username,
        email: existingUser.email,
        status: existingUser.status?.statusName,
        roles: existingUser.roles.map(ur => ur.role.roleName)
      },
      after: {
        username: userWithRoles.username,
        email: userWithRoles.email,
        status: userWithRoles.status?.statusName,
        roles: userWithRoles.roles.map(ur => ur.role.roleName)
      }
    };

    // Log audit action
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      userWithRoles.userId.toString(),
      'user',
      'update',
      changes,
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    res.json({
      userId: userWithRoles.userId.toString(),
      username: userWithRoles.username,
      email: userWithRoles.email,
      status: userWithRoles.status?.statusName,
      roles: userWithRoles.roles.map(ur => ur.role.roleName),
      updatedAt: userWithRoles.updatedAt
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

// Soft delete user (suspend user)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and get data for audit
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(id) },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already suspended
    if (user.status?.statusName?.toLowerCase() === 'suspended') {
      return res.status(400).json({ error: 'User is already suspended' });
    }

    // Find or create suspended status
    let suspendedStatus = await prisma.status.findFirst({
      where: { statusName: { equals: 'suspended', mode: 'insensitive' } }
    });

    if (!suspendedStatus) {
      // Create suspended status if it doesn't exist
      suspendedStatus = await prisma.status.create({
        data: { statusName: 'suspended' }
      });
    }

    // Log audit action before suspension
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      user.userId.toString(),
      'user',
      'suspend',
      {
        userId: user.userId.toString(),
        username: user.username,
        email: user.email,
        previousStatus: user.status?.statusName,
        newStatus: 'suspended',
        roles: user.roles.map(ur => ur.role.roleName),
        roleCount: user.roles.length
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    // Update user status to suspended instead of deleting
    await prisma.user.update({
      where: { userId: BigInt(id) },
      data: { statusId: suspendedStatus.statusId }
    });

    res.json({ message: 'User suspended successfully' });
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

// Reactivate suspended user
const reactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists and get data for audit
    const user = await prisma.user.findUnique({
      where: { userId: BigInt(id) },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is suspended
    if (user.status?.statusName?.toLowerCase() !== 'suspended') {
      return res.status(400).json({ error: 'User is not suspended' });
    }

    // Find active status
    let activeStatus = await prisma.status.findFirst({
      where: { statusName: { equals: 'active', mode: 'insensitive' } }
    });

    if (!activeStatus) {
      return res.status(500).json({ error: 'Active status not found' });
    }

    // Log audit action before reactivation
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      user.userId.toString(),
      'user',
      'reactivate',
      {
        userId: user.userId.toString(),
        username: user.username,
        email: user.email,
        previousStatus: 'suspended',
        newStatus: 'active',
        roles: user.roles.map(ur => ur.role.roleName),
        roleCount: user.roles.length
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    // Update user status to active
    await prisma.user.update({
      where: { userId: BigInt(id) },
      data: { statusId: activeStatus.statusId }
    });

    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating user:', error);
    res.status(500).json({ error: 'Failed to reactivate user' });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    // Get parameters from query
    const { dateFrom, dateTo, period } = req.query;
    
    let startDate, endDate;
    
    // Handle period-based filtering
    if (period && !dateFrom && !dateTo) {
      const periodMonths = parseInt(period);
      if (isNaN(periodMonths) || periodMonths < 0) {
        return res.status(400).json({ error: 'Invalid period value' });
      }
      
      endDate = new Date();
      
      if (periodMonths === 0) {
        // Overall/All time - get the earliest user registration date
        const earliestUser = await prisma.user.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true }
        });
        
        if (earliestUser) {
          startDate = new Date(earliestUser.createdAt);
        } else {
          // If no users exist, default to 1 year ago
          startDate = new Date();
          startDate.setFullYear(startDate.getFullYear() - 1);
        }
      } else {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - periodMonths);
      }
    }
    // Handle date range filtering
    else if (dateFrom && dateTo) {
      // Parse dates more explicitly to handle timezone properly
      startDate = new Date(dateFrom + 'T00:00:00');
      endDate = new Date(dateTo + 'T23:59:59.999');
      
      // Adjust for local timezone to avoid timezone conversion issues
      startDate.setMinutes(startDate.getMinutes() - startDate.getTimezoneOffset());
      endDate.setMinutes(endDate.getMinutes() - endDate.getTimezoneOffset());
      
      console.log('Date range filtering:', { 
        dateFrom, 
        dateTo, 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      }); // Debug log
      
      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      
      if (startDate > endDate) {
        return res.status(400).json({ error: 'Start date cannot be after end date' });
      }
      
      if (endDate > new Date()) {
        return res.status(400).json({ error: 'End date cannot be in the future' });
      }
      
      // Limit to maximum 5 years range
      const maxRange = new Date(startDate);
      maxRange.setFullYear(maxRange.getFullYear() + 5);
      if (endDate > maxRange) {
        return res.status(400).json({ error: 'Date range cannot exceed 5 years' });
      }
    }
    // Default to last 6 months if no parameters
    else {
      endDate = new Date();
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
    }
    
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        status: {
          statusName: { equals: 'active', mode: 'insensitive' }
        }
      }
    });

    const usersByRole = await prisma.role.findMany({
      include: {
        _count: {
          select: {
            userRoles: true
          }
        }
      }
    });

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        status: true,
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    // Generate registration trend data for the specified date range
    const registrationTrend = [];
    const monthsInRange = [];
    
    console.log('Generating trend data for range:', { startDate, endDate }); // Debug log
    
    // Generate all months between start and end date
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    
    while (current <= end) {
      monthsInRange.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }
    
    console.log('Months in range:', monthsInRange.length); // Debug log
    
    // Get user counts for each month
    for (const monthStart of monthsInRange) {
      const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Only count within the actual date range
      const actualStart = monthStart < startDate ? startDate : monthStart;
      const actualEnd = monthEnd > endDate ? endDate : monthEnd;
      
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
      const yearName = monthStart.getFullYear();
      
      console.log('Querying users for month:', { monthName, yearName, actualStart, actualEnd }); // Debug log
      
      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: actualStart,
            lte: actualEnd
          }
        }
      });
      
      console.log('User count for', monthName, yearName, ':', count); // Debug log
      
      // Show year if range spans multiple years or is more than 12 months
      const rangeMonths = (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (endDate.getMonth() - startDate.getMonth()) + 1;
      const showYear = rangeMonths > 12 || startDate.getFullYear() !== endDate.getFullYear();
      
      registrationTrend.push({
        date: showYear ? `${monthName} ${yearName}` : monthName,
        count: count
      });
    }
    
    console.log('Final registration trend:', registrationTrend); // Debug log

    res.json({
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.map(role => ({
        role: role.roleName,
        count: role._count.userRoles,
        percentage: totalUsers > 0 ? Math.round((role._count.userRoles / totalUsers) * 100) : 0
      })),
      registrationTrend,
      averageSessionTime: 1847, // Mock data for now - could be calculated from session data
      recentUsers: recentUsers.map(user => ({
        userId: user.userId.toString(),
        username: user.username,
        email: user.email,
        status: user.status?.statusName,
        roles: user.roles.map(ur => ur.role.roleName),
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  reactivateUser,
  getUserStats
};
