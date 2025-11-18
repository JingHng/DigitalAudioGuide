const { PrismaClient } = require("../../generated/prisma"); 
const googleTTS = require("google-tts-api");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const qr = require("qr-image");
// const { logUserAction, logAuditAction } = require("./auditLogsController");

let prisma;

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// Get all exhibits
exports.getExhibits = async (req, res) => {
  try {
    const exhibits = await prisma.exhibit.findMany({
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
    res.status(200).json(exhibits);
  } catch (err) {
    console.error(" Error in getExhibits:", err);
    res.status(500).json({ message: "Error fetching exhibits", error: err.message });
  }
};


// Get a specific exhibit by ID
exports.getExhibitById = async (req, res) => {
  try {
    const exhibit = await prisma.exhibit.findFirst({ // Use findFirst to add a where clause
      where: {
        exhibitId: BigInt(req.params.id),
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

    if (!exhibit) {
      return res.status(404).json({ message: "Exhibit not found" });
    }
    res.status(200).json(exhibit);
  } catch (err) {
    console.error("🔥 Error in getExhibitById:", err);
    res.status(500).json({ message: "Error fetching exhibit", error: err.message });
  }
};


exports.createExhibit = async (req, res) => {
  try {
    const { title, description, exhibitionId } = req.body;
    const files = req.files;
    const adminUserId = req.user?.userId;

    if (!title || !exhibitionId) {
      return res.status(400).json({ error: "Exhibit title and an exhibition selection are required." });
    }

    const qrBaseUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exhibit/`;

    const imagesJson = files && files.length > 0
      ? JSON.stringify(files.map((file, index) => ({
          file_url: `/images/${file.filename}`,
          title: file.originalname,
          is_primary: index === 0,
        })))
      : null;

    // Use $queryRaw to call the procedure and get the INOUT parameter back
    const result = await prisma.$queryRaw`CALL sp_create_exhibit(${title}, ${description}, ${BigInt(exhibitionId)}, ${imagesJson}::jsonb, ${qrBaseUrl}, NULL::bigint);`;
    
    // The INOUT parameter is returned in the result set
    const newExhibitId = result[0].p_new_exhibit_id;

    if (!newExhibitId) {
      throw new Error("Exhibit creation failed in database, no ID returned.");
    }
    
    await logAuditAction(
      adminUserId, null, "exhibit", "create",
      { exhibitId: newExhibitId.toString(), title, exhibitionId, images_uploaded: files ? files.length : 0 },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(201).json({ message: "Exhibit created successfully", exhibitId: newExhibitId });
  } catch (err) {
    console.error("Error in createExhibit:", err);
    res.status(500).json({ error: "Failed to create exhibit", details: err.message });
  }
};


// Update an existing exhibit
exports.updateExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const { title, description } = req.body;
    const adminUserId = req.user?.userId;

    // STEP 1: Fetch the original record for the audit log. 
    const originalExhibit = await prisma.exhibit.findUnique({
      where: { exhibitId },
    });

    if (!originalExhibit) {
      return res.status(404).json({ error: "Exhibit not found" });
    }

    // STEP 2: Call the stored function to perform the update.
    const result = await prisma.$queryRaw`
      SELECT * FROM sf_update_exhibit(${exhibitId}, ${title}, ${description});
    `;
    
    // If the function returned no rows, something went wrong (e.g., exhibit was deleted
    // between the find and update calls).
    if (result.length === 0) {
        return res.status(404).json({ error: "Exhibit not found during update." });
    }
    
    const updatedExhibitData = result[0];

    // STEP 3: Create the audit log.
    await logAuditAction(
      adminUserId,
      null,
      "exhibit",
      "update",
      {
        exhibitId: exhibitId.toString(),
        changes: {
          title: { from: originalExhibit.title, to: updatedExhibitData.title },
          description: { from: originalExhibit.description, to: updatedExhibitData.description },
        },
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }
    );

    res.status(200).json({
        exhibitId: updatedExhibitData.exhibit_id,
        title: updatedExhibitData.title,
        description: updatedExhibitData.description,
        createdAt: updatedExhibitData.created_at,
        updatedAt: updatedExhibitData.updated_at
    });

  } catch (err) {
    console.error("Error in updateExhibit:", err);
    res.status(500).json({ error: "Failed to update exhibit" });
  }
};

// Delete an exhibit
exports.deleteExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;

    // Fetch details for logging BEFORE deactivating
    const exhibitToDeactivate = await prisma.exhibit.findUnique({ where: { exhibitId } });
    if (!exhibitToDeactivate) {
      return res.status(404).json({ error: "Exhibit not found." });
    }

    // Use $executeRaw for procedures that don't return data
    await prisma.$executeRaw`CALL sp_deactivate_exhibit(${exhibitId});`;

    await logAuditAction(
      adminUserId, null, "exhibit", "deactivate",
      { exhibitId: exhibitToDeactivate.exhibitId.toString(), title: exhibitToDeactivate.title },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Exhibit was marked as inactive." });
  } catch (err) {
    console.error("Error in deactivating exhibit:", err);
    res.status(500).json({ error: "Failed to deactivate exhibit" });
  }
};



// Upload one or more images for an exhibit
exports.uploadExhibitImage = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const adminUserId = req.user?.userId; // Assuming user info is in req.user

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files uploaded." });
    }
    const imageCreations = req.files.map((file) => {
      return prisma.image.create({
        data: {
          fileUrl: `/images/${file.filename}`,
          title: file.originalname,
          exhibit: {
            connect: { exhibitId: exhibitId },
          },
        },
      });
    });
    const newImages = await prisma.$transaction(imageCreations);

    // Log the audit action for image upload
    await logAuditAction(
      adminUserId,
      null,
      "image",
      "create",
      {
        exhibitId: exhibitId.toString(),
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
    console.error("Error in uploadExhibitImage:", err);
    res.status(500).json({ error: "Failed to upload images" });
  }
};

// Generate TTS for an exhibit
exports.generateExhibitTTS = async (req, res) => {
  try {
    const { text, language: languageName } = req.body;
    const exhibitId = BigInt(req.params.id);

    if (!text) {
      return res.status(400).json({ error: "Text for TTS is required." });
    }
    if (!languageName || typeof languageName !== "string") {
      return res
        .status(400)
        .json({ error: "Language is required and must be a string." });
    }
    const cleanedLanguageName = languageName.trim();

    // Get exhibit title for audio naming
    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId },
      select: { title: true },
    });

    if (!exhibit) {
      return res.status(404).json({ error: "Exhibit not found." });
    }

    const audioTitle = exhibit.title;
    console.log(`Using exhibit title: "${audioTitle}"`);

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

    // Map language titles to proper codes for TTS and transcription
    const languageCodeMap = {
      English: "en",
      Spanish: "es",
      French: "fr",
      German: "de",
      Italian: "it",
      Portuguese: "pt",
      "Chinese (Simplified)": "zh",
      Japanese: "ja",
      Korean: "ko",
      Arabic: "ar",
    };

    const langCode = languageCodeMap[langRecord.title] || "en";
    console.log(`Using language code: ${langCode} for ${langRecord.title}`);

    // Manual chunking for long text to avoid getAllAudioUrls issues
    console.log(`Generating TTS for ${text.length} characters`);

    function chunkText(text, maxLength = 180) {
      const chunks = [];
      let start = 0;

      while (start < text.length) {
        let end = start + maxLength;

        // If we're not at the end, try to break at a sentence or word boundary
        if (end < text.length) {
          // Look for sentence ending
          const sentenceEnd = text.lastIndexOf(".", end);
          if (sentenceEnd > start) {
            end = sentenceEnd + 1;
          } else {
            // Look for word boundary
            const spaceIndex = text.lastIndexOf(" ", end);
            if (spaceIndex > start) {
              end = spaceIndex;
            }
          }
        }

        chunks.push(text.slice(start, end).trim());
        start = end;
      }

      return chunks.filter((chunk) => chunk.length > 0);
    }

    let audioBuffer;
    if (text.length > 180) {
      console.log("Chunking long text manually");
      const textChunks = chunkText(text);
      console.log(`Split into ${textChunks.length} chunks`);

      const audioChunks = [];
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        console.log(
          `Processing chunk ${i + 1}/${textChunks.length} (${
            chunk.length
          } chars)`
        );

        const ttsUrl = googleTTS.getAudioUrl(chunk, {
          lang: langCode,
          slow: false,
        });
        const response = await fetch(ttsUrl);
        if (!response.ok)
          throw new Error(`TTS chunk ${i + 1} failed: ${response.statusText}`);
        const audioChunk = Buffer.from(await response.arrayBuffer());
        audioChunks.push(audioChunk);
      }

      audioBuffer = Buffer.concat(audioChunks);
      console.log(
        `Combined ${audioChunks.length} chunks into single audio file`
      );
    } else {
      console.log("Using single TTS request for short text");
      const ttsUrl = googleTTS.getAudioUrl(text, {
        lang: langCode,
        slow: false,
      });
      const response = await fetch(ttsUrl);
      if (!response.ok)
        throw new Error(`Google TTS failed: ${response.statusText}`);
      audioBuffer = Buffer.from(await response.arrayBuffer());
    }

    const deepgramUrl = `https://api.deepgram.com/v1/listen?model=nova-2&language=${langCode}&punctuate=true&utterances=true&words=true`;
    const dgResponse = await axios.post(deepgramUrl, audioBuffer, {
      headers: {
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/mp3",
      },
    });
    const words = dgResponse.data.results.channels[0].alternatives[0].words;
    const transcript = words.map((wordData) => ({
      word: wordData.punctuated_word,
      start: wordData.start,
      end: wordData.end,
    }));

    const filename = `exhibit-${exhibitId}-${langCode}-${Date.now()}.mp3`;
    const audioDir = path.join(__dirname, "..", "public", "audios");
    fs.mkdirSync(audioDir, { recursive: true });
    fs.writeFileSync(path.join(audioDir, filename), audioBuffer, "binary");
    const audioUrl = `/public/audios/${filename}`;

    const newAudio = await prisma.audio.create({
      data: {
        fileUrl: audioUrl,
        title: `${audioTitle} (${langRecord.title})`,
        exhibit: { connect: { exhibitId: exhibitId } },
        language: { connect: { languageId: langRecord.languageId } },
        subtitles: {
          create: { languageId: langRecord.languageId, text: transcript },
        },
      },
    });

    // Log the audit action for TTS generation
    const adminUserId = req.user?.userId;
    await logAuditAction(
      adminUserId,
      null,
      "audio",
      "create",
      {
        exhibitId: exhibitId.toString(),
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
      "Error in generateExhibitTTS:",
      err.response ? err.response.data : err.message
    );
    res
      .status(500)
      .json({ error: "Failed to generate TTS audio and transcript." });
  }
};

// Get QR code for an exhibit
exports.getExhibitQRCode = async (req, res) => {
  try {
    console.log(`🔍 QR Code request for exhibit ID: ${req.params.id}`);
    const exhibitId = BigInt(req.params.id);

    // Directly query the QRCode model for the qrUrl
    const qrCode = await prisma.qRCode.findFirst({
      where: { exhibitId },
      select: {
        qrUrl: true, // Correct field name
      },
    });

    if (!qrCode) {
      console.log(`❌ No QR code found for exhibit ID: ${req.params.id}`);
      return res
        .status(404)
        .json({ message: "QR code not found for this exhibit" });
    }

    // Generate the QR code image from the qrUrl using qr-image
    const qrCodeImage = qr.imageSync(qrCode.qrUrl, { type: "png" });
    const qrCodeBase64 = `data:image/png;base64,${qrCodeImage.toString(
      "base64"
    )}`;

    console.log(`✅ QR code generated for exhibit ID: ${req.params.id}`);
    console.log(`QR URL: ${qrCode.qrUrl}`);

    res.status(200).json({
      qrUrl: qrCode.qrUrl,
      qrCodeImage: qrCodeBase64,
    });
  } catch (err) {
    console.error("Error in getExhibitQRCode:", err);
    res
      .status(500)
      .json({ message: "Error fetching QR code", error: err.message });
  }
};


exports.reactivateExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const adminUserId = req.user?.userId;
    
    const exhibitToReactivate = await prisma.exhibit.findUnique({ where: { exhibitId } });
    if (!exhibitToReactivate) {
      return res.status(404).json({ error: "Exhibit not found." });
    }

    // Use $executeRaw for procedures that don't return data
    await prisma.$executeRaw`CALL sp_reactivate_exhibit(${exhibitId});`;

    await logAuditAction(
      adminUserId, null, "exhibit", "reactivate",
      { exhibitId: exhibitToReactivate.exhibitId.toString(), title: exhibitToReactivate.title },
      { ip_address: req.ip, user_agent: req.get("User-Agent") }
    );

    res.status(200).json({ message: "Exhibit was reactivated." });
  } catch (err) {
    console.error("Error in reactivating exhibit:", err);
    res.status(500).json({ error: "Failed to reactivate exhibit" });
  }
};