const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

class BadgeModel {
  /**
   * Get all badges ordered by badgeId ascending.
   */
  static async getAllBadges() {
    return prisma.badge.findMany({
      orderBy: { badgeId: 'asc' },
    });
  }

  /**
   * Get all userBadge records for a given user, including full badge details.
   *
   * @param {number|string} userId
   */
  static async getUserBadgesByUserId(userId) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
    });
  }

  /**
   * Find the badge associated with a given exhibit.
   *
   * Relationship assumption:
   * - exhibit table has a foreign key "badgeId"
   * - Prisma model: Exhibit { badgeId; badge: Badge? }
   *
   * @param {number|string} exhibitId
   */
  static async findByExhibitId(exhibitId) {
    const numericExhibitId = Number(exhibitId);

    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: numericExhibitId },
      include: {
        badge: true,
      },
    });

    if (!exhibit || !exhibit.badge) {
      return null;
    }

    // Return the Badge object directly
    return exhibit.badge;
  }

  /**
   * Find an existing userBadge record for a given user and badge.
   *
   * @param {number|string} userId
   * @param {number|string} badgeId
   */
  static async findByUserAndBadge(userId, badgeId) {
    return prisma.userBadge.findFirst({
      where: {
        userId,
        badgeId,
      },
    });
  }

  /**
   * Create a new userBadge record.
   * Assumes Prisma model:
   *   model UserBadge {
   *     userBadgeId Int      @id @default(autoincrement())
   *     userId      Int
   *     badgeId     Int
   *     createdAt   DateTime @default(now())
   *   }
   *
   * If your field is called "created_at" in the DB, Prisma usually maps it
   * to "createdAt" in the model — adjust the field name below if different.
   *
   * @param {number|string} userId
   * @param {number|string} badgeId
   */
  static async createUserBadge(userId, badgeId) {
    return prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        // createdAt: new Date(), // Uncomment if you do NOT use @default(now())
      },
    });
  }
}

module.exports = BadgeModel;
