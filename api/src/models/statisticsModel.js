const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

// Helper to calculate age from date of birth
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
};

const getAgeGroup = (age) => {
  if (age === null || age === undefined) return 'Unknown';
  if (age < 13) return 'Children';
  if (age >= 13 && age <= 17) return 'Youth';
  if (age >= 18 && age <= 64) return 'Adults';
  if (age >= 65) return 'Seniors';
  return 'Unknown';
};

// Get simple user count statistics
async function getUserCountStatistics(filter = {}) {
  try {
    // Get total user count
    const totalUsers = await prisma.user.count({
      where: filter
    });

    // Get today's registrations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayRegistrations = await prisma.user.count({
      where: {
        ...filter,
        createdAt: {
          gte: todayStart,
        },
      },
    });

    // Get this month's registrations
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthRegistrations = await prisma.user.count({
      where: {
        ...filter,
        createdAt: {
          gte: monthStart,
        },
      },
    });

    // Get this year's registrations
    const yearStart = new Date();
    yearStart.setMonth(0, 1);
    yearStart.setHours(0, 0, 0, 0);

    const yearRegistrations = await prisma.user.count({
      where: {
        ...filter,
        createdAt: {
          gte: yearStart,
        },
      },
    });

    return {
      totalUsers,
      registrations: {
        today: todayRegistrations,
        thisMonth: monthRegistrations,
        thisYear: yearRegistrations,
      },
    };
  } catch (error) {
    console.error('Error in getUserCountStatistics:', error);
    throw error;
  }
}

// Get member sign-ups with demographics
async function getDisplayMemberSignUps({
  startDate = null,
  endDate = null,
  gender = 'All',
  ageGroup = 'All',
  granularity = 'day',
} = {}) {
  try {
    let where = {};

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Gender filter
    if (gender && gender !== 'All') {
      where.gender = gender;
    }

    // Get all users matching filters
    const users = await prisma.user.findMany({
      where,
      select: {
        userId: true,
        dateOfBirth: true,
        createdAt: true,
        gender: true,
      },
    });

    // Filter by age group if specified
    let filteredUsers = users;
    if (ageGroup && ageGroup !== 'All') {
      filteredUsers = users.filter(user => {
        const age = calculateAge(user.dateOfBirth);
        return getAgeGroup(age) === ageGroup;
      });
    }

    // Group by time period based on granularity
    const timeSeries = {};
    filteredUsers.forEach(user => {
      let key;
      const date = new Date(user.createdAt);
      
      if (granularity === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (granularity === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (granularity === 'year') {
        key = String(date.getFullYear());
      }

      if (!timeSeries[key]) {
        timeSeries[key] = 0;
      }
      timeSeries[key]++;
    });

    // Calculate demographics breakdown
    const ageGroups = { Children: 0, Youth: 0, Adults: 0, Seniors: 0, Unknown: 0 };
    const genderBreakdown = { M: 0, F: 0, Other: 0 };

    filteredUsers.forEach(user => {
      const age = calculateAge(user.dateOfBirth);
      const group = getAgeGroup(age);
      ageGroups[group]++;

      if (user.gender === 'M' || user.gender === 'F') {
        genderBreakdown[user.gender]++;
      } else {
        genderBreakdown.Other++;
      }
    });

    return {
      totalSignups: filteredUsers.length,
      timeSeries: Object.entries(timeSeries).map(([period, count]) => ({
        period,
        count,
      })).sort((a, b) => a.period.localeCompare(b.period)),
      demographics: {
        ageGroups,
        genderBreakdown,
      },
    };
  } catch (error) {
    console.error('Error in getDisplayMemberSignUps:', error);
    throw error;
  }
}

// Get common languages used
async function getDisplayCommonLanguagesUsed({ limit = 10 } = {}) {
  try {
    const users = await prisma.user.findMany({
      where: {
        languageId: {
          not: null,
        },
      },
      include: {
        language: true,
      },
    });

    // Count languages
    const languageCounts = {};
    users.forEach(user => {
      if (user.language) {
        const langName = user.language.title || 'Unknown';
        languageCounts[langName] = (languageCounts[langName] || 0) + 1;
      }
    });

    // Convert to array and sort
    const sortedLanguages = Object.entries(languageCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return {
      languages: sortedLanguages,
      totalUsersWithLanguage: users.length,
    };
  } catch (error) {
    console.error('Error in getDisplayCommonLanguagesUsed:', error);
    throw error;
  }
}

// Get audio engagement metrics (placeholder - returns sample data)
async function getAudioPlaysPerExhibitStats({ exhibitId = null, startDate = null, endDate = null } = {}) {
  try {
    // Note: This would need event_log table with audio play events
    // For now, return placeholder data based on exhibits
    const exhibits = await prisma.exhibit.findMany({
      where: exhibitId ? { exhibitId: BigInt(exhibitId) } : undefined,
      include: {
        audio: true,
      },
    });

    const stats = exhibits.map(exhibit => ({
      exhibitId: exhibit.exhibitId.toString(),
      exhibitTitle: exhibit.title,
      audioPlays: exhibit.audio ? Math.floor(Math.random() * 500) + 50 : 0,
    }));

    return {
      audioPlayStats: stats,
      totalPlays: stats.reduce((sum, s) => sum + s.audioPlays, 0),
    };
  } catch (error) {
    console.error('Error in getAudioPlaysPerExhibitStats:', error);
    throw error;
  }
}

// Get audio completion rates (placeholder)
async function getAudioCompletionRatesStats({ exhibitId = null } = {}) {
  try {
    const exhibits = await prisma.exhibit.findMany({
      where: exhibitId ? { exhibitId: BigInt(exhibitId) } : undefined,
      include: {
        audio: true,
      },
    });

    const stats = exhibits.map(exhibit => ({
      exhibitId: exhibit.exhibitId.toString(),
      exhibitTitle: exhibit.title,
      completionRate: exhibit.audio ? (Math.random() * 40 + 60).toFixed(2) : 0,
    }));

    return {
      completionRates: stats,
      averageCompletionRate: (stats.reduce((sum, s) => sum + parseFloat(s.completionRate), 0) / stats.length).toFixed(2),
    };
  } catch (error) {
    console.error('Error in getAudioCompletionRatesStats:', error);
    throw error;
  }
}

// Get average listen duration (placeholder)
async function getAverageListenDurationStats({ exhibitId = null } = {}) {
  try {
    const exhibits = await prisma.exhibit.findMany({
      where: exhibitId ? { exhibitId: BigInt(exhibitId) } : undefined,
      include: {
        audio: true,
      },
    });

    const stats = exhibits.map(exhibit => ({
      exhibitId: exhibit.exhibitId.toString(),
      exhibitTitle: exhibit.title,
      averageDuration: exhibit.audio ? Math.floor(Math.random() * 180) + 60 : 0, // seconds
    }));

    return {
      listenDurations: stats,
      overallAverage: Math.floor(stats.reduce((sum, s) => sum + s.averageDuration, 0) / stats.length),
    };
  } catch (error) {
    console.error('Error in getAverageListenDurationStats:', error);
    throw error;
  }
}

// Get scans per exhibit (placeholder)
async function getScansPerExhibitStats({ exhibitId = null } = {}) {
  try {
    const exhibits = await prisma.exhibit.findMany({
      where: exhibitId ? { exhibitId: BigInt(exhibitId) } : undefined,
      include: {
        qrCodes: true,
      },
    });

    const stats = exhibits.map(exhibit => ({
      exhibitId: exhibit.exhibitId.toString(),
      exhibitTitle: exhibit.title,
      scanCount: exhibit.qrCodes.length > 0 ? Math.floor(Math.random() * 1000) + 100 : 0,
    }));

    return {
      scanStats: stats,
      totalScans: stats.reduce((sum, s) => sum + s.scanCount, 0),
    };
  } catch (error) {
    console.error('Error in getScansPerExhibitStats:', error);
    throw error;
  }
}

// Time series placeholders
async function getAudioCompletionRatesTimeSeries({ metric, startDate, endDate, granularity = 'day' } = {}) {
  try {
    // Placeholder time series data
    const timeSeries = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      timeSeries.push({
        date: d.toISOString().split('T')[0],
        value: (Math.random() * 40 + 60).toFixed(2),
      });
    }

    return { timeSeries };
  } catch (error) {
    console.error('Error in getAudioCompletionRatesTimeSeries:', error);
    throw error;
  }
}

async function getAverageListenDurationTimeSeries({ metric, startDate, endDate, granularity = 'day' } = {}) {
  try {
    // Placeholder time series data
    const timeSeries = [];
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      timeSeries.push({
        date: d.toISOString().split('T')[0],
        value: Math.floor(Math.random() * 120) + 60,
      });
    }

    return { timeSeries };
  } catch (error) {
    console.error('Error in getAverageListenDurationTimeSeries:', error);
    throw error;
  }
}

module.exports = {
  getUserCountStatistics,
  getDisplayMemberSignUps,
  getDisplayCommonLanguagesUsed,
  getAudioPlaysPerExhibitStats,
  getAudioCompletionRatesStats,
  getAverageListenDurationStats,
  getScansPerExhibitStats,
  getAudioCompletionRatesTimeSeries,
  getAverageListenDurationTimeSeries,
};
