const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

class QRCodeModel {
  
  // Get QR code with exhibit details by QR code ID
  static async getQRCodeWithExhibit(qrCodeId) {
    try {
      const qrCode = await prisma.qRCode.findUnique({
        where: { qrCodeId: BigInt(qrCodeId) },
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

      return qrCode;
    } catch (error) {
      console.error('Error in QRCodeModel.getQRCodeWithExhibit:', error);
      throw error;
    }
  }
}

module.exports = QRCodeModel;