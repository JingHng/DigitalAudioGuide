const express = require('express');
const router = express.Router();

// Import the exhibits routes
const exhibitsRoutes = require('./exhibitsRoutes');
const exhibitionsRoutes = require('./exhibitonRoutes'); 
const badgeRoutes = require('./badgeRoutes');
const authRoutes = require('./authRoutes'); 
// const imagesRoutes = require('../routes/imageRoutes');
// const reviewRoutes = require('../routes/reviewRoutes'); 
// const settingsRoutes = require('../routes/settingsRoutes');


router.use('/exhibits', exhibitsRoutes);
router.use('/exhibitions', exhibitionsRoutes); 
router.use('/badges', badgeRoutes);
router.use('/auth', authRoutes);
// router.use('/images', imagesRoutes);
// router.use('/reviews', reviewRoutes); 
// router.use('/settings', settingsRoutes);



module.exports = router;
