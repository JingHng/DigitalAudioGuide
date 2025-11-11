const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

const logUserAction = async (adminUserId, targetUserId, action, changes = null, metadata = null) => {
  try {
    await prisma.auditLog.create({
      data: {
        adminUserId: adminUserId ? BigInt(adminUserId) : null,
        targetUserId: targetUserId ? BigInt(targetUserId) : null,
        resource: 'user',
        action,
        changes: changes ? JSON.stringify(changes) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
};

const logAuditAction = async (adminUserId, targetUserId, resource, action, changes = null, metadata = null) => {
  try {
    console.log('Logging audit action:', { adminUserId, targetUserId, resource, action });
    
    await prisma.auditLog.create({
      data: {
        adminUserId: adminUserId ? BigInt(adminUserId) : null,
        targetUserId: targetUserId ? BigInt(targetUserId) : null,
        resource: resource.toLowerCase(),
        action: action.toLowerCase(),
        changes: changes ? JSON.stringify(changes) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        timestamp: new Date()
      }
    });
    
    console.log('Audit action logged successfully');
  } catch (error) {
    console.error('Error logging audit action:', error);
    // Don't throw the error, just log it so the main operation continues
  }
};

const getAllAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      resource = '',
      action = '',
      adminUserId = '',
      targetUserId = '',
      startDate = '',
      endDate = '',
      sortBy = 'timestamp',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      AND: [
        resource ? { resource: { contains: resource, mode: 'insensitive' } } : {},
        action ? { action: { contains: action, mode: 'insensitive' } } : {},
        adminUserId ? { adminUserId: BigInt(adminUserId) } : {},
        targetUserId ? { targetUserId: BigInt(targetUserId) } : {},
        startDate ? { timestamp: { gte: new Date(startDate) } } : {},
        endDate ? { timestamp: { lte: new Date(endDate) } } : {}
      ]
    };

    const auditLogs = await prisma.auditLog.findMany({
      skip,
      take,
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        adminUser: {
          select: {
            userId: true,
            username: true,
            email: true
          }
        },
        targetUser: {
          select: {
            userId: true,
            username: true,
            email: true
          }
        }
      }
    });

    const totalLogs = await prisma.auditLog.count({ where });
    const totalPages = Math.ceil(totalLogs / take);

    const transformedLogs = auditLogs.map(log => ({
      auditLogId: log.auditLogId.toString(),
      adminUser: log.adminUser ? {
        userId: log.adminUser.userId.toString(),
        username: log.adminUser.username,
        email: log.adminUser.email
      } : null,
      targetUser: log.targetUser ? {
        userId: log.targetUser.userId.toString(),
        username: log.targetUser.username,
        email: log.targetUser.email
      } : null,
      resource: log.resource,
      action: log.action,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
      timestamp: log.timestamp
    }));

    res.json({
      auditLogs: transformedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLogs,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditLog = await prisma.auditLog.findUnique({
      where: { auditLogId: BigInt(id) },
      include: {
        adminUser: {
          select: {
            userId: true,
            username: true,
            email: true
          }
        },
        targetUser: {
          select: {
            userId: true,
            username: true,
            email: true
          }
        }
      }
    });

    if (!auditLog) {
      return res.status(404).json({ error: 'Audit log not found' });
    }

    const transformedLog = {
      auditLogId: auditLog.auditLogId.toString(),
      adminUser: auditLog.adminUser ? {
        userId: auditLog.adminUser.userId.toString(),
        username: auditLog.adminUser.username,
        email: auditLog.adminUser.email
      } : null,
      targetUser: auditLog.targetUser ? {
        userId: auditLog.targetUser.userId.toString(),
        username: auditLog.targetUser.username,
        email: auditLog.targetUser.email
      } : null,
      resource: auditLog.resource,
      action: auditLog.action,
      changes: auditLog.changes ? JSON.parse(auditLog.changes) : null,
      metadata: auditLog.metadata ? JSON.parse(auditLog.metadata) : null,
      timestamp: auditLog.timestamp
    };

    res.json(transformedLog);
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
};

const getAuditStats = async (req, res) => {
  try {
    const totalLogs = await prisma.auditLog.count();
    
    const actionStats = await prisma.auditLog.groupBy({
      by: ['action'],
      _count: {
        action: true
      },
      orderBy: {
        _count: {
          action: 'desc'
        }
      }
    });

    const recentLogs = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      include: {
        adminUser: {
          select: {
            userId: true,
            username: true
          }
        },
        targetUser: {
          select: {
            userId: true,
            username: true
          }
        }
      }
    });

    const topAdmins = await prisma.auditLog.groupBy({
      by: ['adminUserId'],
      where: {
        adminUserId: {
          not: null
        }
      },
      _count: {
        adminUserId: true
      },
      orderBy: {
        _count: {
          adminUserId: 'desc'
        }
      },
      take: 5
    });

    const adminDetails = await Promise.all(
      topAdmins
        .filter(admin => admin.adminUserId !== null)
        .map(async (admin) => {
          try {
            const user = await prisma.user.findUnique({
              where: { userId: admin.adminUserId },
              select: { userId: true, username: true }
            });
            return {
              userId: user?.userId.toString(),
              username: user?.username || 'Unknown User',
              actionCount: admin._count.adminUserId
            };
          } catch (error) {
            console.error('Error fetching admin user details:', error);
            return {
              userId: admin.adminUserId.toString(),
              username: 'Unknown User',
              actionCount: admin._count.adminUserId
            };
          }
        })
    );

    res.json({
      totalLogs,
      actionStats: actionStats.map(stat => ({
        action: stat.action,
        count: stat._count.action
      })),
      recentLogs: recentLogs.map(log => ({
        auditLogId: log.auditLogId.toString(),
        adminUser: log.adminUser ? {
          userId: log.adminUser.userId.toString(),
          username: log.adminUser.username
        } : null,
        targetUser: log.targetUser ? {
          userId: log.targetUser.userId.toString(),
          username: log.targetUser.username
        } : null,
        action: log.action,
        resource: log.resource,
        timestamp: log.timestamp
      })),
      topAdmins: adminDetails.filter(admin => admin.userId)
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit statistics' });
  }
};

module.exports = {
  logUserAction,
  logAuditAction,
  getAllAuditLogs,
  getAuditLogById,
  getAuditStats
};

