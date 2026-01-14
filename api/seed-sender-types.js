const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function seedSenderTypes() {
  try {
    console.log('Seeding sender types...');
    
    await prisma.$executeRaw`
      INSERT INTO sender_type (sender_type_id, sender_type) 
      VALUES (1, 'user'), (2, 'assistant') 
      ON CONFLICT DO NOTHING
    `;
    
    console.log('✅ Sender types inserted successfully!');
  } catch (error) {
    console.error('Error seeding sender types:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSenderTypes();
