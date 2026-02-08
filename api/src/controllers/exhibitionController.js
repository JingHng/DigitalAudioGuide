const prisma = require('../db/prisma');
const { logAuditAction } = require("./auditLogsController");

// Simple in-memory cache for exhibitions list (public endpoint)
let exhibitionsCache = null;
let exhibitionsCacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Admin cache
let adminExhibitionsCache = null;
let adminExhibitionsCacheTime = null;
const ADMIN_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for admin (shorter for fresher data)

// =====================================================
// Auto active/inactive based on startsAt/endsAt
// =====================================================
const ACTIVE_STATUS_ID = 1;
const INACTIVE_STATUS_ID = 2;

// Helper to compute statusId based on start and end dates
function computeStatusIdFromWindow(startsAt, endsAt, now = new Date()) {
  // Empty window means no auto-change
  if (!startsAt && !endsAt) return null;

  const startOk = startsAt ? now >= new Date(startsAt) : true;
  const endOk = endsAt ? now <= new Date(endsAt) : true;

  return (startOk && endOk) ? ACTIVE_STATUS_ID : INACTIVE_STATUS_ID;
}

// Sync only exhibitions that have time windows (performance-friendly)
async function syncExhibitionStatuses() {
  try {
    const now = new Date();

    const exhibitions = await prisma.exhibition.findMany({
      where: {
        OR: [{ startsAt: { not: null } }, { endsAt: { not: null } }],
      },
      select: { exhibitionId: true, startsAt: true, endsAt: true, statusId: true },
    });

    const updates = [];
    for (const ex of exhibitions) {
      const desired = computeStatusIdFromWindow(ex.startsAt, ex.endsAt, now);
      if (desired !== null && desired !== ex.statusId) {
        updates.push(
          prisma.exhibition.update({
            where: { exhibitionId: ex.exhibitionId },
            data: { statusId: desired },
          })
        );
      }
    }

    if (updates.length) await prisma.$transaction(updates);
  } catch (err) {
    // Don't block API if sync fails; just log it.
    console.error("Error syncing exhibition statuses:", err);
  }
}

// Helper to clear cache when data changes
exports.clearExhibitionsCache = function clearExhibitionsCache() {
  exhibitionsCache = null;
  exhibitionsCacheTime = null;
  adminExhibitionsCache = null;
  adminExhibitionsCacheTime = null;
};

/**
 * @route   GET /api/exhibitions
 * @desc    Get all top-level exhibitions for the main listing page
 * @access  Public
 */
exports.getAllExhibitions = async (req, res) => {
  try {
    await syncExhibitionStatuses();

    // Check cache first
    const now = Date.now();
    if (exhibitionsCache && exhibitionsCacheTime && (now - exhibitionsCacheTime < CACHE_DURATION)) {
      return res.status(200).json(exhibitionsCache);
    }

    const exhibitions = await prisma.exhibition.findMany({
      where: { statusId: ACTIVE_STATUS_ID },
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        _count: { select: { exhibits: { where: { statusId: ACTIVE_STATUS_ID } } } },
        images: {
          where: { isPrimary: true },
          take: 1,
          select: {
            imageId: true,
            fileUrl: true,
            isPrimary: true
          }
        },
      },
      orderBy: { title: 'asc' },
    });

    // Update cache
    exhibitionsCache = exhibitions;
    exhibitionsCacheTime = now;

    res.status(200).json(exhibitions);
  } catch (err) {
    console.error("Error fetching exhibitions:", err);
    res.status(500).json({ message: "Error fetching exhibitions" });
  }
};

/**
 * @route   GET /api/exhibitions/:id
 * @desc    Get a single exhibition and all of its associated exhibits
 * @access  Public
 */
exports.getExhibitionById = async (req, res) => {
  try {
    await syncExhibitionStatuses();

    const exhibitionId = BigInt(req.params.id);

    const exhibition = await prisma.exhibition.findFirst({
      where: {
        exhibitionId: exhibitionId,
        statusId: ACTIVE_STATUS_ID,
      },
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        exhibits: {
          where: { statusId: ACTIVE_STATUS_ID },
          select: {
            exhibitId: true,
            title: true,
            description: true,
            images: {
              select: {
                fileUrl: true,
                isPrimary: true,
              },
              orderBy: [
                { isPrimary: 'desc' },
                { imageId: 'asc' }
              ],
              take: 1,
            },
          },
          orderBy: {
            title: 'asc',
          },
        },
      },
    });

    if (!exhibition) {
      return res.status(404).json({ message: "Active exhibition not found" });
    }

    res.status(200).json(exhibition);
  } catch (err) {
    console.error("Error fetching exhibition by ID:", err);
    res.status(500).json({ message: "Error fetching exhibition" });
  }
};


/**
 * @route   POST /api/exhibitions
 * @desc    Create a new main exhibition (category)
 * @access  Private (Admin)
 */
exports.createExhibition = async (req, res) => {
  try {
    const { title, description, startsAt, endsAt } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      return res.status(400).json({ message: "startsAt must be earlier than endsAt." });
    }

    if (!title) {
      return res.status(400).json({ error: 'Exhibition title is required.' });
    }

    const newExhibition = await prisma.$transaction(async (tx) => {
      const desiredStatusId = computeStatusIdFromWindow(startsAt, endsAt);

      const exhibition = await tx.exhibition.create({
        data: {
          title,
          description,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
          statusId: desiredStatusId ?? ACTIVE_STATUS_ID,
        },
      });

      if (file) {
        await tx.image.create({
          data: {
            fileUrl: `/images/${file.filename}`,
            title: `Cover for ${title}`,
            isPrimary: true,
            exhibitionId: exhibition.exhibitionId,
          },
        });
      }

      return exhibition;
    });

    await logAuditAction(
      adminUserId, null, "exhibition", "create",
      {
        exhibitionId: newExhibition.exhibitionId.toString(),
        title: newExhibition.title,
        hasCoverImage: !!file
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(201).json({
      message: "Exhibition created successfully",
      exhibitionId: newExhibition.exhibitionId.toString()
    });

  } catch (err) {
    console.error("Detailed Server Error:", err);
    res.status(500).json({
      message: "Failed to create exhibition",
      error: err.message
    });
  }
};


/**
 * @route   PUT /api/exhibitions/:id
 * @desc    Update an existing main exhibition
 * @access  Private (Admin)
 */
exports.updateExhibition = async (req, res) => {
  try {
    const exhibitionId = BigInt(req.params.id);
    const { title, description, startsAt, endsAt } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      return res.status(400).json({ message: "startsAt must be earlier than endsAt." });
    }

    const originalExhibition = await prisma.exhibition.findUnique({ where: { exhibitionId } });
    if (!originalExhibition) {
      return res.status(404).json({ message: "Exhibition not found." });
    }

    await prisma.$transaction(async (tx) => {
      const desiredStatusId = computeStatusIdFromWindow(startsAt, endsAt);

      await tx.exhibition.update({
        where: { exhibitionId },
        data: {
          title,
          description,
          startsAt: startsAt === undefined ? undefined : (startsAt ? new Date(startsAt) : null),
          endsAt: endsAt === undefined ? undefined : (endsAt ? new Date(endsAt) : null),
          ...(desiredStatusId !== null ? { statusId: desiredStatusId } : {}),
        },
      });

      if (file) {
        await tx.image.deleteMany({
          where: {
            exhibitionId: exhibitionId,
            isPrimary: true,
          }
        });

        await tx.image.create({
          data: {
            fileUrl: `/images/${file.filename}`,
            title: `Cover for ${title}`,
            exhibitionId: exhibitionId,
            isPrimary: true,
          }
        });
      }
    });

    const updatedExhibition = await prisma.exhibition.findUnique({ where: { exhibitionId } });

    await logAuditAction(
      adminUserId,
      null,
      "exhibition",
      "update",
      {
        exhibitionId: exhibitionId.toString(),
        changes: {
          title: { from: originalExhibition.title, to: updatedExhibition.title },
          description: { from: originalExhibition.description, to: updatedExhibition.description },
          startsAt: { from: originalExhibition.startsAt, to: updatedExhibition.startsAt },
          endsAt: { from: originalExhibition.endsAt, to: updatedExhibition.endsAt },
          statusId: { from: originalExhibition.statusId, to: updatedExhibition.statusId },
        },
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(200).json(updatedExhibition);
  } catch (err) {
    console.error("Error updating exhibition:", err);
    res.status(500).json({ message: "Failed to update exhibition" });
  }
};

/**
 * @route   DELETE /api/exhibitions/:id
 * @desc    Delete a main exhibition (and all exhibits within it)
 * @access  Private (Admin)
 */
exports.deleteExhibition = async (req, res) => {
  try {
    const exhibitionId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    const exhibitionToDeactivate = await prisma.exhibition.findUnique({
      where: { exhibitionId },
      include: { _count: { select: { exhibits: true } } },
    });

    if (!exhibitionToDeactivate) {
      return res.status(404).json({ message: "Exhibition not found." });
    }

    await prisma.$transaction(async (tx) => {
      // IMPORTANT: also clear time window so auto-sync won't reactivate it
      await tx.exhibition.update({
        where: { exhibitionId },
        data: { statusId: INACTIVE_STATUS_ID, startsAt: null, endsAt: null },
      });

      await tx.exhibit.updateMany({
        where: { exhibitionId },
        data: { statusId: INACTIVE_STATUS_ID },
      });
    });

    await logAuditAction(
      adminUserId, null, "exhibition", "deactivate",
      {
        exhibitionId: exhibitionId.toString(),
        title: exhibitionToDeactivate.title,
        deactivatedExhibitsCount: exhibitionToDeactivate._count.exhibits,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(200).json({ message: "Exhibition and its exhibits were marked as inactive." });
  } catch (err) {
    console.error("Error deactivating exhibition:", err);
    res.status(500).json({
      message: "Failed to deactivate exhibition",
      error: err.message
    });
  }
};


/**
 * @route   GET /api/exhibitions/admin/all
 * @desc    Get all exhibitions with their nested exhibits for the admin panel (OPTIMIZED)
 * @access  Private (Admin)
 */
exports.getAllExhibitionsWithExhibits = async (req, res) => {
  try {
    await syncExhibitionStatuses();

    const now = Date.now();
    if (adminExhibitionsCache && adminExhibitionsCacheTime && (now - adminExhibitionsCacheTime < ADMIN_CACHE_DURATION)) {
      return res.status(200).json(adminExhibitionsCache);
    }

    const exhibitionsWithExhibits = await prisma.exhibition.findMany({
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        status: {
          select: {
            statusId: true,
            statusName: true,
          }
        },
        exhibits: {
          select: {
            exhibitId: true,
            title: true,
            description: true,
            sequence: true,
            status: {
              select: {
                statusId: true,
                statusName: true,
              }
            },
            _count: {
              select: {
                images: true,
                audio: true
              },
            },
            images: {
              where: {
                isPrimary: true
              },
              take: 1,
              select: {
                imageId: true,
                fileUrl: true,
                isPrimary: true,
                title: true,
              },
            },
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });

    adminExhibitionsCache = exhibitionsWithExhibits;
    adminExhibitionsCacheTime = now;

    res.status(200).json(exhibitionsWithExhibits);
  } catch (err) {
    console.error("Error fetching exhibitions for admin:", err);
    res.status(500).json({ message: "Error fetching data for admin panel" });
  }
};


exports.reactivateExhibition = async (req, res) => {
  try {
    const exhibitionId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    const exhibitionToReactivate = await prisma.exhibition.findUnique({
      where: { exhibitionId },
      include: { _count: { select: { exhibits: true } } },
    });

    if (!exhibitionToReactivate) {
      return res.status(404).json({ message: "Exhibition not found." });
    }

    // IMPORTANT: use time window rule if time window exists, otherwise set Active.
    const desiredStatusId = computeStatusIdFromWindow(
      exhibitionToReactivate.startsAt,
      exhibitionToReactivate.endsAt
    );

    await prisma.$transaction(async (tx) => {
      await tx.exhibition.update({
        where: { exhibitionId },
        data: { statusId: desiredStatusId ?? ACTIVE_STATUS_ID },
      });

      // Keep your original behavior (reactivate all exhibits)
      await tx.exhibit.updateMany({
        where: { exhibitionId },
        data: { statusId: ACTIVE_STATUS_ID },
      });
    });

    await logAuditAction(
      adminUserId, null, "exhibition", "reactivate",
      {
        exhibitionId: exhibitionId.toString(),
        title: exhibitionToReactivate.title,
        reactivatedExhibitsCount: exhibitionToReactivate._count.exhibits,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(200).json({ message: "Exhibition and its exhibits were reactivated." });
  } catch (err) {
    console.error("Error reactivating exhibition:", err);
    res.status(500).json({ message: "Failed to reactivate exhibition", error: err.message });
  }
};

// ====================================================================
// TOUR-RELATED ENDPOINTS
// ====================================================================

/**
 * @route   GET /api/exhibitions/:id/tour
 * @desc    Get exhibition with exhibits ordered by sequence (for tour experience)
 * @access  Public
 */
exports.getExhibitionTour = async (req, res) => {
  try {
    await syncExhibitionStatuses();

    console.log('🎯 getExhibitionTour called with ID:', req.params.id);
    const exhibitionId = BigInt(req.params.id);
    console.log('🎯 Converted to BigInt:', exhibitionId);

    const exhibition = await prisma.exhibition.findFirst({
      where: {
        exhibitionId: exhibitionId,
        statusId: ACTIVE_STATUS_ID,
      },
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        images: {
          select: {
            fileUrl: true,
            isPrimary: true,
          },
          where: { isPrimary: true },
          take: 1,
        },
        exhibits: {
          where: { statusId: ACTIVE_STATUS_ID },
          select: {
            exhibitId: true,
            title: true,
            description: true,
            additionalDescription: true,
            sequence: true,
            badge: {
              select: {
                badgeId: true,
                name: true,
                description: true,
                imageUrl: true,
              },
            },
            images: {
              select: {
                imageId: true,
                fileUrl: true,
                title: true,
                isPrimary: true,
              },
              orderBy: [
                { isPrimary: 'desc' },
                { imageId: 'asc' }
              ],
            },
            audio: {
              select: {
                audioId: true,
                fileUrl: true,
                title: true,
                description: true,
                language: {
                  select: {
                    languageId: true,
                    title: true,
                    code: true,
                  },
                },
              },
              where: { languageId: 1 },
              take: 1,
            },
            qrCodes: {
              select: {
                qrId: true,
                qrUrl: true,
              },
              take: 1,
            },
          },
          orderBy: {
            sequence: 'asc',
          },
        },
      },
    });

    console.log('🎯 Exhibition found:', exhibition ? 'YES' : 'NO');
    if (exhibition) {
      console.log('🎯 Exhibits count:', exhibition.exhibits.length);
    }

    if (!exhibition) {
      return res.status(404).json({ message: "Active exhibition not found" });
    }

    const totalStops = exhibition.exhibits.length;
    const exhibitsWithPosition = exhibition.exhibits.map((exhibit, index) => {
      const badges = exhibit.badge ? [exhibit.badge] : [];
      return {
        ...exhibit,
        badge: undefined,
        badges: badges,
        currentStop: index + 1,
        totalStops: totalStops,
        isFirst: index === 0,
        isLast: index === totalStops - 1,
      };
    });

    res.status(200).json({
      ...exhibition,
      exhibits: exhibitsWithPosition,
      totalStops: totalStops,
    });
    console.log('🎯 Successfully sent tour response');
  } catch (err) {
    console.error("❌ Error fetching exhibition tour:", err);
    console.error("❌ Error stack:", err.stack);
    res.status(500).json({ message: "Error fetching exhibition tour", error: err.message });
  }
};

/**
 * @route   GET /api/exhibits/:id/next
 * @desc    Get the next exhibit in the tour sequence
 * @access  Public
 */
exports.getNextExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);

    const currentExhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: exhibitId },
      select: {
        exhibitionId: true,
        sequence: true,
      },
    });

    if (!currentExhibit || !currentExhibit.exhibitionId || currentExhibit.sequence === null) {
      return res.status(404).json({ message: "Current exhibit not found or not part of a tour" });
    }

    const nextExhibit = await prisma.exhibit.findFirst({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { gt: currentExhibit.sequence },
        statusId: ACTIVE_STATUS_ID,
      },
      select: {
        exhibitId: true,
        title: true,
        description: true,
        additionalDescription: true,
        sequence: true,
        badge: {
          select: {
            badgeId: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
        images: {
          select: {
            imageId: true,
            fileUrl: true,
            title: true,
            isPrimary: true,
          },
          orderBy: [
            { isPrimary: 'desc' },
            { imageId: 'asc' }
          ],
        },
        audio: {
          select: {
            audioId: true,
            fileUrl: true,
            title: true,
            description: true,
            language: {
              select: {
                languageId: true,
                title: true,
                code: true,
              },
            },
          },
          where: { languageId: 1 },
          take: 1,
        },
      },
      orderBy: { sequence: 'asc' },
    });

    if (!nextExhibit) {
      return res.status(404).json({ message: "No next exhibit found. Tour complete!" });
    }

    const totalExhibits = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        statusId: ACTIVE_STATUS_ID,
      },
    });

    const exhibitsBeforeThis = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: nextExhibit.sequence },
        statusId: ACTIVE_STATUS_ID,
      },
    });

    const currentStop = exhibitsBeforeThis + 1;
    const badges = nextExhibit.badge ? [nextExhibit.badge] : [];

    res.status(200).json({
      ...nextExhibit,
      badge: undefined,
      badges: badges,
      currentStop: currentStop,
      totalStops: totalExhibits,
      isFirst: currentStop === 1,
      isLast: currentStop === totalExhibits,
    });
  } catch (err) {
    console.error("Error fetching next exhibit:", err);
    res.status(500).json({ message: "Error fetching next exhibit" });
  }
};

/**
 * @route   GET /api/exhibits/:id/previous
 * @desc    Get the previous exhibit in the tour sequence
 * @access  Public
 */
exports.getPreviousExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);

    const currentExhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: exhibitId },
      select: {
        exhibitionId: true,
        sequence: true,
      },
    });

    if (!currentExhibit || !currentExhibit.exhibitionId || currentExhibit.sequence === null) {
      return res.status(404).json({ message: "Current exhibit not found or not part of a tour" });
    }

    const previousExhibit = await prisma.exhibit.findFirst({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: currentExhibit.sequence },
        statusId: ACTIVE_STATUS_ID,
      },
      select: {
        exhibitId: true,
        title: true,
        description: true,
        additionalDescription: true,
        sequence: true,
        badge: {
          select: {
            badgeId: true,
            name: true,
            description: true,
            imageUrl: true,
          },
        },
        images: {
          select: {
            imageId: true,
            fileUrl: true,
            title: true,
            isPrimary: true,
          },
          orderBy: [
            { isPrimary: 'desc' },
            { imageId: 'asc' }
          ],
        },
        audio: {
          select: {
            audioId: true,
            fileUrl: true,
            title: true,
            description: true,
            language: {
              select: {
                languageId: true,
                title: true,
                code: true,
              },
            },
          },
          where: { languageId: 1 },
          take: 1,
        },
      },
      orderBy: { sequence: 'desc' },
    });

    if (!previousExhibit) {
      return res.status(404).json({ message: "No previous exhibit found. This is the first stop!" });
    }

    const totalExhibits = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        statusId: ACTIVE_STATUS_ID,
      },
    });

    const exhibitsBeforeThis = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: previousExhibit.sequence },
        statusId: ACTIVE_STATUS_ID,
      },
    });

    const currentStop = exhibitsBeforeThis + 1;
    const badges = previousExhibit.badge ? [previousExhibit.badge] : [];

    res.status(200).json({
      ...previousExhibit,
      badge: undefined,
      badges: badges,
      currentStop: currentStop,
      totalStops: totalExhibits,
      isFirst: currentStop === 1,
      isLast: currentStop === totalExhibits,
    });
  } catch (err) {
    console.error("Error fetching previous exhibit:", err);
    res.status(500).json({ message: "Error fetching previous exhibit" });
  }
};

/**
 * @route   PUT /api/exhibits/:id/sequence
 * @desc    Update the sequence order of an exhibit (Admin only)
 * @access  Private (Admin)
 */
exports.updateExhibitSequence = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const { sequence } = req.body;
    const adminUserId = req.user?.userId;

    if (sequence === undefined || sequence === null) {
      return res.status(400).json({ error: 'Sequence number is required.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const exhibit = await tx.exhibit.findUnique({
        where: { exhibitId: exhibitId },
        select: { exhibitId: true, title: true, exhibitionId: true, sequence: true },
      });

      if (!exhibit) {
        throw new Error('Exhibit not found');
      }

      const updatedExhibit = await tx.exhibit.update({
        where: { exhibitId: exhibitId },
        data: { sequence: parseInt(sequence) },
        select: {
          exhibitId: true,
          title: true,
          sequence: true,
          exhibitionId: true,
        },
      });

      return { exhibit, updatedExhibit };
    });

    await logAuditAction(
      adminUserId, null, "exhibit", "update_sequence",
      {
        exhibitId: exhibitId.toString(),
        title: result.exhibit.title,
        oldSequence: result.exhibit.sequence,
        newSequence: sequence,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(200).json({
      message: "Exhibit sequence updated successfully.",
      exhibit: result.updatedExhibit
    });
  } catch (err) {
    console.error("Error updating exhibit sequence:", err);

    if (err.message === 'Exhibit not found') {
      return res.status(404).json({ message: "Exhibit not found." });
    }

    if (err.code === 'P2002') {
      return res.status(400).json({
        message: "Sequence number already exists for this exhibition. Please choose a different number."
      });
    }

    res.status(500).json({ message: "Failed to update exhibit sequence" });
  }
};

/**
 * @route   PUT /api/exhibitions/:exhibitionId/exhibits/reorder
 * @desc    Batch update exhibit sequences for an entire exhibition (OPTIMIZED)
 * @access  Admin only
 */
exports.batchUpdateExhibitSequences = async (req, res) => {
  try {
    const exhibitionId = BigInt(req.params.exhibitionId);
    const { exhibits } = req.body;
    const adminUserId = req.user?.userId;

    if (!Array.isArray(exhibits) || exhibits.length === 0) {
      return res.status(400).json({ error: 'Exhibits array is required.' });
    }

    for (const item of exhibits) {
      if (!item.exhibitId || item.sequence === undefined || item.sequence === null) {
        return res.status(400).json({
          error: 'Each exhibit must have exhibitId and sequence.'
        });
      }
    }

    const exhibitIds = exhibits.map(item => `'${item.exhibitId}'`).join(', ');

    await prisma.$executeRawUnsafe(`
      UPDATE exhibit
      SET sequence = -sequence - 1000
      WHERE exhibit_id::text IN (${exhibitIds})
      AND exhibition_id = ${exhibitionId}
    `);

    const caseStatements = exhibits.map(item =>
      `WHEN '${item.exhibitId}' THEN ${parseInt(item.sequence)}`
    ).join(' ');

    await prisma.$executeRawUnsafe(`
      UPDATE exhibit
      SET sequence = CASE exhibit_id::text
        ${caseStatements}
      END
      WHERE exhibit_id::text IN (${exhibitIds})
      AND exhibition_id = ${exhibitionId}
    `);

    const updatedExhibits = await prisma.exhibit.findMany({
      where: {
        exhibitId: { in: exhibits.map(e => BigInt(e.exhibitId)) },
        exhibitionId: exhibitionId,
      },
      select: {
        exhibitId: true,
        title: true,
        sequence: true,
      },
      orderBy: { sequence: 'asc' }
    });

    await logAuditAction(
      adminUserId, null, "exhibition", "batch_reorder_exhibits",
      {
        exhibitionId: exhibitionId.toString(),
        exhibitsCount: exhibits.length,
        updates: exhibits.map(e => ({ id: e.exhibitId.toString(), seq: e.sequence })),
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    exports.clearExhibitionsCache();

    res.status(200).json({
      message: `Successfully reordered ${updatedExhibits.length} exhibits.`,
      exhibits: updatedExhibits
    });
  } catch (err) {
    console.error("Error batch updating exhibit sequences:", err);

    if (err.code === 'P2002') {
      return res.status(400).json({
        message: "Duplicate sequence numbers detected. Each exhibit must have a unique sequence."
      });
    }

    res.status(500).json({ message: "Failed to update exhibit sequences" });
  }
};

/**
 * @route   GET /api/exhibitions/stats
 * @desc    Get exhibition statistics for dashboard (optimized - returns only what's needed)
 * @access  Public
 */
exports.getExhibitionStats = async (req, res) => {
  try {
    await syncExhibitionStatuses();

    const totalExhibitions = await prisma.exhibition.count({
      where: { statusId: ACTIVE_STATUS_ID }
    });

    const topExhibitions = await prisma.exhibition.findMany({
      where: { statusId: ACTIVE_STATUS_ID },
      select: {
        exhibitionId: true,
        title: true,
        createdAt: true,
        _count: {
          select: {
            exhibits: { where: { statusId: ACTIVE_STATUS_ID } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6
    });

    res.status(200).json({
      totalExhibitions,
      recentExhibitions: topExhibitions.map(ex => ({
        id: ex.exhibitionId,
        name: ex.title,
        exhibitCount: ex._count.exhibits
      }))
    });
  } catch (err) {
    console.error("Error fetching exhibition stats:", err);
    res.status(500).json({ message: "Error fetching exhibition statistics" });
  }
};