const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

class BadgeModel {

  /* ============================================================
     PUBLIC / FRONTEND DISPLAY
     These methods are used to display badges on admin & user UI
     ============================================================ */

  /**
   * Get all badges with their related Exhibit and Exhibition
   * Used by admin pages and frontend for grouping and searching
   */
  static async getAllBadgesWithRelations() {
    return prisma.badge.findMany({
      orderBy: { badgeId: "asc" },
      include: {
        exhibit: {
          select: {
            exhibitId: true,
            title: true,
            exhibition: {
              select: { exhibitionId: true, title: true },
            },
          },
        },
      },
    });
  }

  /**
   * Get all distinct badge styles from database
   * Used for frontend filtering (e.g. cute, funny, cool)
   */
  static async getAllDistinctStyles() {
    const rows = await prisma.badge.findMany({
      distinct: ["style"],
      select: { style: true },
      where: { style: { not: null } },
      orderBy: { style: "asc" },
    });

    // Remove empty or whitespace-only styles
    return rows
      .map(r => (typeof r.style === "string" ? r.style.trim() : r.style))
      .filter(s => s && s.length > 0);
  }

  /* ============================================================
     ADMIN – CREATE & MANAGE BADGES
     ============================================================ */
   /**
   * Get a single badge by badgeId (with relations)
   * Used by admin pages / upload image API
   */
  static async getBadgeById(badgeId) {
    if (badgeId === undefined || badgeId === null) return null;

    const id = BigInt(badgeId);

    return prisma.badge.findUnique({
      where: { badgeId: id },
      include: {
        exhibit: {
          select: {
            exhibitId: true,
            title: true,
            exhibition: {
              select: { exhibitionId: true, title: true },
            },
          },
        },
      },
    });
  }

  /**
   * Create a new badge and assign it to an Exhibit
   * (Database design: Exhibit holds badgeId as foreign key)
   */
  static async createBadgeAndAssignToExhibit({ name, description, style, imageUrl, exhibitId }) {
    // 1. Ensure the exhibit exists
    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: BigInt(exhibitId) },
      select: { exhibitId: true, badgeId: true },
    });

    if (!exhibit) throw new Error("Exhibit not found");

    // 2. Create the badge
    const createdBadge = await prisma.badge.create({
      data: {
        name,
        description,
        style,
        imageUrl,
      },
    });

    // 3. Assign badge to exhibit (Exhibit.badgeId → Badge)
    await prisma.exhibit.update({
      where: { exhibitId: BigInt(exhibitId) },
      data: { badgeId: createdBadge.badgeId },
    });

    // 4. Return badge with relations for immediate UI display
    return prisma.badge.findUnique({
      where: { badgeId: createdBadge.badgeId },
      include: {
        exhibit: {
          select: {
            exhibitId: true,
            title: true,
            exhibition: {
              select: { exhibitionId: true, title: true },
            },
          },
        },
      },
    });
  }

  /**
   * Update badge fields and optionally reassign to another exhibit
   */
  static async updateBadgeAndMaybeReassign(badgeId, { name, description, style, imageUrl, exhibitId }) {
    const id = BigInt(badgeId);

    // 1. Check badge exists
    const existing = await prisma.badge.findUnique({ where: { badgeId: id } });
    if (!existing) return null;

    // 2. Update badge fields
    await prisma.badge.update({
      where: { badgeId: id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(style !== undefined ? { style } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      },
    });

    // 3. If exhibitId is provided, reassign badge
    if (exhibitId) {
      const newExhibitId = BigInt(exhibitId);

      // Find current exhibit using this badge
      const currentExhibit = await prisma.exhibit.findFirst({
        where: { badgeId: id },
        select: { exhibitId: true },
      });

      if (!currentExhibit || currentExhibit.exhibitId !== newExhibitId) {
        // Remove old link
        if (currentExhibit) {
          await prisma.exhibit.update({
            where: { exhibitId: currentExhibit.exhibitId },
            data: { badgeId: null },
          });
        }

        // Assign to new exhibit
        await prisma.exhibit.update({
          where: { exhibitId: newExhibitId },
          data: { badgeId: id },
        });
      }
    }

    // 4. Return updated badge with relations
    return prisma.badge.findUnique({
      where: { badgeId: id },
      include: {
        exhibit: {
          select: {
            exhibitId: true,
            title: true,
            exhibition: { select: { exhibitionId: true, title: true } },
          },
        },
      },
    });
  }

  /**
   * Update only the badge image URL (used by image upload API)
   */
  static async updateBadgeImageUrl(badgeId, imageUrl) {
    const existing = await prisma.badge.findUnique({
      where: { badgeId },
      select: { badgeId: true },
    });

    if (!existing) return null;

    return prisma.badge.update({
      where: { badgeId },
      data: {
        imageUrl,
        updatedAt: new Date(),
      },
      select: {
        badgeId: true,
        imageUrl: true,
      },
    });
  }

  /**
   * Delete a badge and remove all Exhibit references
   */
  static async deleteBadgeAndUnassign(badgeId) {
    const id = BigInt(badgeId);

    const existing = await prisma.badge.findUnique({ where: { badgeId: id } });
    if (!existing) return null;

    // Unlink from any exhibits
    await prisma.exhibit.updateMany({
      where: { badgeId: id },
      data: { badgeId: null },
    });

    // Delete the badge
    await prisma.badge.delete({ where: { badgeId: id } });
    return true;
  }

    /* ============================================================
     ADMIN STATS – BADGE STATISTICS DASHBOARD
     ============================================================ */

  /**
   * Exhibition dropdown options for stats filter
   */
  static async getExhibitionOptionsForStats() {
    return prisma.exhibition.findMany({
      select: { exhibitionId: true, title: true },
      orderBy: { title: "asc" },
    });
  }

  /**
   * Core dashboard stats:
   * - KPIs
   * - Top/Bottom badges (includes 0 earned)
   * - Earned by style (pie/bar)
   * - Timeline (day/week)
   *
   * IMPORTANT: Your DB design is Exhibit holds badgeId FK
   * So SQL join is: exhibit.badge_id = badge.badge_id
   */
  static async getBadgeStatsDashboard({ from, to, range, interval, exhibitionId }) {
    // 1) badge filter by exhibition
    const badgeWhere =
      exhibitionId === "all"
        ? {}
        : { exhibit: { exhibition: { exhibitionId: exhibitionId } } };

    // all badges under this exhibition filter
    const allBadges = await prisma.badge.findMany({
      where: badgeWhere,
      select: { badgeId: true, name: true, style: true },
    });

    // 2) userBadge filter: time + (optional) exhibition via badge -> exhibit -> exhibition
    const userBadgeWhere =
      exhibitionId === "all"
        ? { createdAt: { gte: from, lte: to } }
        : {
            createdAt: { gte: from, lte: to },
            badge: { exhibit: { exhibition: { exhibitionId: exhibitionId } } },
          };

    // KPIs
    const totalBadges = allBadges.length;
    const totalEarned = await prisma.userBadge.count({ where: userBadgeWhere });

    const usersEarnedGroups = await prisma.userBadge.groupBy({
      by: ["userId"],
      where: userBadgeWhere,
    });
    const usersEarned = usersEarnedGroups.length;

    const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const avgEarnsPerDay = days > 0 ? Number((totalEarned / days).toFixed(2)) : 0;

    // Earned grouped by badgeId (only badges earned >= 1)
    const earnedGrouped = await prisma.userBadge.groupBy({
      by: ["badgeId"],
      where: userBadgeWhere,
      _count: { badgeId: true },
    });

    const earnedMap = new Map(
      earnedGrouped.map((g) => [g.badgeId.toString(), g._count.badgeId])
    );

    // Include 0 earned badges by merging with allBadges
    const badgesWithEarned = allBadges.map((b) => ({
      badgeId: b.badgeId.toString(),
      name: b.name ?? "(Unnamed)",
      style: (typeof b.style === "string" && b.style.trim().length > 0) ? b.style.trim() : "unknown",
      earned: earnedMap.get(b.badgeId.toString()) ?? 0,
    }));

    const topBadges = [...badgesWithEarned]
      .sort((a, b) => b.earned - a.earned)
      .slice(0, 10);

    const bottomBadges = [...badgesWithEarned]
      .sort((a, b) => a.earned - b.earned)
      .slice(0, 10);

    // Earned by style (pie/bar)
    const styleMap = new Map();
    for (const b of badgesWithEarned) {
      styleMap.set(b.style, (styleMap.get(b.style) ?? 0) + b.earned);
    }
    const earnedByStyle = [...styleMap.entries()]
      .map(([style, earned]) => ({ style, earned }))
      .sort((a, b) => b.earned - a.earned);

    // Timeline (raw SQL) – day/week
    const truncateUnit = interval === "week" ? "week" : "day";

    // IMPORTANT JOIN: exhibit holds badge_id FK
    // Tables based on @@map: badge, exhibit, user_badge
    let sql = `
      SELECT
        to_char(date_trunc('${truncateUnit}', ub.created_at), 'YYYY-MM-DD') AS date,
        COUNT(*)::int AS earned
      FROM user_badge ub
      JOIN badge b ON b.badge_id = ub.badge_id
      JOIN exhibit e ON e.badge_id = b.badge_id
      WHERE ub.created_at BETWEEN $1 AND $2
    `;
    const params = [from, to];

    if (exhibitionId !== "all") {
      sql += ` AND e.exhibition_id = $3 `;
      params.push(exhibitionId);
    }

    sql += `
      GROUP BY 1
      ORDER BY 1;
    `;

    const timeline = await prisma.$queryRawUnsafe(sql, ...params);

    return {
      kpis: { totalBadges, totalEarned, usersEarned, avgEarnsPerDay },
      topBadges,
      bottomBadges,
      earnedByStyle,
      timeline,
    };
  }


  /* ============================================================
     USER – CLAIMING BADGES
     ============================================================ */

  /**
   * Find the badge assigned to an exhibit
   * (Exhibit.badgeId → Badge)
   */
  static async findByExhibitId(exhibitId) {
    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: BigInt(exhibitId) },
      include: { badge: true },
    });
    if (!exhibit || !exhibit.badge) return null;
    return exhibit.badge;
  }

  /**
   * Get all badges claimed by a user
   */
  static async getUserBadgesByUserId(userId) {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
    });
  }

  /**
   * Check if a user already owns a badge
   */
  static async findByUserAndBadge(userId, badgeId) {
    return prisma.userBadge.findFirst({
      where: { userId, badgeId },
    });
  }

  /**
   * Assign a badge to a user
   */
  static async createUserBadge(userId, badgeId) {
    return prisma.userBadge.create({
      data: { userId, badgeId },
    });
  }
}

module.exports = BadgeModel;
