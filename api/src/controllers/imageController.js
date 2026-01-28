const prisma = require('../db/prisma');
const fs = require('fs');
const path = require('path');
const { logUserAction, logAuditAction } = require('./auditLogsController');

exports.deleteImage = async (req, res) => {
  try {
    const imageId = BigInt(req.params.id);
    const adminUserId = req.user?.userId; // Assuming user info is in req.user

    // First, find the image to get its fileUrl
    const image = await prisma.image.findUnique({
      where: { imageId },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found.' });
    }

    // Then, delete the image from the database
    await prisma.image.delete({
      where: { imageId },
    });

    // Log the audit action
    await logAuditAction(
      adminUserId,
      null,
      'image',
      'delete',
      {
        imageId: imageId.toString(),
        fileUrl: image.fileUrl,
        title: image.title,
        exhibitId: image.exhibitId?.toString()
      },
      {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    );

    // Finally, delete the physical file from the server
    if (image.fileUrl) {
      const filePath = path.join(__dirname, '..', 'public', image.fileUrl);
      fs.unlink(filePath, (err) => {
        if (err) {
          // Log the error, but don't fail the request since the DB record is gone
          console.error('Failed to delete physical image file:', err);
        }
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error('Error in deleteImage:', err);
    res.status(500).json({ error: 'Failed to delete image.' });
  } finally {
    await prisma.$disconnect(); // Disconnect client when done
  }
};