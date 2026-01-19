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
