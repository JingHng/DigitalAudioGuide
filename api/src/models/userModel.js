const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Get all users with pagination, sorting, and filtering
 */
async function getAllUsers({
  page = 1,
  pageSize = 10,
  sortBy = 'createdAt',
  order = 'desc',
  search = '',
  ageMin = null,
  ageMax = null,
  gender = null,
  languageCode = null,
} = {}) {
  try {
    const skip = (page - 1) * pageSize;
    
    let where = {};

    // Search filter
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Gender filter
    if (gender) {
      where.gender = gender;
    }

    // Language filter
    if (languageCode) {
      where.language = {
        languageCode: languageCode,
      };
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: order },
        include: {
          language: true,
          status: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Calculate age and filter by age if specified
    let filteredUsers = users;
    if (ageMin !== null || ageMax !== null) {
      filteredUsers = users.filter(user => {
        if (!user.dateOfBirth) return false;
        const today = new Date();
        const birthDate = new Date(user.dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        if (ageMin !== null && age < ageMin) return false;
        if (ageMax !== null && age > ageMax) return false;
        return true;
      });
    }

    return {
      users: filteredUsers.map(user => ({
        ...user,
        userId: user.userId.toString(),
      })),
      pagination: {
        page,
        pageSize,
        totalCount: ageMin !== null || ageMax !== null ? filteredUsers.length : totalCount,
        totalPages: Math.ceil((ageMin !== null || ageMax !== null ? filteredUsers.length : totalCount) / pageSize),
      },
    };
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
}

module.exports = {
  getAllUsers,
};
