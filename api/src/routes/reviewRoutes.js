const express = require('express');
const ReviewController = require('../controllers/reviewController');
const router = express.Router();

// GET /api/reviews - Get all reviews with pagination and filtering
router.get('/', ReviewController.getAllReviews);

// GET /api/reviews/exhibit/:exhibit_id/stats - Get review statistics for an exhibit
// Note: This must come before /:id route to avoid conflicts
router.get('/exhibit/:exhibit_id/stats', ReviewController.getExhibitReviewStats);

// GET /api/reviews/user/:user_id - Get all reviews by a specific user
// Note: This must come before /:id route to avoid conflicts
router.get('/user/:user_id', ReviewController.getReviewsByUser);

// GET /api/reviews/:id - Get a specific review by ID
router.get('/:id', ReviewController.getReviewById);

// POST /api/reviews - Create a new review
router.post('/', ReviewController.createReview);

// PUT /api/reviews/:id - Update a specific review
router.put('/:id', ReviewController.updateReview);

// DELETE /api/reviews/:id - Delete a specific review
router.delete('/:id', ReviewController.deleteReview);

module.exports = router;