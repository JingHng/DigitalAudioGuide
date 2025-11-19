const BadgeModel = require('../models/badgeModel');

/**
 * @route   GET /api/allBadges
 * @desc    Retrieve all badges from the database, ordered by badgeId
 * @access  Public
 */
exports.getAllBadges = async (req, res) => {
  try {
    // Fetch all badges using the model
    const badges = await BadgeModel.getAllBadges();

    // Respond with the fetched badges
    res.status(200).json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ message: 'Error fetching badges' });
  }
};

/**
 * @route   GET /api/badges/userBadges
 * @desc    Retrieve all badges associated with the logged-in user, including full badge details
 * @access  Private
 */
exports.getUserBadges = async (req, res) => {
  try {
    // Adjust the property name based on your auth middleware
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: No user ID found' });
    }

    // Fetch all user badges (including badge details) using the model
    const userBadges = await BadgeModel.getUserBadgesByUserId(userId);

    res.status(200).json({ status: 'success', data: userBadges });
  } catch (error) {
    console.error('Error fetching user badges:', error);
    res.status(500).json({ message: 'Error fetching user badges' });
  }
};

/**
 * @route   POST /api/badges/assignBadges
 * @desc    Assign the badge linked to an exhibit to the logged-in user
 * @access  Private
 * @body    { exhibitId: number }
 */
exports.assignBadgesToUser = async (req, res) => {
  try {
    // Use a consistent field for user ID (align with getUserBadges)
    const userId = req.user?.userId;
    const { exhibitId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!exhibitId) {
      return res.status(400).json({ error: 'exhibitId is required' });
    }

    // 1. Find the badge associated with the given exhibit
    const badge = await BadgeModel.findByExhibitId(exhibitId);
    if (!badge) {
      return res
        .status(404)
        .json({ error: 'Badge not found for this exhibit' });
    }

    // NOTE: With Prisma your primary key is likely "badgeId", not "id"
    const badgeId = badge.badgeId;

    // 2. Optionally avoid duplicates: check if the user already has this badge
    const existing = await BadgeModel.findByUserAndBadge(userId, badgeId);
    if (existing) {
      return res.json({
        message: 'Badge already claimed',
        badgeId,
      });
    }

    // 3. Create a new userBadge record
    await BadgeModel.createUserBadge(userId, badgeId);

    return res.json({
      message: 'Badge claimed successfully',
      badgeId,
    });
  } catch (error) {
    console.error('Error claiming badge:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
