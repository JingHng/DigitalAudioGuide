const express = require('express');
const router = express.Router();

// Import the exhibits routes
const exhibitsRoutes = require('../routes/exhibitsRoutes');
// const exhibitionsRoutes = require('../routes/exhibitionRoutes'); 
const schoolsRoutes = require('../routes/schoolRoutes');
const authRoutes = require('../routes/authRoutes'); 
const imagesRoutes = require('../routes/imageRoutes');
const settingsRoutes = require('../routes/settingsRoutes');
const badgeRoutes = require('./badgeRoutes');
const courseRoutes = require('./courseRoutes');

// Mount the routes
router.use('/courses', courseRoutes);
// router.use('/exhibits', exhibitsRoutes);
// router.use('/exhibitions', exhibitionsRoutes); 
router.use('/schools', schoolsRoutes);
router.use('/badges', badgeRoutes);
router.use('/auth', authRoutes);
router.use('/images', imagesRoutes);
router.use('/settings', settingsRoutes);



module.exports = router;