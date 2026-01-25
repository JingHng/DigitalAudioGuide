const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Get a setting value by key
 */
async function getSetting(key) {
  const setting = await prisma.settings.findUnique({
    where: { key },
  });
  return setting;
}

/**
 * Set or update a setting value
 */
async function setSetting(key, value) {
  const setting = await prisma.settings.upsert({
    where: { key },
    update: {
      value,
      updatedAt: new Date(),
    },
    create: {
      key,
      value,
    },
  });
  return setting;
}

/**
 * Get all settings
 */
async function getAllSettings() {
  const settings = await prisma.settings.findMany({
    orderBy: { key: 'asc' },
  });
  return settings;
}

/**
 * Delete a setting
 */
async function deleteSetting(key) {
  await prisma.settings.delete({
    where: { key },
  });
}

module.exports = {
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting,
};
