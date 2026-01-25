const { PrismaClient } = require('../../generated/prisma');

// Create a single Prisma Client instance to be reused across the application
// This prevents creating new database connections on every request
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to prevent creating multiple instances
  // during hot-reloading
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: ['error', 'warn'], // Add logging for debugging in development
    });
  }
  prisma = global.__prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
