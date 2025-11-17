const express = require('express');
const { PrismaClient } = require('../../generated/prisma');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/qr/:qrId
router.get('/:qrId', async (req, res) => {
  const qrId = parseInt(req.params.qrId);

  try {
    const qrCode = await prisma.qRCode.findUnique({
      where: { qrId },
      include: {
        exhibit: {
          include: {
            images: true,
            audio: {
              include: {
                language: true,
                subtitles: {
                  include: {
                    language: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!qrCode || !qrCode.exhibit) {
      return res.status(404).json({ error: 'QR Code or Exhibit not found' });
    }

    return res.json({
      exhibit: {
        title: qrCode.exhibit.title,
        description: qrCode.exhibit.description,
        images: qrCode.exhibit.images,
      },
      audio: qrCode.exhibit.audio.map((a) => ({
        audioId: a.audioId,
        title: a.title,
        fileUrl: a.fileUrl,
        language: a.language?.title,
        subtitles: a.subtitles.map((s) => ({
          text: s.text,
          language: s.language?.title,
        }))
      }))
    });
  } catch (error) {
    console.error('Error fetching QR info:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
