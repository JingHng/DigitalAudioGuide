/**
 * Settings Controller
 * 
 * Handles application-wide settings, including system settings like inactivity threshold.
 */

const prisma = require('../db/prisma');
const logger = require('../utils/logger');
const { logAuditAction } = require('./auditLogsController');
const crypto = require('crypto');

// Encryption key from environment - in production, use a proper secret management solution
const ENCRYPTION_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-key-change-in-production-must-be-32-chars!!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Encrypt a string value
 */
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string value
 */
function decrypt(text) {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Create a table for settings if it doesn't exist
async function ensureSettingsTable() {
  try {
    // Check if the settings table exists by querying it
    await prisma.$queryRaw`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    logger.info('Settings table checked/created successfully');
  } catch (error) {
    logger.error(`Error ensuring settings table exists: ${error.message}`);
    throw error;
  }
}

// Initialize default settings if they don't exist
async function initializeDefaultSettings() {
  try {
    // Check if inactivityThresholdDays exists
    const inactivitySetting = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = 'inactivityThresholdDays'
    `;
    
    if (!inactivitySetting || inactivitySetting.length === 0) {
      // Set default inactivity threshold to 7 days
      await prisma.$queryRaw`
        INSERT INTO settings (key, value) 
        VALUES ('inactivityThresholdDays', '7'::JSONB)
        ON CONFLICT (key) DO NOTHING
      `;
      logger.info('Default inactivity threshold setting initialized');
    }
  } catch (error) {
    logger.error(`Error initializing default settings: ${error.message}`);
    throw error;
  }
}

// GET /api/settings/system
exports.getSystemSettings = async (req, res) => {
  try {
    // Ensure settings table exists
    await ensureSettingsTable();
    
    // Get system settings
    const systemSettings = await prisma.$queryRaw`
      SELECT * FROM settings WHERE key = 'inactivityThresholdDays'
    `;
    
    let inactivityThresholdDays = 7; // Default
    
    if (systemSettings && systemSettings.length > 0) {
      // Parse the JSON value
      try {
        inactivityThresholdDays = JSON.parse(systemSettings[0].value);
      } catch (e) {
        logger.error(`Error parsing inactivityThresholdDays: ${e.message}`);
      }
    } else {
      // Initialize with default
      await initializeDefaultSettings();
    }
    
    res.status(200).json({
      inactivityThresholdDays
    });
  } catch (err) {
    logger.error(`Error retrieving system settings: ${err.message}`);
    res.status(500).json({ error: 'Server error while retrieving system settings' });
  }
};

// PUT /api/settings/system
exports.updateSystemSettings = async (req, res) => {
  try {
    const { inactivityThresholdDays } = req.body;
    
    // Validate inactivity threshold
    if (inactivityThresholdDays === undefined) {
      return res.status(400).json({ error: 'inactivityThresholdDays is required' });
    }
    
    const threshold = parseInt(inactivityThresholdDays);
    
    if (isNaN(threshold) || threshold < 1 || threshold > 365) {
      return res.status(400).json({ error: 'inactivityThresholdDays must be a number between 1 and 365' });
    }
    
    // Ensure settings table exists
    await ensureSettingsTable();
    
    // Update the inactivity threshold
    logger.info(`Writing inactivityThresholdDays as JSON: ${JSON.stringify(threshold)}`);
    await prisma.$queryRaw`
      INSERT INTO settings (key, value, updated_at) 
      VALUES ('inactivityThresholdDays', ${JSON.stringify(threshold)}::JSONB, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE 
      SET value = ${JSON.stringify(threshold)}::JSONB, updated_at = CURRENT_TIMESTAMP
    `;
    
    // Log the setting change
    if (req.user) {
      await logAuditAction(
        req.user.userId,
        null,
        'settings',
        'update',
        { setting: 'inactivityThresholdDays', value: threshold }
      );
    }
    
    logger.info(`Updated inactivity threshold to ${threshold} days`);
    
    res.status(200).json({
      inactivityThresholdDays: threshold,
      message: 'System settings updated successfully'
    });
  } catch (err) {
  logger.error(`Error updating system settings: ${err.stack || err}`);
  res.status(500).json({ error: 'Server error while updating system settings' });
}
};

// Initialize settings when this module is loaded
(async () => {
  try {
    await ensureSettingsTable();
    await initializeDefaultSettings();
    logger.info('Settings module initialized successfully');
  } catch (error) {
    logger.error(`Failed to initialize settings module: ${error.message}`);
  }
})();

/**
 * GET /api/settings/gemini-api-key
 * Get the Gemini API key (masked for security)
 */
exports.getGeminiApiKey = async (req, res) => {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: 'gemini_api_key' },
    });
    
    if (!setting) {
      return res.status(200).json({
        message: 'No API key configured',
        data: {
          hasKey: false,
          maskedKey: null,
        },
      });
    }

    // Decrypt the key
    const decryptedKey = decrypt(setting.value);
    
    // Return only last 4 characters for security
    const maskedKey = decryptedKey.length > 4 
      ? '••••' + decryptedKey.slice(-4)
      : '••••';

    res.status(200).json({
      message: 'API key retrieved',
      data: {
        hasKey: true,
        maskedKey,
      },
    });
  } catch (error) {
    logger.error(`Error getting Gemini API key: ${error.message}`);
    res.status(500).json({
      message: 'Error retrieving API key',
      error: error.message,
    });
  }
};

/**
 * PUT /api/settings/gemini-api-key
 * Update the Gemini API key
 */
exports.updateGeminiApiKey = async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({
        message: 'API key is required',
      });
    }

    // Basic validation - Gemini API keys typically start with 'AIza'
    if (!apiKey.startsWith('AIza')) {
      return res.status(400).json({
        message: 'Invalid API key format. Gemini API keys should start with "AIza"',
      });
    }

    // Encrypt the API key before storing
    const encryptedKey = encrypt(apiKey);

    await prisma.settings.upsert({
      where: { key: 'gemini_api_key' },
      update: {
        value: encryptedKey,
        updatedAt: new Date(),
      },
      create: {
        key: 'gemini_api_key',
        value: encryptedKey,
      },
    });

    // Log the setting change
    if (req.user) {
      await logAuditAction(
        req.user.userId,
        null,
        'settings',
        'update',
        { setting: 'gemini_api_key', masked: '••••' + apiKey.slice(-4) }
      );
    }

    res.status(200).json({
      message: 'API key updated successfully',
      data: {
        maskedKey: '••••' + apiKey.slice(-4),
      },
    });
  } catch (error) {
    logger.error(`Error updating Gemini API key: ${error.message}`);
    res.status(500).json({
      message: 'Error updating API key',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/settings/gemini-api-key
 * Delete the Gemini API key
 */
exports.deleteGeminiApiKey = async (req, res) => {
  try {
    await prisma.settings.delete({
      where: { key: 'gemini_api_key' },
    });

    // Log the setting change
    if (req.user) {
      await logAuditAction(
        req.user.userId,
        null,
        'settings',
        'delete',
        { setting: 'gemini_api_key' }
      );
    }

    res.status(200).json({
      message: 'API key deleted successfully',
    });
  } catch (error) {
    logger.error(`Error deleting Gemini API key: ${error.message}`);
    res.status(500).json({
      message: 'Error deleting API key',
      error: error.message,
    });
  }
};
