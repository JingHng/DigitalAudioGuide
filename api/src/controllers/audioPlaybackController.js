const { PrismaClient } = require('../../generated/prisma');

// Use singleton pattern for Prisma client
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

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
  }
};

// Update an existing playback log (e.g., when audio playback ends)
const updatePlaybackLog = async (req, res) => {
  try {
    const { logId } = req.params;
    const { audioEnd, durationListened, forceEnd } = req.body;

    if (!logId) {
      return res.status(400).json({ error: 'Log ID is required' });
    }

    // Handle instant closes - record all durations but track force end
    const duration = durationListened ? parseInt(durationListened) : null;

    const updatedLog = await prisma.audioPlaybackLog.update({
      where: { audioLogsId: parseInt(logId) },
      data: {
        audioEnd: audioEnd ? new Date(audioEnd) : new Date(),
        durationListened: duration
      }
    });

    // For sendBeacon requests, return minimal response
    if (forceEnd) {
      return res.status(204).send(); // No content response
    }

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
  }
};

// Get all playback logs with pagination and filtering - aggregated by user + exhibit
const getAllPlaybackLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      userId,
      audioId,
      exhibitId,
      startDate,
      endDate,
      sortBy = 'totalDuration',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause for raw query
    let whereConditions = [];
    let params = [];
    
    if (userId) {
      whereConditions.push('apl.user_id = $' + (params.length + 1));
      params.push(BigInt(userId));
    }
    if (audioId) {
      whereConditions.push('apl.audio_id = $' + (params.length + 1));
      params.push(parseInt(audioId));
    }
    if (exhibitId) {
      whereConditions.push('a.exhibit_id = $' + (params.length + 1));
      params.push(BigInt(exhibitId));
    }
    if (startDate) {
      whereConditions.push('apl.created_at >= $' + (params.length + 1));
      params.push(new Date(startDate));
    }
    if (endDate) {
      whereConditions.push('apl.created_at <= $' + (params.length + 1));
      params.push(new Date(endDate));
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Aggregate query to sum durations by user + exhibit combination
    const aggregatedQuery = `
      SELECT 
        u.user_id,
        u.username,
        u.email,
        e.exhibit_id,
        e.title as exhibitTitle,
        SUM(apl.duration_listened) as totalDuration,
        COUNT(apl.audio_logs_id) as totalPlays,
        MIN(apl.audio_start) as firstPlayed,
        MAX(COALESCE(apl.audio_end, apl.audio_start)) as lastPlayed,
        STRING_AGG(DISTINCT a.title, ', ') as audioTitles
      FROM audio_playback_logs apl
      JOIN "user" u ON apl.user_id = u.user_id
      JOIN audio a ON apl.audio_id = a.audio_id
      JOIN exhibit e ON a.exhibit_id = e.exhibit_id
      ${whereClause}
      GROUP BY u.user_id, e.exhibit_id, u.username, u.email, e.title
      ORDER BY ${sortBy === 'createdAt' ? 'lastPlayed' : sortBy} ${sortOrder.toUpperCase()}
      LIMIT ${take} OFFSET ${skip}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT CONCAT(u.user_id, '-', e.exhibit_id)) as total
      FROM audio_playback_logs apl
      JOIN "user" u ON apl.user_id = u.user_id
      JOIN audio a ON apl.audio_id = a.audio_id
      JOIN exhibit e ON a.exhibit_id = e.exhibit_id
      ${whereClause}
    `;

    // Execute queries
    const aggregatedLogs = await prisma.$queryRawUnsafe(aggregatedQuery, ...params);
    const countResult = await prisma.$queryRawUnsafe(countQuery, ...params);
    
    const totalLogs = Number(countResult[0].total);
    const totalPages = Math.ceil(totalLogs / take);

    // Transform data for frontend
    const transformedLogs = aggregatedLogs.map(log => ({
      // Create a composite ID for frontend
      audioLogsId: `${log.user_id}-${log.exhibit_id}`,
      userId: log.user_id.toString(),
      audioId: null, // Not applicable for aggregated data
      audioStart: log.firstplayed,
      audioEnd: log.lastplayed,
      durationListened: Number(log.totalduration) || 0,
      createdAt: log.firstplayed,
      updatedAt: log.lastplayed,
      totalPlays: Number(log.totalplays),
      user: {
        userId: log.user_id.toString(),
        username: log.username,
        email: log.email
      },
      audio: {
        audioId: null,
        title: `${Number(log.totalplays)} audio file(s)`, // Show count instead of specific title
        description: log.audiotitles, // Show all audio titles played
        exhibit: {
          exhibitId: log.exhibit_id.toString(),
          title: log.exhibittitle
        }
      }
    }));

    res.json({
      logs: transformedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalLogs,
        itemsPerPage: take
      },
      aggregated: true // Flag to indicate this is aggregated data
    });
  } catch (err) {
    console.error('Get Playback Logs Error:', err);
    res.status(500).json({ error: 'Server error fetching playback logs' });
  }
};

// Get basic playback analytics/statistics
const getPlaybackAnalytics = async (req, res) => {
  try {
    const { period = '30d', userId, audioId, exhibitId } = req.query;

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
    if (exhibitId) {
      where.audio = {
        exhibitId: exhibitId
      };
    }

    // Get basic stats
    const totalPlays = await prisma.audioPlaybackLog.count({ where });
    
    // Get unique users count manually
    const uniqueUsersData = await prisma.audioPlaybackLog.findMany({
      where,
      select: { userId: true },
      distinct: ['userId']
    });

    // Get basic summary without complex aggregations for now
    const logs = await prisma.audioPlaybackLog.findMany({
      where,
      select: { durationListened: true }
    });

    const totalDuration = logs.reduce((sum, log) => sum + (log.durationListened || 0), 0);
    const averageDuration = totalPlays > 0 ? Math.round(totalDuration / totalPlays) : 0;

    // Get popular exhibits based on audio playback logs
    const popularAudioData = await prisma.audioPlaybackLog.findMany({
      where,
      include: {
        audio: {
          include: {
            exhibit: true,
            language: true
          }
        }
      }
    });

    // Group by exhibit and count plays
    const exhibitPlays = {};
    const languagePlays = {};
    
    popularAudioData.forEach(log => {
      if (log.audio && log.audio.exhibit) {
        const exhibitTitle = log.audio.exhibit.title;
        const language = log.audio.language?.title || 'Unknown';
        
        if (!exhibitPlays[exhibitTitle]) {
          exhibitPlays[exhibitTitle] = {
            exhibit: exhibitTitle,
            plays: 0,
            totalDuration: 0
          };
        }
        
        exhibitPlays[exhibitTitle].plays += 1;
        exhibitPlays[exhibitTitle].totalDuration += (log.durationListened || 0);
        
        if (!languagePlays[language]) {
          languagePlays[language] = 0;
        }
        languagePlays[language] += 1;
      }
    });

    // Convert to arrays and sort
    const topAudioContent = Object.values(exhibitPlays)
      .map(item => ({
        ...item,
        avgDuration: item.plays > 0 ? Math.round(item.totalDuration / item.plays) : 0
      }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 10);

    const audioByLanguage = Object.entries(languagePlays)
      .map(([language, plays]) => ({ language, plays }))
      .sort((a, b) => b.plays - a.plays);

    res.json({
      period,
      dateRange: { start: startDate, end: now },
      totalAudioPlays: totalPlays,
      averageListenTime: averageDuration,
      topAudioContent,
      audioByLanguage,
      summary: {
        totalPlays,
        uniqueUsers: uniqueUsersData.length,
        totalDuration,
        averageDuration
      }
    });
  } catch (err) {
    console.error('Get Playback Analytics Error:', err);
    res.status(500).json({ error: 'Server error fetching analytics' });
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
        audio: true
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
        description: log.audio.description
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
  }
};

module.exports = {
  createPlaybackLog,
  updatePlaybackLog,
  getAllPlaybackLogs,
  getPlaybackAnalytics,
  getUserPlaybackLogs
};