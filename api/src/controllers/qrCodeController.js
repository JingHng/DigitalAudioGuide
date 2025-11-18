const QRCodeModel = require('../models/qrCodeModel');

class QRCodeController {
  
  // GET /api/qr/:qrCodeId - Get QR code with exhibit details
  static async getQRCodeInfo(req, res) {
    try {
      const { qrCodeId } = req.params;

      const qrCode = await QRCodeModel.getQRCodeWithExhibit(qrCodeId);

      if (!qrCode || !qrCode.exhibit) {
        return res.status(404).json({ 
          error: 'QR Code or Exhibit not found' 
        });
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
      res.status(500).json({ 
        error: 'Internal Server Error' 
      });
    }
  }
}

module.exports = QRCodeController;