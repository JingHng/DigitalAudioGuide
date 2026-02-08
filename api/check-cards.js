const { PrismaClient } = require('./generated/prisma/index.js');
const prisma = new PrismaClient();

async function checkCards() {
    try {
        const cards = await prisma.homeFloatingCard.findMany();
        console.log('Cards in DB:', JSON.stringify(cards, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCards();
