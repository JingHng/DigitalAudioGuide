const { PrismaClient } = require('../generated/prisma/index.js');
const prisma = new PrismaClient();

async function seedFloatingCards() {
    console.log('🌱 Seeding floating cards...');

    const defaultCards = [
        {
            title: 'Interactive Scanning',
            icon: 'QrCode',
            linkUrl: '/scan',
            position: 1,
            isActive: true
        },
        {
            title: 'Tour Navigation',
            icon: 'MapPin',
            linkUrl: '/exhibitions',
            position: 2,
            isActive: true
        },
        {
            title: 'Badge Collection',
            icon: 'Settings',
            linkUrl: '/badge',
            position: 3,
            isActive: true
        }
    ];

    for (const card of defaultCards) {
        try {
            await prisma.homeFloatingCard.create({
                data: card
            });
            console.log(`✅ Created card: ${card.title}`);
        } catch (error) {
            console.log(`⚠️  Card '${card.title}' may already exist, skipping...`);
        }
    }

    console.log('✨ Floating cards seeded successfully!');
}

seedFloatingCards()
    .catch((e) => {
        console.error('Error seeding floating cards:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
