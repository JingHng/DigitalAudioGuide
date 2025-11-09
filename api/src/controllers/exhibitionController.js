
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

// const { logAuditAction } = require("./auditLogsController");

/**
 * @route   GET /api/exhibitions
 * @desc    Get all top-level exhibitions for the main listing page
 * @access  Public
 */
exports.getAllExhibitions = async (req, res) => {
  try {
    const exhibitions = await prisma.exhibition.findMany({
      where: { statusId: 1 },
      include: {
        _count: { select: { exhibits: { where: { statusId: 1 } } } }, // Also count only active exhibits
        images: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { title: 'asc' 

      },
    });
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
    const exhibitionId = BigInt(req.params.id);
    
    const exhibition = await prisma.exhibition.findFirst({ 
      where: {
        exhibitionId: exhibitionId,
        statusId: 1, 
      },
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        exhibits: {
          where: { statusId: 1 },
          select: {
            exhibitId: true,
            title: true,
            description: true,
            images: {
              select: {
                fileUrl: true,
              },
              where: { isPrimary: true },
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
    const { title, description } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    if (!title) {
      return res.status(400).json({ error: 'Exhibition title is required.' });
    }

    const imageUrl = file ? `/images/${file.filename}` : null;

    // Call the stored procedure
    const result = await prisma.$queryRaw`CALL sp_create_exhibition(${title}, ${description}, ${imageUrl}, NULL::bigint);`;
    
    const newExhibitionId = result[0].p_new_exhibition_id;
    if (!newExhibitionId) {
        throw new Error("Exhibition creation failed in database.");
    }

    await logAuditAction(
      adminUserId, null, "exhibition", "create",
      { exhibitionId: newExhibitionId.toString(), title, hasCoverImage: !!file },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(201).json({ message: "Exhibition created successfully", exhibitionId: newExhibitionId });
  } catch (err) {
    console.error("Error creating exhibition:", err);
    res.status(500).json({ message: "Failed to create exhibition" });
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
    const { title, description } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    const originalExhibition = await prisma.exhibition.findUnique({ where: { exhibitionId } });
    if (!originalExhibition) {
      return res.status(404).json({ message: "Exhibition not found." });
    }

    await prisma.$transaction(async (tx) => {
        // 1. Update the exhibition's text data
        await tx.exhibition.update({
            where: { exhibitionId },
            data: { title, description },
        });

        // 2. If a new cover image was uploaded, handle it
        if (file) {
            // Optional: Delete the old primary image first
            await tx.image.deleteMany({
                where: {
                    exhibitionId: exhibitionId,
                    isPrimary: true,
                }
            });

            // Create the new primary image record
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
        },
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

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

    // Call the stored procedure for deactivation
    await prisma.$executeRaw`CALL sp_deactivate_exhibition(${exhibitionId});`;

    await logAuditAction(
      adminUserId, null, "exhibition", "deactivate", 
      {
        exhibitionId: exhibitionId.toString(),
        title: exhibitionToDeactivate.title,
        deactivatedExhibitsCount: exhibitionToDeactivate._count.exhibits,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Exhibition and its exhibits were marked as inactive." });
  } catch (err) {
    console.error("Error deactivating exhibition:", err);
    res.status(500).json({ message: "Failed to deactivate exhibition" });
  }
};


/**
 * @route   GET /api/exhibitions/admin/all
 * @desc    Get all exhibitions with their nested exhibits for the admin panel
 * @access  Private (Admin)
 */
exports.getAllExhibitionsWithExhibits = async (req, res) => {
 try {
    const exhibitionsWithExhibits = await prisma.exhibition.findMany({
      // The select block is where we make the changes
      select: {
        exhibitionId: true,
        title: true,
        description: true,
        // *** ADD THIS: Include the status of the parent exhibition ***
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
            // *** ADD THIS: Include the status of the nested exhibit ***
            status: {
              select: {
                statusId: true,
                statusName: true,
              }
            },
            _count: {
              select: { images: true, audio: true },
            },
            images: {
              select: {
                imageId: true,
                fileUrl: true,
                title: true,
              },
              where: { isPrimary: true },
              take: 1,
            },
          },
          orderBy: {
            title: 'asc',
          },
        },
      },
      orderBy: {
        title: 'asc',
      },
    });
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

    // Call the stored procedure for reactivation
    await prisma.$executeRaw`CALL sp_reactivate_exhibition(${exhibitionId});`;

    await logAuditAction(
      adminUserId, null, "exhibition", "reactivate", 
      {
        exhibitionId: exhibitionId.toString(),
        title: exhibitionToReactivate.title,
        reactivatedExhibitsCount: exhibitionToReactivate._count.exhibits,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Exhibition and its exhibits were reactivated." });
  } catch (err) {
    console.error("Error reactivating exhibition:", err);
    res.status(500).json({ message: "Failed to reactivate exhibition" });
  }
};