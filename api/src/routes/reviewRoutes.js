/**
 * Review routes for feedback system and analytics.
 * Order of routes is important to avoid conflicts with dynamic :id routes.
 */
const express = require('express');
const ReviewController = require('../controllers/reviewController');
const jwtMiddleware = require('../middleware/jwtMiddleware');
const router = express.Router();

// Debug log for all review routes
router.use((req, res, next) => {
  console.log(`[ReviewRoutes] ${req.method} ${req.originalUrl}`);
  next();
});

// GET /api/reviews - Get all reviews with pagination and filtering
router.get('/', ReviewController.getAllReviews);

// GET /api/reviews/exhibit/:exhibit_id/stats - Get review statistics for an exhibit
// Note: This must come before /:id route to avoid conflicts
router.get('/exhibit/:exhibit_id/stats', ReviewController.getExhibitReviewStats);

// GET /api/reviews/exhibit/:exhibit_id/rating - Get average rating for an exhibit
router.get('/exhibit/:exhibit_id/rating', ReviewController.getExhibitAverageRating);

// GET /api/reviews/exhibit/:exhibit_id - Get all reviews for an exhibit
router.get('/exhibit/:exhibit_id', ReviewController.getReviewsByExhibit);

// GET /api/reviews/exhibition/:exhibition_id/stats - Get review statistics for an exhibition
// Note: This must come before /:id route to avoid conflicts
router.get('/exhibition/:exhibition_id/stats', ReviewController.getExhibitionReviewStats);

// GET /api/reviews/user/:user_id - Get all reviews by a specific user
// Note: This must come before /:id route to avoid conflicts
router.get('/user/:user_id', ReviewController.getReviewsByUser);

// GET /api/reviews/:id - Get a specific review by ID
router.get('/:id', ReviewController.getReviewById);

// POST /api/reviews - Create a new review (authentication required)
router.post('/', jwtMiddleware.verifyToken, ReviewController.createReview);

// PUT /api/reviews/:id - Update a specific review
router.put('/:id', ReviewController.updateReview);

// DELETE /api/reviews/:id - Delete a specific review
router.delete('/:id', ReviewController.deleteReview);

module.exports = router;