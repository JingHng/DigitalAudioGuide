
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

const { logAuditAction } = require("./auditLogsController");

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
                isPrimary: true,
              },
              orderBy: [
                { isPrimary: 'desc' }, // Primary images first
                { imageId: 'asc' }     // Then by imageId
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
    const { title, description } = req.body;
    const file = req.file;
    const adminUserId = req.user?.userId;

    if (!title) {
      return res.status(400).json({ error: 'Exhibition title is required.' });
    }

    //Use a Transaction to create the exhibition and the image together
    const newExhibition = await prisma.$transaction(async (tx) => {
      // Create the exhibition
      const exhibition = await tx.exhibition.create({
        data: {
          title,
          description,
          statusId: 1, // Default to Active
        },
      });

      //If an image was uploaded, create the image record linked to this exhibition
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

    //Log the action
    await logAuditAction(
      adminUserId, null, "exhibition", "create",
      { 
        exhibitionId: newExhibition.exhibitionId.toString(), 
        title: newExhibition.title, 
        hasCoverImage: !!file 
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    // Return the ID as a string to avoid BigInt serialization issues
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

    // 1. Check if it exists and get exhibit count for auditing
    const exhibitionToDeactivate = await prisma.exhibition.findUnique({
      where: { exhibitionId },
      include: { _count: { select: { exhibits: true } } },
    });

    if (!exhibitionToDeactivate) {
      return res.status(404).json({ message: "Exhibition not found." });
    }

    // 2. Run deactivation in a transaction
    await prisma.$transaction(async (tx) => {
      // Deactivate the parent exhibition (assuming statusId 2 is 'Inactive')
      await tx.exhibition.update({
        where: { exhibitionId },
        data: { statusId: 2 }, 
      });

      // Deactivate all exhibits inside this exhibition
      await tx.exhibit.updateMany({
        where: { exhibitionId },
        data: { statusId: 2 },
      });
    });

    // 3. Log the action (Converting IDs to string for JSON safety)
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
    res.status(500).json({ 
      message: "Failed to deactivate exhibition", 
      error: err.message 
    });
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
            additionalDescription: true,
            sequence: true,
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
                isPrimary: true,
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

    // Standard Prisma Transaction to set everything back to Active (statusId 1)
    await prisma.$transaction(async (tx) => {
      await tx.exhibition.update({
        where: { exhibitionId },
        data: { statusId: 1 }, 
      });

      await tx.exhibit.updateMany({
        where: { exhibitionId },
        data: { statusId: 1 },
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
    console.log('🎯 getExhibitionTour called with ID:', req.params.id);
    const exhibitionId = BigInt(req.params.id);
    console.log('🎯 Converted to BigInt:', exhibitionId);
    
    const exhibition = await prisma.exhibition.findFirst({ 
      where: {
        exhibitionId: exhibitionId,
        statusId: 1, 
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
          where: { statusId: 1 },
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
              where: { languageId: 1 }, // Default to English
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
            sequence: 'asc', // Order by sequence for tour flow
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

    // Add totalStops count and current position metadata
    const totalStops = exhibition.exhibits.length;
    const exhibitsWithPosition = exhibition.exhibits.map((exhibit, index) => {
      // Convert badge object to badges array for frontend consistency
      const badges = exhibit.badge ? [exhibit.badge] : [];
      
      return {
        ...exhibit,
        badge: undefined, // Remove singular badge
        badges: badges,   // Add badges array
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

    // Get current exhibit with its sequence
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

    // Find next exhibit in sequence
    const nextExhibit = await prisma.exhibit.findFirst({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { gt: currentExhibit.sequence },
        statusId: 1,
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

    // Get total exhibits count for position metadata
    const totalExhibits = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        statusId: 1,
      },
    });

    // Find the position of this exhibit
    const exhibitsBeforeThis = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: nextExhibit.sequence },
        statusId: 1,
      },
    });

    const currentStop = exhibitsBeforeThis + 1;
    
    // Convert badge to badges array
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

    // Get current exhibit with its sequence
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

    // Find previous exhibit in sequence
    const previousExhibit = await prisma.exhibit.findFirst({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: currentExhibit.sequence },
        statusId: 1,
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

    // Get total exhibits count for position metadata
    const totalExhibits = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        statusId: 1,
      },
    });

    // Find the position of this exhibit
    const exhibitsBeforeThis = await prisma.exhibit.count({
      where: {
        exhibitionId: currentExhibit.exhibitionId,
        sequence: { lt: previousExhibit.sequence },
        statusId: 1,
      },
    });

    const currentStop = exhibitsBeforeThis + 1;
    
    // Convert badge to badges array
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

    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId: exhibitId },
      select: { exhibitId: true, title: true, exhibitionId: true, sequence: true },
    });

    if (!exhibit) {
      return res.status(404).json({ message: "Exhibit not found." });
    }

    // Update the sequence
    const updatedExhibit = await prisma.exhibit.update({
      where: { exhibitId: exhibitId },
      data: { sequence: parseInt(sequence) },
      select: {
        exhibitId: true,
        title: true,
        sequence: true,
        exhibitionId: true,
      },
    });

    await logAuditAction(
      adminUserId, null, "exhibit", "update_sequence", 
      {
        exhibitId: exhibitId.toString(),
        title: exhibit.title,
        oldSequence: exhibit.sequence,
        newSequence: sequence,
      },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ 
      message: "Exhibit sequence updated successfully.",
      exhibit: updatedExhibit 
    });
  } catch (err) {
    console.error("Error updating exhibit sequence:", err);
    
    // Handle unique constraint violation
    if (err.code === 'P2002') {
      return res.status(400).json({ 
        message: "Sequence number already exists for this exhibition. Please choose a different number." 
      });
    }
    
    res.status(500).json({ message: "Failed to update exhibit sequence" });
  }
};