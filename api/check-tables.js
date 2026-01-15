const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function checkTables() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log('Tables in database:');
    tables.forEach(t => console.log('-', t.tablename));
    
    const senderTypeTables = tables.filter(t => t.tablename.includes('sender'));
    if (senderTypeTables.length > 0) {
      console.log('\n✅ sender_type table found!');
    } else {
      console.log('\n❌ sender_type table NOT found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTables();
