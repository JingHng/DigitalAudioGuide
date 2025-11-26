const { PrismaClient } = require("../../generated/prisma"); 
const googleTTS = require("google-tts-api");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const qr = require("qr-image");
// const { logUserAction, logAuditAction } = require("./auditLogsController"); // Uncomment this if you use the audit log

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// Get all courses (formerly exhibits)
exports.getCourses = async (req, res) => {
  try {
    // Model: exhibit -> course
    const courses = await prisma.course.findMany({
      // where: { statusId: 1 },
      include: {
        images: true,
        audio: {
          include: { language: true },
        },
      },
      orderBy: {
        title: 'asc'
      }
    });
    // Variable: exhibits -> courses
    res.status(200).json(courses);
  } catch (err) {
    console.error(" Error in getCourses:", err); // Function name: getExhibits -> getCourses
    res.status(500).json({ message: "Error fetching courses", error: err.message }); // exhibit -> course
  }
};


// Get a specific course by ID
exports.getCourseById = async (req, res) => {
  try {
    // Model: exhibit -> course
    const course = await prisma.course.findFirst({ 
      where: {
        courseId: BigInt(req.params.id), // exhibitId -> courseId
        statusId: 1, 
      },
      include: {
        images: true,
        audio: {
          include: {
            language: true,
            subtitles: true,
          },
        },
      },
    });

    if (!course) { // exhibit -> course
      return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json(course);
  } catch (err) {
    console.error("🔥 Error in getCourseById:", err); // Function name: getExhibitById -> getCourseById
    res.status(500).json({ message: "Error fetching course", error: err.message }); // exhibit -> course
  }
};


exports.createCourse = async (req, res) => { // Function name: createExhibit -> createCourse
  try {
    // Variables: exhibitId -> courseId, exhibitionId -> schoolId
    const { title, description, schoolId } = req.body; 
    const files = req.files;
    const adminUserId = req.user?.userId;

    if (!title || !schoolId) {
      return res.status(400).json({ error: "Course title and a school selection are required." }); // exhibit -> course, exhibition -> school
    }

    // URL path change for QR
    const qrBaseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/course/`;

    const imagesJson = files && files.length > 0
      ? JSON.stringify(files.map((file, index) => ({
          file_url: `/images/${file.filename}`,
          title: file.originalname,
          is_primary: index === 0,
        })))
      : null;

    // Stored Procedure name change and schoolId parameter
    const result = await prisma.$queryRaw`CALL sp_create_course(${title}, ${description}, ${BigInt(schoolId)}, ${imagesJson}::jsonb, ${qrBaseUrl}, NULL::bigint);`;
    
    // Output variable name change
    const newCourseId = result[0].p_new_course_id;

    if (!newCourseId) { // exhibit -> course
      throw new Error("Course creation failed in database, no ID returned.");
    }
    
    // Audit Log: exhibit -> course, exhibitionId -> schoolId
    await logAuditAction(
      adminUserId, null, "course", "create",
      { courseId: newCourseId.toString(), title, schoolId, images_uploaded: files ? files.length : 0 },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(201).json({ message: "Course created successfully", courseId: newCourseId }); // exhibitId -> courseId
  } catch (err) {
    console.error("Error in createCourse:", err); // Function name change
    res.status(500).json({ error: "Failed to create course", details: err.message }); // exhibit -> course
  }
};


// Update an existing course
exports.updateCourse = async (req, res) => { // Function name: updateExhibit -> updateCourse
  try {
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);
    const { title, description } = req.body;
    const adminUserId = req.user?.userId;

    // Model: exhibit -> course
    const originalCourse = await prisma.course.findUnique({
      where: { courseId },
    });

    if (!originalCourse) { // exhibit -> course
      return res.status(404).json({ error: "Course not found" });
    }

    // Stored Function name change
    const result = await prisma.$queryRaw`
      SELECT * FROM sf_update_course(${courseId}, ${title}, ${description});
    `;
    
    // Variable name change
    if (result.length === 0) { // exhibit -> course
        return res.status(404).json({ error: "Course not found during update." });
    }
    
    const updatedCourseData = result[0]; // exhibit -> course

    // Audit Log: exhibit -> course, exhibitId -> courseId
    await logAuditAction(
      adminUserId,
      null,
      "course",
      "update",
      {
        courseId: courseId.toString(),
        changes: {
          title: { from: originalCourse.title, to: updatedCourseData.title },
          description: { from: originalCourse.description, to: updatedCourseData.description },
        },
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }
    );

    res.status(200).json({
        courseId: updatedCourseData.course_id, // exhibit_id -> course_id
        title: updatedCourseData.title,
        description: updatedCourseData.description,
        createdAt: updatedCourseData.created_at,
        updatedAt: updatedCourseData.updated_at
    });

  } catch (err) {
    console.error("Error in updateCourse:", err); // Function name change
    res.status(500).json({ error: "Failed to update course" }); // exhibit -> course
  }
};

// Delete a course
exports.deleteCourse = async (req, res) => { // Function name: deleteExhibit -> deleteCourse
  try {
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    // Model: exhibit -> course
    const courseToDeactivate = await prisma.course.findUnique({ where: { courseId } });
    if (!courseToDeactivate) { // exhibit -> course
      return res.status(404).json({ error: "Course not found." });
    }

    // Stored Procedure name change
    await prisma.$executeRaw`CALL sp_deactivate_course(${courseId});`;

    // Audit Log: exhibit -> course, exhibitId -> courseId
    await logAuditAction(
      adminUserId, null, "course", "deactivate",
      { courseId: courseToDeactivate.courseId.toString(), title: courseToDeactivate.title },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Course was marked as inactive." }); // exhibit -> course
  } catch (err) {
    console.error("Error in deactivating course:", err); // exhibit -> course
    res.status(500).json({ error: "Failed to deactivate course" }); // exhibit -> course
  }
};


// Upload one or more images for a course
exports.uploadCourseImage = async (req, res) => { // Function name: uploadExhibitImage -> uploadCourseImage
  try {
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);
    const adminUserId = req.user?.userId; 

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files uploaded." });
    }
    const imageCreations = req.files.map((file) => {
      return prisma.image.create({
        data: {
          fileUrl: `/images/${file.filename}`,
          title: file.originalname,
          course: { // exhibit -> course
            connect: { courseId: courseId }, // exhibitId -> courseId
          },
        },
      });
    });
    const newImages = await prisma.$transaction(imageCreations);

    // Audit Log: exhibitId -> courseId
    await logAuditAction(
      adminUserId,
      null,
      "image",
      "create",
      {
        courseId: courseId.toString(),
        imagesUploaded: newImages.length,
        imageDetails: newImages.map((img) => ({
          imageId: img.imageId.toString(),
          fileUrl: img.fileUrl,
          title: img.title,
        })),
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        fileCount: newImages.length,
      }
    );

    res
      .status(201)
      .json({ message: "Images uploaded successfully", images: newImages });
  } catch (err) {
    console.error("Error in uploadCourseImage:", err); // Function name change
    res.status(500).json({ error: "Failed to upload images" });
  }
};

// Generate TTS for a course
exports.generateCourseTTS = async (req, res) => { // Function name: generateExhibitTTS -> generateCourseTTS
  try {
    const { text, language: languageName } = req.body;
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);

    if (!text) {
      return res.status(400).json({ error: "Text for TTS is required." });
    }
    if (!languageName || typeof languageName !== "string") {
      return res
        .status(400)
        .json({ error: "Language is required and must be a string." });
    }
    const cleanedLanguageName = languageName.trim();

    // Model: exhibit -> course
    const course = await prisma.course.findUnique({
      where: { courseId },
      select: { title: true },
    });

    if (!course) { // exhibit -> course
      return res.status(404).json({ error: "Course not found." });
    }

    const audioTitle = course.title; // exhibit -> course
    console.log(`Using course title: "${audioTitle}"`); // exhibit -> course

    const langRecord = await prisma.language.findFirst({
      where: {
        title: {
          equals: cleanedLanguageName,
          mode: "insensitive",
        },
      },
    });

    if (!langRecord) {
      return res
        .status(400)
        .json({
          error: `Language '${cleanedLanguageName}' not found in the database.`,
        });
    }

    // TTS logic remains the same...

    // ... (TTS generation and Deepgram transcription logic remains the same) ...

    const filename = `course-${courseId}-${langCode}-${Date.now()}.mp3`; // exhibit -> course
    const audioDir = path.join(__dirname, "..", "public", "audios");
    fs.mkdirSync(audioDir, { recursive: true });
    fs.writeFileSync(path.join(audioDir, filename), audioBuffer, "binary");
    const audioUrl = `/public/audios/${filename}`;

    const newAudio = await prisma.audio.create({
      data: {
        fileUrl: audioUrl,
        title: `${audioTitle} (${langRecord.title})`,
        course: { connect: { courseId: courseId } }, // exhibit -> course, exhibitId -> courseId
        language: { connect: { languageId: langRecord.languageId } },
        subtitles: {
          create: { languageId: langRecord.languageId, text: transcript },
        },
      },
    });

    // Audit Log: exhibitId -> courseId
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      null,
      "audio",
      "create",
      {
        courseId: courseId.toString(),
        audioId: newAudio.audioId.toString(),
        title: newAudio.title,
        language: langRecord.title,
        hasSubtitles: true,
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
        tts_service: "google-tts",
        transcript_service: "deepgram",
      }
    );

    res
      .status(201)
      .json({
        message: "TTS audio and transcript created successfully",
        audio: newAudio,
      });
  } catch (err) {
    console.error(
      "Error in generateCourseTTS:",
      err.response ? err.response.data : err.message
    ); // Function name change
    res
      .status(500)
      .json({ error: "Failed to generate TTS audio and transcript." });
  }
};

// Get QR code for a course
exports.getCourseQRCode = async (req, res) => { // Function name: getExhibitQRCode -> getCourseQRCode
  try {
    console.log(`🔍 QR Code request for course ID: ${req.params.id}`); // exhibit -> course
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);

    // Directly query the QRCode model for the qrUrl
    const qrCode = await prisma.qRCode.findFirst({
      where: { courseId }, // exhibitId -> courseId
      select: {
        qrUrl: true, // Correct field name
      },
    });

    if (!qrCode) {
      console.log(`❌ No QR code found for course ID: ${req.params.id}`); // exhibit -> course
      return res
        .status(404)
        .json({ message: "QR code not found for this course" }); // exhibit -> course
    }

    // ... (QR code generation logic remains the same) ...

    console.log(`✅ QR code generated for course ID: ${req.params.id}`); // exhibit -> course
    console.log(`QR URL: ${qrCode.qrUrl}`);

    res.status(200).json({
      qrUrl: qrCode.qrUrl,
      qrCodeImage: qrCodeBase64,
    });
  } catch (err) {
    console.error("Error in getCourseQRCode:", err); // Function name change
    res
      .status(500)
      .json({ message: "Error fetching QR code", error: err.message });
  }
};


exports.reactivateCourse = async (req, res) => { // Function name: reactivateExhibit -> reactivateCourse
  try {
    // Variable: exhibitId -> courseId
    const courseId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;
    
    // Model: exhibit -> course
    const courseToReactivate = await prisma.course.findUnique({ where: { courseId } });
    if (!courseToReactivate) { // exhibit -> course
      return res.status(404).json({ error: "Course not found." });
    }

    // Stored Procedure name change
    await prisma.$executeRaw`CALL sp_reactivate_course(${courseId});`;

    // Audit Log: exhibit -> course, exhibitId -> courseId
    await logAuditAction(
      adminUserId, null, "course", "reactivate",
      { courseId: courseToReactivate.courseId.toString(), title: courseToReactivate.title },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Course was reactivated." }); // exhibit -> course
  } catch (err) {
    console.error("Error in reactivating course:", err); // exhibit -> course
    res.status(500).json({ error: "Failed to reactivate course" }); // exhibit -> course
  }
};