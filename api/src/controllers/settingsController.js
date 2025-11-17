/**
 * Settings Controller
 * 
 * Handles application-wide settings, including system settings like inactivity threshold.
 */

const { PrismaClient } = require('../../generated/prisma');
const logger = require('../utils/logger');
const { logAuditAction } = require('./auditLogsController');

// Create a table for settings if it doesn't exist
async function ensureSettingsTable() {
  const prisma = new PrismaClient();
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
  } finally {
    await prisma.$disconnect();
  }
}

// Initialize default settings if they don't exist
async function initializeDefaultSettings() {
  const prisma = new PrismaClient();
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
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/settings/system
exports.getSystemSettings = async (req, res) => {
  const prisma = new PrismaClient();
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
  } finally {
    await prisma.$disconnect();
  }
};

// PUT /api/settings/system
exports.updateSystemSettings = async (req, res) => {
  const prisma = new PrismaClient();
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
} finally {
    await prisma.$disconnect();
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
