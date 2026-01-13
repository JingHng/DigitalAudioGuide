const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
class ReviewModel {
    /**
     * Get average rating for all exhibits in a specific exhibition.
     * Returns a number (average rating) for the given exhibitionId.
     */
    static async getExhibitionAverageRating(exhibitionId) {
      try {
        // Get all exhibit IDs for the exhibition
        const exhibits = await prisma.exhibit.findMany({
          where: { exhibitionId: BigInt(exhibitionId) },
          select: { exhibitId: true }
        });
        const exhibitIds = exhibits.map(e => e.exhibitId);
        if (exhibitIds.length === 0) return 0;

        // Aggregate feedbacks for all exhibits in the exhibition
        const stats = await prisma.feedback.aggregate({
          where: { exhibitId: { in: exhibitIds } },
          _avg: { rating: true }
        });
        return stats._avg.rating || 0;
      } catch (error) {
        console.error('Error in ReviewModel.getExhibitionAverageRating:', error);
        throw error;
      }
    }
  /**
   * Get all reviews with pagination and filtering.
   * Supports filtering by exhibit, user, rating range, and sorting.
   * Returns reviews with user and exhibit details.
   */
  static async getAllReviews(filters, pagination, sorting) {
    try {
      const { exhibit_id, user_id, min_rating, max_rating } = filters;
      const { skip, take } = pagination;
      const { sort_by, sort_order } = sorting;

      // Build WHERE conditions for SQL query
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      // Filter by exhibit
      if (exhibit_id) {
        whereConditions.push(`f.exhibit_id = $${paramIndex}`);
        params.push(parseInt(exhibit_id));
        paramIndex++;
      }
      // Filter by user
      if (user_id) {
        whereConditions.push(`f.user_id = $${paramIndex}`);
        params.push(parseInt(user_id));
        paramIndex++;
      }
      // Filter by minimum rating
      if (min_rating) {
        whereConditions.push(`f.rating >= $${paramIndex}`);
        params.push(parseInt(min_rating));
        paramIndex++;
      }
      // Filter by maximum rating
      if (max_rating) {
        whereConditions.push(`f.rating <= $${paramIndex}`);
        params.push(parseInt(max_rating));
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const fieldMap = {
        'created_at': 'f.created_at',
        'updated_at': 'f.updated_at',
        'rating': 'f.rating'
      };
      const orderField = fieldMap[sort_by] || 'f.created_at';
      const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

      // SQL query to get reviews with user and exhibit data
      const reviewsQuery = `
        SELECT
          f.feedback_id, f.user_id, f.exhibit_id, f.rating, f.description, f.created_at, f.updated_at,
          u.username, u.email,
          e.title as exhibit_title, e.description as exhibit_description
        FROM feedback f
        LEFT JOIN "user" u ON f.user_id = u.user_id
        LEFT JOIN exhibit e ON f.exhibit_id = e.exhibit_id
        ${whereClause}
        ORDER BY ${orderField} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(take, skip);

      // SQL query to get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM feedback f
        ${whereClause}
      `;
      const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params

      // Execute queries in parallel
      const [reviews, countResult] = await Promise.all([
        prisma.$queryRawUnsafe(reviewsQuery, ...params),
        prisma.$queryRawUnsafe(countQuery, ...countParams)
      ]);

      const totalCount = Number(countResult[0].total);

      // Transform the response to match frontend expectations
      const transformedReviews = reviews.map(review => ({
        feedback_id: Number(review.feedback_id),
        user_id: Number(review.user_id),
        exhibit_id: Number(review.exhibit_id),
        rating: review.rating,
        description: review.description,
        created_at: review.created_at,
        updated_at: review.updated_at,
        user: {
          user_id: Number(review.user_id),
          username: review.username,
          email: review.email
        },
        exhibit: {
          exhibit_id: Number(review.exhibit_id),
          title: review.exhibit_title,
          description: review.exhibit_description
        }
      }));

      return { reviews: transformedReviews, totalCount };
    } catch (error) {
      console.error('Error in ReviewModel.getAllReviews:', error);
      throw error;
    }
  }

  // Get review by ID
  static async getReviewById(reviewId) {
    try {
      const review = await prisma.feedback.findUnique({
        where: {
          feedbackId: BigInt(reviewId)
        },
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              email: true
            }
          },
          exhibit: {
            select: {
              exhibitId: true,
              title: true,
              description: true
            }
          }
        }
      });

      if (!review) return null;

      // Transform the response
      return {
        feedback_id: Number(review.feedbackId),
        user_id: Number(review.userId),
        exhibit_id: Number(review.exhibitId),
        rating: review.rating,
        description: review.description,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        user: {
          user_id: Number(review.user.userId),
          username: review.user.username,
          email: review.user.email
        },
        exhibit: {
          exhibit_id: Number(review.exhibit.exhibitId),
          title: review.exhibit.title,
          description: review.exhibit.description
        }
      };
    } catch (error) {
      console.error('Error in ReviewModel.getReviewById:', error);
      throw error;
    }
  }

  // Create a new review
  static async createReview(reviewData) {
    try {
      const { user_id, exhibit_id, rating, comment } = reviewData;
      
      // Insert the review using raw SQL
      const insertResult = await prisma.$queryRaw`
        INSERT INTO feedback (user_id, exhibit_id, rating, description, created_at, updated_at)
        VALUES (${parseInt(user_id)}, ${parseInt(exhibit_id)}, ${parseInt(rating)}, ${comment || null}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING feedback_id, user_id, exhibit_id, rating, description, created_at, updated_at
      `;

      const newReview = insertResult[0];

      // Get user and exhibit data
      const [userData, exhibitData] = await Promise.all([
        prisma.$queryRaw`SELECT user_id, username, email FROM "user" WHERE user_id = ${parseInt(user_id)}`,
        prisma.$queryRaw`SELECT exhibit_id, title, description FROM exhibit WHERE exhibit_id = ${parseInt(exhibit_id)}`
      ]);

      const user = userData[0];
      const exhibit = exhibitData[0];

      // Transform the response
      return {
        feedback_id: Number(newReview.feedback_id),
        user_id: Number(newReview.user_id),
        exhibit_id: Number(newReview.exhibit_id),
        rating: newReview.rating,
        description: newReview.description,
        created_at: newReview.created_at,
        updated_at: newReview.updated_at,
        user: {
          user_id: Number(user.user_id),
          username: user.username,
          email: user.email
        },
        exhibit: {
          exhibit_id: Number(exhibit.exhibit_id),
          title: exhibit.title,
          description: exhibit.description
        }
      };
    } catch (error) {
      console.error('Error in ReviewModel.createReview:', error);
      throw error;
    }
  }

  // Update review
  static async updateReview(reviewId, updateData) {
    try {
      const data = {
        updatedAt: new Date(),
        ...updateData
      };

      if (data.rating) data.rating = parseInt(data.rating);
      if (data.comment !== undefined) {
        data.description = data.comment;
        delete data.comment;
      }

      const review = await prisma.feedback.update({
        where: {
          feedbackId: BigInt(reviewId)
        },
        data,
        include: {
          user: {
            select: {
              userId: true,
              username: true,
              email: true
            }
          },
          exhibit: {
            select: {
              exhibitId: true,
              title: true,
              description: true
            }
          }
        }
      });

      // Transform the response
      return {
        feedback_id: Number(review.feedbackId),
        user_id: Number(review.userId),
        exhibit_id: Number(review.exhibitId),
        rating: review.rating,
        comment: review.description,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        user: {
          user_id: Number(review.user.userId),
          username: review.user.username,
          email: review.user.email
        },
        exhibit: {
          exhibit_id: Number(review.exhibit.exhibitId),
          title: review.exhibit.title,
          description: review.exhibit.description
        }
      };
    } catch (error) {
      console.error('Error in ReviewModel.updateReview:', error);
      throw error;
    }
  }

  // Delete review
  static async deleteReview(reviewId) {
    try {
      return await prisma.feedback.delete({
        where: {
          feedbackId: BigInt(reviewId)
        }
      });
    } catch (error) {
      console.error('Error in ReviewModel.deleteReview:', error);
      throw error;
    }
  }

  // Check if user exists
  static async userExists(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { userId: BigInt(userId) },
        select: { userId: true }
      });
      return !!user;
    } catch (error) {
      console.error('Error in ReviewModel.userExists:', error);
      throw error;
    }
  }

  // Check if exhibit exists
  static async exhibitExists(exhibitId) {
    try {
      const exhibit = await prisma.exhibit.findUnique({
        where: { exhibitId: BigInt(exhibitId) },
        select: { exhibitId: true }
      });
      return !!exhibit;
    } catch (error) {
      console.error('Error in ReviewModel.exhibitExists:', error);
      throw error;
    }
  }

    // Check if user has already reviewed exhibit
    // (No longer used; unlimited reviews allowed)
    static async hasUserReviewedExhibit(userId, exhibitId) {
      return false;
    }

    /**
     * Get review statistics for a specific exhibit.
     * Returns average rating, total reviews, and rating distribution (1-5 stars).
     */
    static async getExhibitReviewStats(exhibitId) {
      try {
        // Aggregate average rating and total count
        const stats = await prisma.feedback.aggregate({
          where: {
            exhibitId: BigInt(exhibitId)
          },
          _avg: {
            rating: true
          },
          _count: {
            feedbackId: true
          }
        });

        // Get rating distribution (how many reviews for each rating value)
        const ratingDistribution = await prisma.feedback.groupBy({
          by: ['rating'],
          where: {
            exhibitId: BigInt(exhibitId)
          },
          _count: {
            feedbackId: true
          }
        });

        // Format rating distribution as { 1: count, 2: count, ... }
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
          distribution[i] = 0;
        }
        ratingDistribution.forEach(item => {
          distribution[item.rating] = item._count.feedbackId;
        });

        return {
          average_rating: stats._avg.rating || 0,
          total_reviews: stats._count.feedbackId || 0,
          rating_distribution: distribution
        };
      } catch (error) {
        console.error('Error in ReviewModel.getExhibitReviewStats:', error);
        throw error;
      }
    }
  
    /**
     * Get review statistics for an exhibition (aggregates all exhibits).
     * Returns average rating, total reviews, and rating distribution for all exhibits in the exhibition.
     */
    static async getExhibitionReviewStats(exhibitionId) {
      try {
        // Get all exhibit IDs for the exhibition
        const exhibits = await prisma.exhibit.findMany({
          where: { exhibitionId: BigInt(exhibitionId) },
          select: { exhibitId: true }
        });
        const exhibitIds = exhibits.map(e => e.exhibitId);

        // If no exhibits, return zeroed stats
        if (exhibitIds.length === 0) {
          return {
            average_rating: 0,
            total_reviews: 0,
            rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
          };
        }

        // Aggregate feedbacks for all exhibits in the exhibition
        const stats = await prisma.feedback.aggregate({
          where: {
            exhibitId: { in: exhibitIds }
          },
          _avg: { rating: true },
          _count: { feedbackId: true }
        });

        // Get rating distribution for all exhibits
        const ratingDistribution = await prisma.feedback.groupBy({
          by: ['rating'],
          where: {
            exhibitId: { in: exhibitIds }
          },
          _count: { feedbackId: true }
        });

        // Format rating distribution as { 1: count, ... }
        const distribution = {};
        for (let i = 1; i <= 5; i++) {
          distribution[i] = 0;
        }
        ratingDistribution.forEach(item => {
          distribution[item.rating] = item._count.feedbackId;
        });

        return {
          average_rating: stats._avg.rating || 0,
          total_reviews: stats._count.feedbackId || 0,
          rating_distribution: distribution
        };
      } catch (error) {
        console.error('Error in ReviewModel.getExhibitionReviewStats:', error);
        throw error;
      }
    }

  // Get reviews by user
  static async getReviewsByUser(userId, pagination) {
    try {
      const { skip, take } = pagination;

      const [reviews, totalCount] = await Promise.all([
        prisma.feedback.findMany({
          where: {
            userId: BigInt(userId)
          },
          skip,
          take,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            exhibit: {
              select: {
                exhibitId: true,
                title: true,
                description: true,
                exhibition: {
                  select: {
                    exhibitionId: true,
                    title: true
                  }
                }
              }
            }
          }
        }),
        prisma.feedback.count({
          where: {
            userId: BigInt(userId)
          }
        })
      ]);

      // Transform the response
      const transformedReviews = reviews.map(review => ({
        feedback_id: Number(review.feedbackId),
        user_id: Number(review.userId),
        exhibit_id: Number(review.exhibitId),
        rating: review.rating,
        comment: review.description,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
        exhibit: {
          exhibit_id: Number(review.exhibit.exhibitId),
          title: review.exhibit.title,
          description: review.exhibit.description,
          exhibitionId: review.exhibit.exhibition?.exhibitionId ? Number(review.exhibit.exhibition.exhibitionId) : undefined,
          exhibitionTitle: review.exhibit.exhibition?.title || undefined
        },
        exhibition: review.exhibit.exhibition
          ? {
              exhibitionId: Number(review.exhibit.exhibition.exhibitionId),
              title: review.exhibit.exhibition.title
            }
          : undefined
      }));

      return { reviews: transformedReviews, totalCount };
    } catch (error) {
      console.error('Error in ReviewModel.getReviewsByUser:', error);
      throw error;
    }
  }
  /**
   * Get all reviews for a specific exhibit.
   * Returns an array of reviews for the given exhibitId.
   */
  static async getReviewsByExhibit(exhibitId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        rating,
        sortByComment = false
      } = options;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const take = parseInt(limit);

      // Build where clause
      let where = { exhibitId: BigInt(exhibitId) };
      if (rating) {
        where.rating = parseInt(rating);
      }
      if (sortByComment) {
        where.description = { not: null };
      }

      // Build orderBy
      let orderBy = [{ createdAt: 'desc' }];
      if (sortByComment) {
        // Sort by presence of description first, then by createdAt
        orderBy = [
          { description: 'desc' },
          { createdAt: 'desc' }
        ];
      }

      const [reviews, totalCount] = await Promise.all([
        prisma.feedback.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            user: {
              select: {
                userId: true,
                username: true,
                email: true
              }
            }
          }
        }),
        prisma.feedback.count({ where })
      ]);

      // Transform the response
      return {
        reviews: reviews.map(review => ({
          feedback_id: Number(review.feedbackId),
          user_id: Number(review.userId),
          exhibit_id: Number(review.exhibitId),
          rating: review.rating,
          description: review.description,
          created_at: review.createdAt,
          updated_at: review.updatedAt,
          user: {
            user_id: Number(review.user.userId),
            username: review.user.username,
            email: review.user.email
          }
        })),
        totalCount
      };
    } catch (error) {
      console.error('Error in ReviewModel.getReviewsByExhibit:', error);
      throw error;
    }
  }

  /**
   * Get average rating for a specific exhibit.
   * Returns a number (average rating) for the given exhibitId.
   */
  static async getExhibitAverageRating(exhibitId) {
    try {
      const stats = await prisma.feedback.aggregate({
        where: {
          exhibitId: BigInt(exhibitId)
        },
        _avg: {
          rating: true
        }
      });
      return stats._avg.rating || 0;
    } catch (error) {
      console.error('Error in ReviewModel.getExhibitAverageRating:', error);
      throw error;
    }
  }
}

module.exports = ReviewModel;