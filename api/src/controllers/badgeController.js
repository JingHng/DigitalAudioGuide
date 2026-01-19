const BadgeModel = require("../models/badgeModel");
const { logUserAction, logAuditAction } = require("./auditLogsController");

/**
 * Utility: Convert BigInt to string so JSON.stringify does not crash
 */
function serializeBigInt(data) {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

/* ============================================================
   PUBLIC ROUTES (No authentication required)
   These APIs are used by public visitors and frontend displays
   ============================================================ */

/**
 * GET /api/badges/allBadges
 * Returns all badges with exhibit & exhibition relations
 * Used by frontend to display and group badges by exhibition
 */
exports.getAllBadges = async (req, res) => {
  try {
    const badges = await BadgeModel.getAllBadgesWithRelations();
    return res.status(200).json(serializeBigInt(badges));
  } catch (error) {
    console.error("Error fetching badges:", error);
    return res.status(500).json({ message: "Error fetching badges" });
  }
};

/**
 * GET /api/badges/styles
 * Returns all distinct badge styles stored in the database
 * Used for filtering (e.g. cute, funny, cool)
 */
exports.getAllBadgeStyles = async (req, res) => {
  try {
    const styles = await BadgeModel.getAllDistinctStyles();
    return res.status(200).json(styles);
  } catch (error) {
    console.error("Error fetching badge styles:", error);
    return res.status(500).json({ message: "Error fetching badge styles" });
  }
};

/* ============================================================
   USER ROUTES (Requires login)
   These APIs are used by visitors who are logged in
   ============================================================ */

/**
 * GET /api/badges/userBadges
 * Returns all badges claimed by the logged-in user
 */
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user ID found" });
    }

    const userBadges = await BadgeModel.getUserBadgesByUserId(userId);
    return res.status(200).json({
      status: "success",
      data: serializeBigInt(userBadges),
    });
  } catch (error) {
    console.error("Error fetching user badges:", error);
    return res.status(500).json({ message: "Error fetching user badges" });
  }
};

/**
 * POST /api/badges/assignBadges/:exhibitId
 * Allows a user to claim the badge linked to an exhibit
 */
exports.assignBadgesToUser = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { exhibitId } = req.params;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!exhibitId) return res.status(400).json({ error: "exhibitId is required" });

    const badge = await BadgeModel.findByExhibitId(exhibitId);
    if (!badge) {
      return res.status(404).json({ error: "Badge not found for this exhibit" });
    }

    const badgeId = badge.badgeId;
    const existing = await BadgeModel.findByUserAndBadge(userId, badgeId);

    if (existing) {
      return res.json(
        serializeBigInt({
          message: "Badge already claimed",
          badgeId,
          imageUrl: badge.imageUrl,
        })
      );
    }

    await BadgeModel.createUserBadge(userId, badgeId);

    return res.json(
      serializeBigInt({
        message: "Badge claimed successfully",
        badgeId,
        imageUrl: badge.imageUrl,
      })
    );
  } catch (error) {
    console.error("Error claiming badge:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ============================================================
   ADMIN ROUTES (Requires admin or super_admin role)
   These APIs are used by the Badge Management Dashboard
   ============================================================ */

/**
 * POST /api/badges
 * Creates a new badge and assigns it to an exhibit
 */
exports.createBadge = async (req, res) => {
  try {
    const { name, description, style, imageUrl, exhibitId } = req.body;
    const adminUserId = req.user?.userId;

    if (!name || !description || !imageUrl || !exhibitId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedStyle = typeof style === "string" ? style.trim() : null;

    const created = await BadgeModel.createBadgeAndAssignToExhibit({
      name,
      description,
      style: normalizedStyle,
      imageUrl,
      exhibitId,
    });

    // Audit log
    await logAuditAction(
      adminUserId,
      null,
      "badge",
      "create",
      {
        badgeId: created.badgeId.toString(),
        name,
        style: normalizedStyle,
        exhibitId,
        imageUrl,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    return res.status(201).json(serializeBigInt(created));
  } catch (error) {
    console.error("Error creating badge:", error);
    return res.status(500).json({ message: "Error creating badge" });
  }
};

/**
 * PUT /api/badges/:id
 * Updates badge details and optionally reassigns it to a new exhibit
 */
exports.updateBadge = async (req, res) => {
  try {
    const badgeId = req.params.id;
    const { name, description, style, imageUrl, exhibitId } = req.body;

    const normalizedStyle = typeof style === "string" ? style.trim() : style;

    const updated = await BadgeModel.updateBadgeAndMaybeReassign(badgeId, {
      name,
      description,
      style: normalizedStyle,
      imageUrl,
      exhibitId,
    });

    if (!updated) return res.status(404).json({ message: "Badge not found" });

    return res.status(200).json(serializeBigInt(updated));
  } catch (error) {
    console.error("Error updating badge:", error);
    return res.status(500).json({ message: "Error updating badge" });
  }
};

/**
 * POST /api/badges/:badgeId/upload-image
 * Uploads a new image for a badge and updates imageUrl
 */
exports.uploadBadgeImage = async (req, res) => {
  try {
    const badgeId = BigInt(req.params.badgeId);
    const adminUserId = req.user?.userId;

    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({ error: "Invalid file type. Please upload an image." });
    }

    const imageUrl = `/images/${req.file.filename}`;

    const original = await BadgeModel.getBadgeById(badgeId);
    if (!original) return res.status(404).json({ error: "Badge not found." });

    const updated = await BadgeModel.updateBadgeImageUrl(badgeId, imageUrl);

    // Audit log
    await logAuditAction(
      adminUserId,
      null,
      "badge",
      "update-image",
      {
        badgeId: badgeId.toString(),
        oldImage: original.imageUrl,
        newImage: imageUrl,
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        filename: req.file.filename,
      }
    );

    return res.status(200).json(
      serializeBigInt({
        message: "Badge image uploaded successfully",
        badgeId: updated.badgeId,
        imageUrl: updated.imageUrl,
      })
    );
  } catch (err) {
    console.error("Error in uploadBadgeImage:", err);
    return res.status(500).json({ error: "Failed to upload badge image" });
  }
};

/**
 * DELETE /api/badges/:id
 * Deletes a badge and unassigns it from its exhibit
 */
exports.deleteBadge = async (req, res) => {
  try {
    const badgeId = req.params.id;
    const adminUserId = req.user?.userId;

    const badge = await BadgeModel.getBadgeById(badgeId);
    if (!badge) return res.status(404).json({ message: "Badge not found" });

    await BadgeModel.deleteBadgeAndUnassign(badgeId);

    // Audit log
    await logAuditAction(
      adminUserId,
      null,
      "badge",
      "delete",
      {
        badgeId,
        name: badge.name,
        style: badge.style,
        imageUrl: badge.imageUrl,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    return res.status(200).json({ message: "Badge deleted successfully" });
  } catch (error) {
    console.error("Error deleting badge:", error);
    return res.status(500).json({ message: "Error deleting badge" });
  }
};
