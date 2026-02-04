const { PrismaClient } = require('../../generated/prisma/index.js');
const prisma = new PrismaClient();

/**
 * Get all active floating cards (public endpoint)
 */
const getActiveFloatingCards = async (req, res) => {
    try {
        const cards = await prisma.homeFloatingCard.findMany({
            where: { isActive: true },
            orderBy: { position: 'asc' },
        });
        res.json(cards);
    } catch (error) {
        console.error('Error fetching floating cards:', error);
        res.status(500).json({ error: 'Failed to fetch floating cards' });
    }
};

/**
 * Get all floating cards (admin only)
 */
const getAllFloatingCards = async (req, res) => {
    try {
        const cards = await prisma.homeFloatingCard.findMany({
            orderBy: { position: 'asc' },
        });
        res.json(cards);
    } catch (error) {
        console.error('Error fetching all floating cards:', error);
        res.status(500).json({ error: 'Failed to fetch floating cards' });
    }
};

/**
 * Create a new floating card (admin only)
 */
const createFloatingCard = async (req, res) => {
    try {
        const { title, icon, linkUrl, position, isActive } = req.body;

        if (!title || !icon || !linkUrl || position === undefined) {
            return res.status(400).json({ error: 'Missing required fields: title, icon, linkUrl, position' });
        }

        const card = await prisma.homeFloatingCard.create({
            data: {
                title,
                icon,
                linkUrl,
                position: parseInt(position),
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        res.status(201).json(card);
    } catch (error) {
        console.error('Error creating floating card:', error);
        res.status(500).json({ error: 'Failed to create floating card' });
    }
};

/**
 * Update a floating card (admin only)
 */
const updateFloatingCard = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, icon, linkUrl, position, isActive } = req.body;

        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (icon !== undefined) updateData.icon = icon;
        if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
        if (position !== undefined) updateData.position = parseInt(position);
        if (isActive !== undefined) updateData.isActive = isActive;
        updateData.updatedAt = new Date();

        const card = await prisma.homeFloatingCard.update({
            where: { cardId: id },
            data: updateData,
        });

        res.json(card);
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Floating card not found' });
        }
        console.error('Error updating floating card:', error);
        res.status(500).json({ error: 'Failed to update floating card' });
    }
};

/**
 * Delete a floating card (admin only)
 */
const deleteFloatingCard = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.homeFloatingCard.delete({
            where: { cardId: id },
        });

        res.json({ message: 'Floating card deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ error: 'Floating card not found' });
        }
        console.error('Error deleting floating card:', error);
        res.status(500).json({ error: 'Failed to delete floating card' });
    }
};

module.exports = {
    getActiveFloatingCards,
    getAllFloatingCards,
    createFloatingCard,
    updateFloatingCard,
    deleteFloatingCard,
};
