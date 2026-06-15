const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

// Create a new audio playback log entry
const createPlaybackLog = async (req, res) => {
  try {
    const { userId, audioId, audioStart, audioEnd, durationListened } = req.body;

    if (!userId || !audioId) {
      return res.status(400).json({ 
        error: 'User ID and Audio ID are required' 
      });
    }

    const playbackLog = await prisma.audioPlaybackLog.create({
      data: {
        userId: BigInt(userId),
        audioId: parseInt(audioId),
        audioStart: audioStart ? new Date(audioStart) : new Date(),
        audioEnd: audioEnd ? new Date(audioEnd) : null,
        durationListened: durationListened ? parseInt(durationListened) : null
      }
    });

    res.status(201).json({
      message: 'Playback log created successfully',
      log: {
        audioLogsId: playbackLog.audioLogsId,
        userId: playbackLog.userId.toString(),
        audioId: playbackLog.audioId,
        audioStart: playbackLog.audioStart,
        audioEnd: playbackLog.audioEnd,
        durationListened: playbackLog.durationListened,
        createdAt: playbackLog.createdAt
      }
    });
  } catch (err) {
    console.error('Create Playback Log Error:', err);
    res.status(500).json({ error: 'Server error creating playback log' });
  } finally {
    await prisma.$disconnect();
  }
};

// Update an existing playback log (e.g., when audio playback ends)
const updatePlaybackLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { audioEnd, durationListened } = req.body;

    if (!logId) {
      return res.status(400).json({ error: 'Log ID is required' });
    }

    const updatedLog = await prisma.audioPlaybackLog.update({
      where: { audioLogsId: parseInt(logId) },
      data: {
        audioEnd: audioEnd ? new Date(audioEnd) : new Date(),
        durationListened: durationListened ? parseInt(durationListened) : null
      }
    });

    res.json({
      message: 'Playback log updated successfully',
      log: {
        audioLogsId: updatedLog.audioLogsId,
        userId: updatedLog.userId.toString(),
        audioId: updatedLog.audioId,
        audioStart: updatedLog.audioStart,
        audioEnd: updatedLog.audioEnd,
        durationListened: updatedLog.durationListened,
        updatedAt: updatedLog.updatedAt
      }
    });
  } catch (err) {
    console.error('Update Playback Log Error:', err);
    res.status(500).json({ error: 'Server error updating playback log' });
  } finally {
    await prisma.$disconnect();
  }
};

// Get all playback logs with pagination and filtering
const getAllPlaybackLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      userId,
      audioId,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};
    if (userId) where.userId = BigInt(userId);
    if (audioId) where.audioId = parseInt(audioId);
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get logs with related data
    const logs = await prisma.audioPlaybackLog.findMany({
      skip,
      take,
      where,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: true,
        audio: {
          include: {
            exhibit: true
          }
        }
      }
    });

    // Get total count for pagination
    const totalLogs = await prisma.audioPlaybackLog.count({ where });
    const totalPages = Math.ceil(totalLogs / take);

    // Transform data for frontend
    const transformedLogs = logs.map(log => ({
      audioLogsId: log.audioLogsId,
      userId: log.userId.toString(),
      audioId: log.audioId,
      audioStart: log.audioStart,
      audioEnd: log.audioEnd,
      durationListened: log.durationListened,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      user: log.user ? {
        userId: log.user.userId.toString(),
        username: log.user.username,
        email: log.user.email
      } : null,
      audio: log.audio ? {
        audioId: log.audio.audioId,
        title: log.audio.title,
        description: log.audio.description,
        exhibit: log.audio.exhibit ? {
          exhibitId: log.audio.exhibit.exhibitId.toString(),
          title: log.audio.exhibit.title
        } : null
      } : null
    }));

    res.json({
      logs: transformedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalLogs,
        itemsPerPage: take
      }
    });
  } catch (err) {
    console.error('Get Playback Logs Error:', err);
    res.status(500).json({ error: 'Server error fetching playback logs' });
  } finally {
    await prisma.$disconnect();
  }
};

// Get playback analytics/statistics
const getPlaybackAnalytics = async (req, res) => {
  try {
    const { period = '30d', userId, audioId } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where = {
      createdAt: { gte: startDate }
    };
    if (userId) where.userId = BigInt(userId);
    if (audioId) where.audioId = parseInt(audioId);

    // Get basic stats
    const totalPlays = await prisma.audioPlaybackLog.count({ where });
    
    const totalDurationResult = await prisma.audioPlaybackLog.aggregate({
      where,
      _sum: { durationListened: true },
      _avg: { durationListened: true }
    });

    // Get unique users count
    const uniqueUsers = await prisma.audioPlaybackLog.findMany({
      where,
      select: { userId: true },
      distinct: ['userId']
    });

    // Get most popular audio tracks
    const popularAudio = await prisma.audioPlaybackLog.groupBy({
      by: ['audioId'],
      where,
      _count: { audioId: true },
      _sum: { durationListened: true },
      orderBy: { _count: { audioId: 'desc' } },
      take: 10
    });

    // Get audio details for popular tracks
    const audioIds = popularAudio.map(item => item.audioId);
    const audioDetails = await prisma.audio.findMany({
      where: { audioId: { in: audioIds } },
      include: {
        exhibit: {
          select: { exhibitId: true, title: true }
        }
      }
    });

    const popularAudioWithDetails = popularAudio.map(item => {
      const audio = audioDetails.find(a => a.audioId === item.audioId);
      return {
        audioId: item.audioId,
        playCount: item._count.audioId,
        totalDuration: item._sum.durationListened || 0,
        audio: audio ? {
          title: audio.title,
          description: audio.description,
          exhibit: audio.exhibit
        } : null
      };
    });

    // Get daily play counts for the period (simplified without conditional filters for now)
    let dailyStatsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as plays,
        COALESCE(SUM(duration_listened), 0)::int as total_duration,
        COUNT(DISTINCT user_id)::int as unique_users
      FROM audio_playback_logs 
      WHERE created_at >= $1
    `;
    
    const queryParams = [startDate];
    
    if (userId) {
      dailyStatsQuery += ` AND user_id = $${queryParams.length + 1}`;
      queryParams.push(BigInt(userId));
    }
    
    if (audioId) {
      dailyStatsQuery += ` AND audio_id = $${queryParams.length + 1}`;
      queryParams.push(parseInt(audioId));
    }
    
    dailyStatsQuery += `
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    const dailyStats = await prisma.$queryRawUnsafe(dailyStatsQuery, ...queryParams);

    res.json({
      period,
      dateRange: { start: startDate, end: now },
      summary: {
        totalPlays,
        uniqueUsers: uniqueUsers.length,
        totalDuration: totalDurationResult._sum.durationListened || 0,
        averageDuration: Math.round(totalDurationResult._avg.durationListened || 0)
      },
      popularAudio: popularAudioWithDetails,
      dailyStats
    });
  } catch (err) {
    console.error('Get Playback Analytics Error:', err);
    res.status(500).json({ error: 'Server error fetching analytics' });
  } finally {
    await prisma.$disconnect();
  }
};

// Get playback logs for a specific user
const getUserPlaybackLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const logs = await prisma.audioPlaybackLog.findMany({
      where: { userId: BigInt(userId) },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        audio: {
          include: {
            exhibit: true
          }
        }
      }
    });

    const totalLogs = await prisma.audioPlaybackLog.count({
      where: { userId: BigInt(userId) }
    });

    const transformedLogs = logs.map(log => ({
      audioLogsId: log.audioLogsId,
      audioId: log.audioId,
      audioStart: log.audioStart,
      audioEnd: log.audioEnd,
      durationListened: log.durationListened,
      createdAt: log.createdAt,
      audio: log.audio ? {
        audioId: log.audio.audioId,
        title: log.audio.title,
        description: log.audio.description,
        exhibit: log.audio.exhibit
      } : null
    }));

    res.json({
      logs: transformedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalLogs / take),
        totalItems: totalLogs,
        itemsPerPage: take
      }
    });
  } catch (err) {
    console.error('Get User Playback Logs Error:', err);
    res.status(500).json({ error: 'Server error fetching user logs' });
  } finally {
    await prisma.$disconnect();
  }
};

module.exports = {
  createPlaybackLog,
  updatePlaybackLog,
  getAllPlaybackLogs,
  getPlaybackAnalytics,
  getUserPlaybackLogs
};