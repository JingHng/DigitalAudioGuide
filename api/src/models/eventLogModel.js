const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Get paginated event logs with filtering
 */
async function getPaginatedEventLogs({
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
        { eventType: { contains: search, mode: 'insensitive' } },
        { metadata: { contains: search, mode: 'insensitive' } },
      ],
    } : {};

    const [eventLogs, totalCount] = await Promise.all([
      prisma.eventLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: order },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.eventLog.count({ where }),
    ]);

    return {
      eventLogs: eventLogs.map(log => ({
        ...log,
        eventLogId: log.eventLogId.toString(),
        userId: log.userId ? log.userId.toString() : null,
      })),
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    };
  } catch (error) {
    console.error('Error in getPaginatedEventLogs:', error);
    throw error;
  }
}

module.exports = {
  getPaginatedEventLogs,
};
