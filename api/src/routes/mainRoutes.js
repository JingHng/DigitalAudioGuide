const express = require('express');
const router = express.Router();

// Import the exhibits routes
const exhibitsRoutes = require('./exhibitsRoutes');
const exhibitionsRoutes = require('../routes/exhibitonRoutes'); 
// const authRoutes = require('../routes/authRoutes'); 
// const imagesRoutes = require('../routes/imageRoutes');
// const reviewRoutes = require('../routes/reviewRoutes'); 
// const settingsRoutes = require('../routes/settingsRoutes');


router.use('/exhibits', exhibitsRoutes);
router.use('/exhibitions', exhibitionsRoutes); 
// router.use('/auth', authRoutes);
// router.use('/images', imagesRoutes);
// router.use('/reviews', reviewRoutes); 
// router.use('/settings', settingsRoutes);




module.exports = router;
