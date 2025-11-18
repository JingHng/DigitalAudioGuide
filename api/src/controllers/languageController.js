const { PrismaClient } = require('../../generated/prisma');

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

// Get all languages
const getAllLanguages = async (req, res) => {
  try {
    const languages = await prisma.language.findMany({
      include: {
        status: true
      },
      orderBy: {
        title: 'asc'
      }
    });

    const transformedLanguages = languages.map(language => ({
      languageId: language.languageId.toString(),
      title: language.title,
      code: language.code,
      isDefault: language.isDefault,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
      status: language.status ? {
        statusId: language.status.statusId,
        statusName: language.status.statusName
      } : null
    }));

    res.json(transformedLanguages);
  } catch (err) {
    console.error('Get All Languages Error:', err);
    res.status(500).json({ error: 'Server error fetching languages' });
  }
};

// Get a specific language by ID
const getLanguageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const language = await prisma.language.findUnique({
      where: { languageId: BigInt(id) },
      include: {
        status: true,
        audio: {
          include: {
            exhibit: true
          }
        }
      }
    });

    if (!language) {
      return res.status(404).json({ error: 'Language not found' });
    }

    const transformedLanguage = {
      languageId: language.languageId.toString(),
      title: language.title,
      code: language.code,
      isDefault: language.isDefault,
      createdAt: language.createdAt,
      updatedAt: language.updatedAt,
      status: language.status ? {
        statusId: language.status.statusId,
        statusName: language.status.statusName
      } : null,
      audioCount: language.audio.length,
      audio: language.audio.map(audio => ({
        audioId: audio.audioId,
        title: audio.title,
        exhibit: audio.exhibit ? {
          exhibitId: audio.exhibit.exhibitId.toString(),
          title: audio.exhibit.title
        } : null
      }))
    };

    res.json(transformedLanguage);
  } catch (err) {
    console.error('Get Language By ID Error:', err);
    res.status(500).json({ error: 'Server error fetching language' });
  }
};

module.exports = {
  getAllLanguages,
  getLanguageById
};