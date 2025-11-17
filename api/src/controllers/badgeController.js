const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * @route   GET /api/badges
 * @desc    Retrieve all badges from the database, ordered by badgeId
 * @access  Public
 */
exports.getAllBadges = async (req, res) => {
  try {
    // Fetch all badges from the database, ordered ascending by badgeId
    const badges = await prisma.badge.findMany({
      orderBy: { badgeId: 'asc' }
    });

    // Respond with the fetched badges
    res.status(200).json(badges);
  } catch (err) {
    console.error("Error fetching badges:", err);
    res.status(500).json({ message: "Error fetching badges" });
  }
};

/**
 * @route   GET /api/users/badges
 * @desc    Retrieve all badges associated with the logged-in user, including full badge details
 * @access  Private
 */
exports.getUserBadges = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      // Return 401 Unauthorized if no user ID is found in the request
      return res.status(401).json({ message: "Unauthorized: No user ID found" });
    }

    // Fetch all badges linked to the user, including all badge fields
    const userBadges = await prisma.userBadge.findMany({
      where: { userId },
      include: {
        badge: true,
      },
    });

    // Respond with the user's badges
    res.status(200).json({ status: "success", data: userBadges });
  } catch (err) {
    console.error("Error fetching user badges:", err);
    res.status(500).json({ message: "Error fetching user badges" });
  }
};

// /**
//  * @route   PATCH /api/exhibits/:exhibitId/badge-image
//  * @desc    Update the image of the badge associated with a specific exhibit
//  * @access  Private
//  */
// exports.updateBadgeImage = async (req, res) => {
//   try {
//     const exhibitId = req.params.exhibitId; // Get exhibit ID from route parameter
//     const imageFile = req.file; // Get uploaded file from request
//     const performedByUserId = req.user?.userId; // Get user ID performing the action

//     if (!performedByUserId) {
//       return res.status(401).json({ message: "Unauthorized: No user ID found" });
//     }

//     if (!imageFile) {
//       return res.status(400).json({ message: "No image file uploaded" });
//     }

//     // Use a transaction to ensure atomicity of updating badge and audit log
//     const updatedBadge = await prisma.$transaction(async (tx) => {
//       // Find the exhibit and its associated badge
//       const exhibit = await tx.exhibit.findUnique({
//         where: { exhibitId },
//         select: { badgeId: true, title: true },
//       });

//       if (!exhibit || !exhibit.badgeId) {
//         return null; // Exhibit or its badge not found
//       }

//       // Construct the image URL
//       const imageUrl = `http://localhost:3000/uploads/${imageFile.filename}`;

//       // Update the badge with the new image URL and updated timestamp
//       const updatedBadge = await tx.badge.update({
//         where: { badgeId: exhibit.badgeId },
//         data: { imageUrl, updatedAt: new Date() },
//         select: { badgeId: true, name: true, imageUrl: true },
//       });

//       // Create an audit log entry for this update
//       await tx.auditLog.create({
//         data: {
//           userId: performedByUserId,
//           actionType: "UPDATE",
//           targetType: "BADGE",
//           targetId: updatedBadge.badgeId.toString(),
//           description: `Uploaded new badge image "${imageFile.filename}" for exhibit "${exhibit.title}"`,
//         },
//       });

//       return updatedBadge;
//     });

//     if (!updatedBadge) {
//       return res.status(404).json({ message: "Exhibit or associated badge not found" });
//     }

//     // Respond with the updated badge
//     res.status(200).json({ status: "success", data: updatedBadge });
//   } catch (err) {
//     console.error("Error updating badge image:", err);
//     res.status(500).json({ message: "Failed to update badge image" });
//   }
// };