const { PrismaClient } = require("../../generated/prisma"); 
const googleTTS = require("google-tts-api");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const qr = require("qr-image");
const { logUserAction, logAuditAction } = require("./auditLogsController");
const { clearExhibitionsCache } = require("./exhibitionController");

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
      where: { statusId: 1 },
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
    const { title, description, additionalDescription, exhibitionId, ttsText, language } = req.body;
    const files = req.files;
    const primaryImage = files?.primaryImage ? files.primaryImage[0] : null;
    const adminUserId = req.user?.userId;

    if (!title || !exhibitionId) {
      return res.status(400).json({ error: "Title and Exhibition ID are required." });
    }

    // Retry logic to handle race conditions with parallel test runs
    let retries = 3;
    let newExhibit;
    
    while (retries > 0) {
      try {
        // Use a transaction to prevent race conditions with sequence calculation
        newExhibit = await prisma.$transaction(async (tx) => {
          // 1. Calculate the next sequence number within transaction
          const lastExhibit = await tx.exhibit.findFirst({
            where: { 
              exhibitionId: BigInt(exhibitionId)
            },
            orderBy: { sequence: 'desc' },
            select: { sequence: true }
          });
          const nextSequence = lastExhibit ? (lastExhibit.sequence + 1) : 1;

          // 2. Create the Exhibit within the same transaction
          return await tx.exhibit.create({
            data: {
              title,
              description: description || '',
              additionalDescription: additionalDescription || '',
              exhibitionId: BigInt(exhibitionId),
              sequence: nextSequence,
              statusId: 1, // Active
              // Create the primary image record if a file exists
              images: primaryImage ? {
                create: {
                  fileUrl: `/images/${primaryImage.filename}`,
                  title: primaryImage.originalname,
                  isPrimary: true
                }
              } : undefined,
              // Generate the initial QR Code record
              qrCodes: {
                create: {
                  qrUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exhibit/temp-id`, 
                }
              }
            }
          });
        });
        break; // Success, exit retry loop
      } catch (err) {
        if (err.code === 'P2002' && retries > 1) {
          // Unique constraint violation, retry after a small delay
          retries--;
          await new Promise(resolve => setTimeout(resolve, 50 * (4 - retries))); // Exponential backoff
          continue;
        }
        throw err; // Re-throw if not a unique constraint error or no retries left
      }
    }

    // 3. Update the QR Code URL with the actual ID
    const finalQrUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/exhibit/${newExhibit.exhibitId}`;
    await prisma.qRCode.updateMany({
      where: { exhibitId: newExhibit.exhibitId },
      data: { qrUrl: finalQrUrl }
    });

    // 4. Handle TTS if provided 
    if (ttsText && language) {
      await internalAudioProcessor(newExhibit.exhibitId, ttsText, language, adminUserId, req);
    }

    // 5. Audit Log
    await logAuditAction(adminUserId, null, "exhibit", "create", 
      { exhibitId: newExhibit.exhibitId.toString(), title }, 
      { ip_address: req.ip }
    );

    // 6. Clear exhibitions cache
    clearExhibitionsCache();

    res.status(201).json({ 
      message: "Exhibit created successfully", 
      exhibitId: newExhibit.exhibitId.toString(),
      sequence: newExhibit.sequence 
    });

  } catch (err) {
    console.error("Error in createExhibit:", err);
    res.status(500).json({ error: "Failed to create exhibit", details: err.message });
  }
};

// Update an existing exhibit
exports.updateExhibit = async (req, res) => {
  try {
    const exhibitId = BigInt(req.params.id);
    const { title, description, additionalDescription } = req.body;
    const adminUserId = req.user?.userId;

    // STEP 1: Fetch the original record for the audit log. 
    const originalExhibit = await prisma.exhibit.findUnique({
      where: { exhibitId },
    });

    if (!originalExhibit) {
      return res.status(404).json({ error: "Exhibit not found" });
    }

    // STEP 2: Update the exhibit using Prisma directly since we're adding additionalDescription
    const updatedExhibit = await prisma.exhibit.update({
      where: { exhibitId },
      data: { 
        title,
        description,
        additionalDescription: additionalDescription || null,
        updatedAt: new Date()
      }
    });

    // STEP 3: Create the audit log.
    await logAuditAction(
      adminUserId,
      null,
      "exhibit",
      "update",
      {
        exhibitId: exhibitId.toString(),
        changes: {
          title: { from: originalExhibit.title, to: updatedExhibit.title },
          description: { from: originalExhibit.description, to: updatedExhibit.description },
          additionalDescription: { from: originalExhibit.additionalDescription, to: updatedExhibit.additionalDescription },
        },
      },
      {
        ip_address: req.ip,
        user_agent: req.get("User-Agent"),
      }
    );

    // Clear exhibitions cache
    clearExhibitionsCache();

    res.status(200).json({
        exhibitId: updatedExhibit.exhibitId,
        title: updatedExhibit.title,
        description: updatedExhibit.description,
        additionalDescription: updatedExhibit.additionalDescription,
        createdAt: updatedExhibit.createdAt,
        updatedAt: updatedExhibit.updatedAt
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

    // Clear exhibitions cache
    clearExhibitionsCache();

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
    const adminUserId = req.user?.userId;
    const { isPrimary } = req.body; // Get isPrimary flag from request body

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No image files uploaded." });
    }

    // Check if this exhibit exists
    const exhibit = await prisma.exhibit.findUnique({
      where: { exhibitId },
      include: { images: true }
    });

    if (!exhibit) {
      return res.status(404).json({ error: "Exhibit not found." });
    }

    const isPrimaryUpload = isPrimary === 'true' || isPrimary === true;
    
    // If uploading primary image, check if one already exists
    if (isPrimaryUpload) {
      const existingPrimaryImage = exhibit.images.find(img => img.isPrimary);
      if (existingPrimaryImage) {
        // Remove the existing primary image
        await prisma.image.delete({
          where: { imageId: existingPrimaryImage.imageId }
        });
      }
      
      // Only allow one primary image at a time
      if (req.files.length > 1) {
        return res.status(400).json({ error: "Only one primary image can be uploaded at a time." });
      }
    } else {
      // For additional images, check the 4-image limit
      const existingAdditionalImages = exhibit.images.filter(img => !img.isPrimary);
      if (existingAdditionalImages.length + req.files.length > 4) {
        return res.status(400).json({ 
          error: `Cannot upload ${req.files.length} additional images. Maximum of 4 additional images allowed. You currently have ${existingAdditionalImages.length} additional images.`
        });
      }
    }

    const imageCreations = req.files.map((file) => {
      return prisma.image.create({
        data: {
          fileUrl: `/images/${file.filename}`,
          title: file.originalname,
          isPrimary: isPrimaryUpload,
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
        imageType: isPrimaryUpload ? "primary" : "additional",
        imageDetails: newImages.map((img) => ({
          imageId: img.imageId.toString(),
          fileUrl: img.fileUrl,
          title: img.title,
          isPrimary: img.isPrimary,
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

        try {
          // Add retry logic for better reliability
          let retryCount = 0;
          const maxRetries = 3;
          let success = false;
          let audioChunk;
          
          while (retryCount < maxRetries && !success) {
            try {
              // Add delay between retries to avoid rate limiting
              if (retryCount > 0) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
                console.log(`Waiting ${delay}ms before retry ${retryCount} for chunk ${i + 1}`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
              
              const ttsUrl = googleTTS.getAudioUrl(chunk, {
                lang: langCode,
                slow: false,
                host: 'https://translate.google.com',
              });
              
              const response = await fetch(ttsUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'audio/mpeg, audio/*',
                  'Accept-Language': 'en-US,en;q=0.9',
                  'Referer': 'https://translate.google.com/',
                  'Accept-Encoding': 'gzip, deflate, br'
                },
                timeout: 15000
              });
              
              if (!response.ok) {
                throw new Error(`TTS chunk ${i + 1} failed: ${response.status} ${response.statusText}`);
              }
              
              audioChunk = Buffer.from(await response.arrayBuffer());
              success = true;
              
            } catch (retryError) {
              retryCount++;
              console.error(`Chunk ${i + 1}, attempt ${retryCount} failed:`, retryError.message);
              
              if (retryCount >= maxRetries) {
                throw retryError; // Re-throw to be caught by outer catch
              }
            }
          }
          
          audioChunks.push(audioChunk);
        } catch (chunkError) {
          console.error(`Error processing chunk ${i + 1}:`, chunkError.message);
          
          // Create a silent audio chunk as fallback
          const silentChunk = Buffer.alloc(1024); // 1KB of silence
          audioChunks.push(silentChunk);
          
          console.log(`Added silent chunk for chunk ${i + 1} due to TTS error`);
        }
      }

      audioBuffer = Buffer.concat(audioChunks);
      console.log(
        `Combined ${audioChunks.length} chunks into single audio file`
      );
    } else {
      console.log("Using single TTS request for short text");
      try {
        // Add retry logic for single text requests too
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            if (retryCount > 0) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
              console.log(`Waiting ${delay}ms before retry ${retryCount} for single text TTS`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const ttsUrl = googleTTS.getAudioUrl(text, {
              lang: langCode,
              slow: false,
              host: 'https://translate.google.com',
            });
            
            const response = await fetch(ttsUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'audio/mpeg, audio/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://translate.google.com/',
                'Accept-Encoding': 'gzip, deflate, br'
              },
              timeout: 15000
            });
            
            if (!response.ok) {
              throw new Error(`Google TTS failed: ${response.status} ${response.statusText}`);
            }
            
            audioBuffer = Buffer.from(await response.arrayBuffer());
            success = true;
            
          } catch (retryError) {
            retryCount++;
            console.error(`Single TTS attempt ${retryCount} failed:`, retryError.message);
            
            if (retryCount >= maxRetries) {
              throw retryError;
            }
          }
        }
      } catch (ttsError) {
        console.error('TTS Error:', ttsError.message);
        
        // Create a minimal audio file as fallback
        audioBuffer = Buffer.alloc(2048); // 2KB of silence
        console.log('Using silent audio as fallback due to TTS error');
      }
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
    const audioUrl = `/audios/${filename}`;

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
      err.response ? err.response.data : err.message || err
    );
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate TTS audio and transcript.";
    
    if (err.message && err.message.includes('Invalid credentials')) {
      errorMessage = "TTS service authentication failed. Please try again later or contact support.";
    } else if (err.message && err.message.includes('TTS')) {
      errorMessage = "Text-to-speech service temporarily unavailable. Please try again later.";
    } else if (err.response && err.response.data && err.response.data.err_code === 'INVALID_AUTH') {
      errorMessage = "TTS service authentication error. The service may be temporarily unavailable.";
    }
    
    res.status(500).json({ error: errorMessage, details: err.message });
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

    // Generate the QR code image from the qrUrl using qr-image with high quality settings
    const qrCodeImage = qr.imageSync(qrCode.qrUrl, { 
      type: "png",
      size: 10,        // Larger size for better quality
      margin: 2,       // Adequate margin
      ec_level: 'H'    // High error correction for better scanning reliability
    });
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