const ReviewModel = require('../models/reviewModel');

class ReviewController {
  /**
   * GET /api/reviews
   * Get all reviews with pagination and filtering.
   * Supports filtering by exhibit, user, rating range, and sorting.
   * Returns reviews and pagination info.
   */
  static async getAllReviews(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        exhibit_id,
        user_id,
        min_rating,
        max_rating,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      const filters = { exhibit_id, user_id, min_rating, max_rating };
      const pagination = { skip, take };
      const sorting = { sort_by, sort_order };

      const { reviews, totalCount } = await ReviewModel.getAllReviews(filters, pagination, sorting);
      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: totalCount,
            per_page: take,
            has_next: parseInt(page) < totalPages,
            has_prev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews'
      });
    }
  }

  // GET /api/reviews/:id - Get a specific review by ID
  static async getReviewById(req, res) {
    try {
      const { id } = req.params;

      const review = await ReviewModel.getReviewById(id);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      res.json({
        success: true,
        data: review
      });
    } catch (error) {
      console.error('Error fetching review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch review'
      });
    }
  }

  // POST /api/reviews - Create a new review
  static async createReview(req, res) {
    try {
      // Log for debugging authentication
      console.log('[ReviewController] Authorization header:', req.headers.authorization);
      console.log('[ReviewController] req.user:', req.user);

      const { exhibit_id, rating, comment } = req.body;
      const user_id = req.user && req.user.userId;

      // Validate required fields
      if (!user_id || !exhibit_id || !rating) {
        return res.status(400).json({
          success: false,
          error: 'user_id, exhibit_id, and rating are required'
        });
      }

      // Validate rating range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      // Check if user and exhibit exist
      const [userExists, exhibitExists] = await Promise.all([
        ReviewModel.userExists(user_id),
        ReviewModel.exhibitExists(exhibit_id)
      ]);

      if (!userExists) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!exhibitExists) {
        return res.status(404).json({
          success: false,
          error: 'Exhibit not found'
        });
      }

      // No duplicate review check; unlimited reviews allowed

      const review = await ReviewModel.createReview({ user_id, exhibit_id, rating, comment });

      res.status(201).json({
        success: true,
        data: review,
        message: 'Review created successfully'
      });
    } catch (error) {
      console.error('Error creating review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create review'
      });
    }
  }

  // PUT /api/reviews/:id - Update a specific review
  static async updateReview(req, res) {
    try {
      const { id } = req.params;
      const { rating, comment, user_id } = req.body;

      // Check if review exists
      const existingReview = await ReviewModel.getReviewById(id);
      if (!existingReview) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      // Check if the user is the owner of the review
      if (user_id && existingReview.user_id !== parseInt(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'You can only update your own reviews'
        });
      }

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      // Build update data
      const updateData = {};
      if (rating !== undefined) updateData.rating = rating;
      if (comment !== undefined) updateData.comment = comment;

      const updatedReview = await ReviewModel.updateReview(id, updateData);

      res.json({
        success: true,
        data: updatedReview,
        message: 'Review updated successfully'
      });
    } catch (error) {
      console.error('Error updating review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update review'
      });
    }
  }

  // DELETE /api/reviews/:id - Delete a specific review
  static async deleteReview(req, res) {
    try {
      const { id } = req.params;
      const { user_id } = req.body;

      // Check if review exists
      const existingReview = await ReviewModel.getReviewById(id);
      if (!existingReview) {
        return res.status(404).json({
          success: false,
          error: 'Review not found'
        });
      }

      // Check if the user is the owner of the review (optional security check)
      if (user_id && existingReview.user_id !== parseInt(user_id)) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete your own reviews'
        });
      }

      await ReviewModel.deleteReview(id);

      res.json({
        success: true,
        message: 'Review deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting review:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete review'
      });
    }
  }

  /**
   * GET /api/reviews/exhibit/:exhibit_id/stats
   * Get review statistics for a specific exhibit.
   * Returns average rating, total reviews, and rating distribution.
   */
  static async getExhibitReviewStats(req, res) {
    try {
      const { exhibit_id } = req.params;

      const stats = await ReviewModel.getExhibitReviewStats(exhibit_id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching review stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch review statistics'
      });
    }
  }

  // GET /api/reviews/exhibition/:exhibition_id/stats - Get review statistics for an exhibition
  static async getExhibitionReviewStats(req, res) {
    try {
      const { exhibition_id } = req.params;
      const stats = await ReviewModel.getExhibitionReviewStats(exhibition_id);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching exhibition review stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch exhibition review statistics'
      });
    }
  }

  // GET /api/reviews/exhibit/:exhibit_id - Get all reviews for a specific exhibit
  static async getReviewsByExhibit(req, res) {
    try {
      const { exhibit_id } = req.params;
      const reviews = await ReviewModel.getReviewsByExhibit(exhibit_id);
      res.json({
        success: true,
        data: reviews
      });
    } catch (error) {
      console.error('Error fetching reviews by exhibit:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reviews by exhibit'
      });
    }
  }

  // GET /api/reviews/exhibit/:exhibit_id/rating - Get average rating for a specific exhibit
  static async getExhibitAverageRating(req, res) {
    try {
      const { exhibit_id } = req.params;
      const avgRating = await ReviewModel.getExhibitAverageRating(exhibit_id);
      res.json({
        success: true,
        data: { average_rating: avgRating }
      });
    } catch (error) {
      console.error('Error fetching average rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch average rating'
      });
    }
  }

  // GET /api/reviews/user/:user_id - Get all reviews by a specific user
  static async getReviewsByUser(req, res) {
    try {
      const { user_id } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);
      const pagination = { skip, take };

      const { reviews, totalCount } = await ReviewModel.getReviewsByUser(user_id, pagination);
      const totalPages = Math.ceil(totalCount / take);

      res.json({
        success: true,
        data: {
          reviews,
          pagination: {
            current_page: parseInt(page),
            total_pages: totalPages,
            total_count: totalCount,
            per_page: take,
            has_next: parseInt(page) < totalPages,
            has_prev: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Error fetching user reviews:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch user reviews'
      });
    }

  // End of last valid method in class
}
}

module.exports = ReviewController;