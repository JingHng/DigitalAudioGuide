const { PrismaClient } = require('../../generated/prisma');
const { logAuditAction } = require('./auditLogsController');
const axios = require('axios');
const googleTTS = require('google-tts-api');
const path = require('path');
const fs = require('fs');

// Use singleton pattern for Prisma client
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

// Get all audio files with exhibit and language info
const getAllAudio = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      exhibitId, 
      languageId, 
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom = '',
      dateTo = '',
      hasPlayback = ''
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      AND: [
        exhibitId ? { exhibitId: BigInt(exhibitId) } : {},
        languageId ? { languageId: BigInt(languageId) } : {},
        search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { exhibit: { title: { contains: search, mode: 'insensitive' } } }
          ]
        } : {},
        dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {},
        dateTo ? { createdAt: { lte: new Date(dateTo) } } : {},
        hasPlayback === 'true' ? { playbackLogs: { some: {} } } : 
        hasPlayback === 'false' ? { playbackLogs: { none: {} } } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    };

    // Validate sortBy parameter
    const validSortFields = ['audioId', 'title', 'createdAt', 'updatedAt'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const audioFiles = await prisma.audio.findMany({
      skip,
      take,
      where,
      include: {
        exhibit: true,
        language: true,
        playbackLogs: {
          select: {
            audioLogsId: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        [safeSortBy]: sortOrder
      }
    });

    const totalAudio = await prisma.audio.count({ where });
    
    const transformedAudio = audioFiles.map(audio => ({
      audioId: audio.audioId,
      exhibitId: audio.exhibitId ? audio.exhibitId.toString() : null,
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      exhibit: audio.exhibit ? {
        exhibitId: audio.exhibit.exhibitId.toString(),
        title: audio.exhibit.title,
        description: audio.exhibit.description
      } : null,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null,
      playbackCount: audio.playbackLogs.length
    }));

    res.json({
      audio: transformedAudio,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAudio / take),
        totalItems: totalAudio,
        itemsPerPage: take
      }
    });
  } catch (err) {
    console.error('Get All Audio Error:', err);
    res.status(500).json({ error: 'Server error fetching audio files' });
  }
};

// Get a specific audio file by ID
const getAudioById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const audio = await prisma.audio.findUnique({
      where: { audioId: parseInt(id) },
      include: {
        exhibit: true,
        language: true,
        playbackLogs: {
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        subtitles: true
      }
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const transformedAudio = {
      audioId: audio.audioId,
      exhibitId: audio.exhibitId ? audio.exhibitId.toString() : null,
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      exhibit: audio.exhibit ? {
        exhibitId: audio.exhibit.exhibitId.toString(),
        title: audio.exhibit.title,
        description: audio.exhibit.description
      } : null,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null,
      playbackLogs: audio.playbackLogs.map(log => ({
        audioLogsId: log.audioLogsId,
        userId: log.userId ? log.userId.toString() : null,
        audioStart: log.audioStart,
        audioEnd: log.audioEnd,
        durationListened: log.durationListened,
        createdAt: log.createdAt,
        user: log.user ? {
          userId: log.user.userId.toString(),
          username: log.user.username,
          email: log.user.email
        } : null
      })),
      subtitles: audio.subtitles
    };

    res.json(transformedAudio);
  } catch (err) {
    console.error('Get Audio By ID Error:', err);
    res.status(500).json({ error: 'Server error fetching audio file' });
  }
};

// Create a new audio file
const createAudio = async (req, res) => {
  try {
    const { exhibitId, languageId, fileUrl, title, description } = req.body;
    const adminUserId = req.user?.userId;

    if (!exhibitId || !title) {
      return res.status(400).json({ 
        error: 'Exhibit ID and title are required' 
      });
    }

    const audio = await prisma.audio.create({
      data: {
        exhibitId: BigInt(exhibitId),
        languageId: languageId ? BigInt(languageId) : null,
        fileUrl: fileUrl || null,
        title,
        description: description || null
      },
      include: {
        exhibit: true,
        language: true
      }
    });

    // Log the audit action
    if (adminUserId) {
      await logAuditAction(
        adminUserId,
        null,
        'audio',
        'create',
        `Created audio file: ${title}`,
        { audioId: audio.audioId, exhibitId, title }
      );
    }

    const transformedAudio = {
      audioId: audio.audioId,
      exhibitId: audio.exhibitId.toString(),
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      exhibit: audio.exhibit ? {
        exhibitId: audio.exhibit.exhibitId.toString(),
        title: audio.exhibit.title,
        description: audio.exhibit.description
      } : null,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null
    };

    res.status(201).json({
      message: 'Audio file created successfully',
      audio: transformedAudio
    });
  } catch (err) {
    console.error('Create Audio Error:', err);
    res.status(500).json({ error: 'Server error creating audio file' });
  }
};

// Update an audio file
const updateAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const { exhibitId, languageId, fileUrl, title, description } = req.body;
    const adminUserId = req.user?.userId;

    const existingAudio = await prisma.audio.findUnique({
      where: { audioId: parseInt(id) }
    });

    if (!existingAudio) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const updateData = {};
    if (exhibitId !== undefined) updateData.exhibitId = BigInt(exhibitId);
    if (languageId !== undefined) updateData.languageId = languageId ? BigInt(languageId) : null;
    if (fileUrl !== undefined) updateData.fileUrl = fileUrl;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    const audio = await prisma.audio.update({
      where: { audioId: parseInt(id) },
      data: updateData,
      include: {
        exhibit: true,
        language: true
      }
    });

    // Log the audit action
    if (adminUserId) {
      await logAuditAction(
        adminUserId,
        null,
        'audio',
        'update',
        `Updated audio file: ${audio.title}`,
        { audioId: audio.audioId, changes: updateData }
      );
    }

    const transformedAudio = {
      audioId: audio.audioId,
      exhibitId: audio.exhibitId ? audio.exhibitId.toString() : null,
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      exhibit: audio.exhibit ? {
        exhibitId: audio.exhibit.exhibitId.toString(),
        title: audio.exhibit.title,
        description: audio.exhibit.description
      } : null,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null
    };

    res.json({
      message: 'Audio file updated successfully',
      audio: transformedAudio
    });
  } catch (err) {
    console.error('Update Audio Error:', err);
    res.status(500).json({ error: 'Server error updating audio file' });
  }
};

// Delete an audio file
const deleteAudio = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.userId;

    const audio = await prisma.audio.findUnique({
      where: { audioId: parseInt(id) },
      include: {
        exhibit: true
      }
    });

    if (!audio) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    await prisma.audio.delete({
      where: { audioId: parseInt(id) }
    });

    // Log the audit action
    if (adminUserId) {
      await logAuditAction(
        adminUserId,
        null,
        'audio',
        'delete',
        `Deleted audio file: ${audio.title}`,
        { audioId: audio.audioId, title: audio.title }
      );
    }

    res.json({
      message: 'Audio file deleted successfully',
      deletedAudio: {
        audioId: audio.audioId,
        title: audio.title
      }
    });
  } catch (err) {
    console.error('Delete Audio Error:', err);
    res.status(500).json({ error: 'Server error deleting audio file' });
  }
};

// Get audio files by exhibit ID
const getAudioByExhibit = async (req, res) => {
  try {
    const { exhibitId } = req.params;
    
    const audioFiles = await prisma.audio.findMany({
      where: { exhibitId: BigInt(exhibitId) },
      include: {
        language: true,
        playbackLogs: {
          select: {
            audioLogsId: true,
            createdAt: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const transformedAudio = audioFiles.map(audio => ({
      audioId: audio.audioId,
      exhibitId: audio.exhibitId.toString(),
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null,
      playbackCount: audio.playbackLogs.length
    }));

    res.json(transformedAudio);
  } catch (err) {
    console.error('Get Audio By Exhibit Error:', err);
    res.status(500).json({ error: 'Server error fetching audio files for exhibit' });
  }
};

// Upload audio file
const uploadAudioFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const { exhibitId, languageId, title, description } = req.body;
    const adminUserId = req.user?.userId;

    if (!exhibitId || !title) {
      return res.status(400).json({ 
        error: 'Exhibit ID and title are required' 
      });
    }

    // The file path relative to public directory
    const fileUrl = `/audios/${req.file.filename}`;

    const audio = await prisma.audio.create({
      data: {
        exhibitId: BigInt(exhibitId),
        languageId: languageId ? BigInt(languageId) : null,
        fileUrl,
        title,
        description: description || null
      },
      include: {
        exhibit: true,
        language: true
      }
    });

    // Log the audit action
    if (adminUserId) {
      await logAuditAction(
        adminUserId,
        null,
        'audio',
        'create',
        `Uploaded audio file: ${title}`,
        { audioId: audio.audioId, exhibitId, title, filename: req.file.filename }
      );
    }

    const transformedAudio = {
      audioId: audio.audioId,
      exhibitId: audio.exhibitId.toString(),
      languageId: audio.languageId ? audio.languageId.toString() : null,
      fileUrl: audio.fileUrl,
      title: audio.title,
      description: audio.description,
      createdAt: audio.createdAt,
      updatedAt: audio.updatedAt,
      exhibit: audio.exhibit ? {
        exhibitId: audio.exhibit.exhibitId.toString(),
        title: audio.exhibit.title,
        description: audio.exhibit.description
      } : null,
      language: audio.language ? {
        languageId: audio.language.languageId.toString(),
        title: audio.language.title,
        code: audio.language.code
      } : null
    };

    res.status(201).json({
      message: 'Audio file uploaded successfully',
      audio: transformedAudio
    });
  } catch (err) {
    console.error('Upload Audio Error:', err);
    res.status(500).json({ error: 'Server error uploading audio file' });
  }
};

// Generate TTS for audio
const generateAudioTTS = async (req, res) => {
  try {
    const { text, language: languageName } = req.body;
    const audioId = parseInt(req.params.id);
    const adminUserId = req.user?.userId;

    if (!text) {
      return res.status(400).json({ error: "Text for TTS is required." });
    }
    if (!languageName || typeof languageName !== "string") {
      return res
        .status(400)
        .json({ error: "Language is required and must be a string." });
    }

    const cleanedLanguageName = languageName.trim();
    
    // Get audio record
    const audio = await prisma.audio.findUnique({
      where: { audioId },
      select: { title: true, exhibitId: true },
    });
    
    if (!audio) {
      return res.status(404).json({ error: "Audio not found." });
    }

    const audioTitle = audio.title;
    console.log(`Using audio title: "${audioTitle}"`);

    const langRecord = await prisma.language.findFirst({
      where: {
        title: {
          equals: cleanedLanguageName,
          mode: 'insensitive',
        },
      },
    });

    if (!langRecord) {
      return res.status(400).json({
        error: `Language "${cleanedLanguageName}" not found in database.`,
      });
    }

    console.log(`Found language: ${langRecord.title} (${langRecord.code})`);

    // Map language titles to proper codes for TTS (same as exhibit TTS)
    const languageCodeMap = {
      English: "en",
      Spanish: "es", 
      French: "fr",
      German: "de",
      Japanese: "ja",
      "Chinese (Simplified)": "zh"
    };

    const langCode = languageCodeMap[cleanedLanguageName] || langRecord.code.toLowerCase();
    console.log(`Using language code: ${langCode}`);

    // Generate TTS using Google TTS API (same as exhibit TTS)
    console.log("Generating TTS audio...");
    let audioBuffer;

    if (text.length > 200) {
      // For longer text, split into chunks
      const textChunks = text.match(/.{1,200}(?:\s|$)/g) || [text];
      const audioChunks = [];
      
      console.log(`Processing ${textChunks.length} chunks for long text`);
      
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i].trim();
        if (!chunk) continue;
        
        console.log(`Processing chunk ${i + 1}/${textChunks.length} (${chunk.length} chars)`);
        
        const ttsUrl = googleTTS.getAudioUrl(chunk, {
          lang: langCode,
          slow: false,
        });
        
        const response = await fetch(ttsUrl);
        if (!response.ok) {
          throw new Error(`TTS chunk ${i + 1} failed: ${response.statusText}`);
        }
        
        const audioChunk = Buffer.from(await response.arrayBuffer());
        audioChunks.push(audioChunk);
      }
      
      audioBuffer = Buffer.concat(audioChunks);
      console.log(`Combined ${audioChunks.length} chunks into single audio file`);
    } else {
      // For shorter text, use single request
      console.log("Using single TTS request for short text");
      
      const ttsUrl = googleTTS.getAudioUrl(text, {
        lang: langCode,
        slow: false,
      });
      
      const response = await fetch(ttsUrl);
      if (!response.ok) {
        throw new Error(`Google TTS failed: ${response.statusText}`);
      }
      
      audioBuffer = Buffer.from(await response.arrayBuffer());
    }

    // Save audio file to server
    const filename = `audio-${audioId}-${langCode}-${Date.now()}.mp3`;
    const audioDir = path.join(__dirname, "..", "public", "audios");
    fs.mkdirSync(audioDir, { recursive: true });
    fs.writeFileSync(path.join(audioDir, filename), audioBuffer, "binary");
    
    const audioUrl = `/audios/${filename}`;
    console.log(`Audio file saved: ${audioUrl}`);

    // Update audio record with the generated file URL and set language
    const updatedAudio = await prisma.audio.update({
      where: { audioId },
      data: { 
        fileUrl: audioUrl,
        languageId: langRecord.languageId
      },
      include: {
        exhibit: true,
        language: true
      }
    });

    // Create subtitle with proper word-by-word structure for frontend
    // Split text into words with timing estimates (0.5 seconds per word)
    let words;
    
    if (langCode === 'ja') {
      // For Japanese, split by characters since there are no spaces
      // Group into smaller chunks for better timing
      const chars = text.trim().split('');
      words = [];
      for (let i = 0; i < chars.length; i += 3) {
        words.push(chars.slice(i, i + 3).join(''));
      }
    } else if (langCode === 'zh') {
      // For Chinese, similar to Japanese
      const chars = text.trim().split('');
      words = [];
      for (let i = 0; i < chars.length; i += 2) {
        words.push(chars.slice(i, i + 2).join(''));
      }
    } else {
      // For space-separated languages (English, Spanish, French, German, etc.)
      words = text.trim().split(/\s+/);
    }
    
    const wordsWithTiming = words.map((word, index) => ({
      word: word,
      start: index * 0.5,
      end: (index + 1) * 0.5
    }));
    
    await prisma.subtitle.create({
      data: {
        audioId,
        languageId: langRecord.languageId,
        text: wordsWithTiming, // Store as JSON object, not string
      },
    });
    console.log("Subtitle created successfully");

    // Log the audit action
    if (adminUserId) {
      await logAuditAction(
        adminUserId,
        null,
        'audio',
        'generate_tts',
        `Generated TTS for audio: ${audioTitle}`,
        { audioId, language: cleanedLanguageName, textLength: text.length }
      );
    }

    const transformedAudio = {
      audioId: updatedAudio.audioId,
      exhibitId: updatedAudio.exhibitId ? updatedAudio.exhibitId.toString() : null,
      languageId: updatedAudio.languageId ? updatedAudio.languageId.toString() : null,
      fileUrl: updatedAudio.fileUrl,
      title: updatedAudio.title,
      description: updatedAudio.description,
      createdAt: updatedAudio.createdAt,
      updatedAt: updatedAudio.updatedAt,
      exhibit: updatedAudio.exhibit ? {
        exhibitId: updatedAudio.exhibit.exhibitId.toString(),
        title: updatedAudio.exhibit.title,
        description: updatedAudio.exhibit.description
      } : null,
      language: updatedAudio.language ? {
        languageId: updatedAudio.language.languageId.toString(),
        title: updatedAudio.language.title,
        code: updatedAudio.language.code
      } : null
    };

    res.json({
      message: "TTS audio generated successfully",
      audio: transformedAudio,
      audio_url: audioUrl,
    });
  } catch (err) {
    console.error("Error in generateAudioTTS:", err.response ? err.response.data : err.message);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate TTS audio.";
    if (err.message.includes("Google TTS failed")) {
      errorMessage = "Google TTS service failed. Please try again.";
    } else if (err.message.includes("Language") && err.message.includes("not found")) {
      errorMessage = err.message;
    } else if (err.message.includes("Audio not found")) {
      errorMessage = "Audio record not found.";
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

module.exports = {
  getAllAudio,
  getAudioById,
  createAudio,
  updateAudio,
  deleteAudio,
  getAudioByExhibit,
  uploadAudioFile,
  generateAudioTTS
};