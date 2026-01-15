const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Get paginated audit logs with filtering
 */
async function getPaginatedAuditLogs({
  page = 1,
  pageSize = 10,
  sortBy = 'timestamp',
  order = 'desc',
  search = '',
} = {}) {
  try {
    const skip = (page - 1) * pageSize;
    
    const where = search ? {
      OR: [
        { resource: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [auditLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: order },
        include: {
          adminUser: {
            select: {
              userId: true,
              username: true,
              email: true,
            },
          },
          targetUser: {
            select: {
              userId: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs: auditLogs.map(log => ({
        ...log,
        auditLogId: log.auditLogId.toString(),
        adminUserId: log.adminUserId ? log.adminUserId.toString() : null,
        targetUserId: log.targetUserId ? log.targetUserId.toString() : null,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (error) {
    console.error('Error in getPaginatedAuditLogs:', error);
    throw error;
  }
}

module.exports = {
  getPaginatedAuditLogs,
};
