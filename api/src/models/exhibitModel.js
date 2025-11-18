// const { PrismaClient } = require('../../generated/prisma/client');
// const prisma = new PrismaClient();

// class ExhibitModel {
  
//   // Get all exhibits with images
//   static async getAllExhibits() {
//     try {
//       const exhibits = await prisma.exhibit.findMany({
//         include: {
//           images: true, 
//         },
//       });
//       return exhibits;
//     } catch (error) {
//       console.error('Error in ExhibitModel.getAllExhibits:', error);
//       throw error;
//     }
//   }

//   // Get exhibit by ID with full details
//   static async getExhibitById(exhibitId) {
//     try {
//       const exhibit = await prisma.exhibit.findUnique({
//         where: {
//           exhibitId: BigInt(exhibitId),
//         },
//         include: {
//           images: true,
//           audio: { 
//             include: { 
//               subtitles: true,
//             },
//           },
//         },
//       });
//       return exhibit;
//     } catch (error) {
//       console.error('Error in ExhibitModel.getExhibitById:', error);
//       throw error;
//     }
//   }

//   // Create a new exhibit
//   static async createExhibit(exhibitData) {
//     try {
//       const { title, description } = exhibitData;
//       const newExhibit = await prisma.exhibit.create({
//         data: {
//           title: title,
//           description: description,
//         },
//       });
//       return newExhibit;
//     } catch (error) {
//       console.error('Error in ExhibitModel.createExhibit:', error);
//       throw error;
//     }
//   }

//   // Upload image for exhibit
//   static async uploadExhibitImage(exhibitId, imageData) {
//     try {
//       const { fileUrl, title, isPrimary } = imageData;
//       const newImage = await prisma.image.create({
//         data: {
//           fileUrl: fileUrl,
//           title: title || 'Exhibit Image',
//           isPrimary: isPrimary || false,
//           exhibit: {
//             connect: { exhibitId: BigInt(exhibitId) },
//           },
//         },
//       });
//       return newImage;
//     } catch (error) {
//       console.error('Error in ExhibitModel.uploadExhibitImage:', error);
//       throw error;
//     }
//   }

//   // Find language by title
//   static async findLanguageByTitle(languageTitle) {
//     try {
//       const langRecord = await prisma.language.findFirst({ 
//         where: { title: languageTitle } 
//       });
//       return langRecord;
//     } catch (error) {
//       console.error('Error in ExhibitModel.findLanguageByTitle:', error);
//       throw error;
//     }
//   }

//   // Create audio with subtitles for exhibit
//   static async createExhibitAudio(exhibitId, audioData) {
//     try {
//       const { fileUrl, title, languageId, transcript } = audioData;
//       const newAudio = await prisma.audio.create({
//         data: {
//           fileUrl: fileUrl,
//           title: title,
//           exhibit: { connect: { exhibitId: BigInt(exhibitId) } },
//           language: { connect: { languageId: languageId } },
//           subtitles: {
//             create: {
//               languageId: languageId,
//               text: transcript,
//             },
//           },
//         },
//       });
//       return newAudio;
//     } catch (error) {
//       console.error('Error in ExhibitModel.createExhibitAudio:', error);
//       throw error;
//     }
//   }

//   // Check if exhibit exists
//   static async exhibitExists(exhibitId) {
//     try {
//       const exhibit = await prisma.exhibit.findUnique({
//         where: { exhibitId: BigInt(exhibitId) },
//         select: { exhibitId: true }
//       });
//       return !!exhibit;
//     } catch (error) {
//       console.error('Error in ExhibitModel.exhibitExists:', error);
//       throw error;
//     }
//   }

//   // Update exhibit
//   static async updateExhibit(exhibitId, updateData) {
//     try {
//       const updatedExhibit = await prisma.exhibit.update({
//         where: { exhibitId: BigInt(exhibitId) },
//         data: updateData,
//         include: {
//           images: true,
//           audio: { 
//             include: { 
//               subtitles: true,
//             },
//           },
//         },
//       });
//       return updatedExhibit;
//     } catch (error) {
//       console.error('Error in ExhibitModel.updateExhibit:', error);
//       throw error;
//     }
//   }

//   // Delete exhibit
//   static async deleteExhibit(exhibitId) {
//     try {
//       const deletedExhibit = await prisma.exhibit.delete({
//         where: { exhibitId: BigInt(exhibitId) }
//       });
//       return deletedExhibit;
//     } catch (error) {
//       console.error('Error in ExhibitModel.deleteExhibit:', error);
//       throw error;
//     }
//   }
// }

// module.exports = ExhibitModel;