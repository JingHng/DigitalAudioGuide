// models/reviewModel.js - Fixed version
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

class ReviewModel {
  
  // Get all reviews with pagination and filtering
  static async getAllReviews(filters, pagination, sorting) {
    try {
      const { exhibit_id, user_id, min_rating, max_rating } = filters;
      const { skip, take } = pagination;
      const { sort_by, sort_order } = sorting;

      // Build WHERE conditions
      let whereConditions = [];
      let params = [];
      let paramIndex = 1;

      if (exhibit_id) {
        whereConditions.push(`f.exhibit_id = $${paramIndex}`);
        params.push(parseInt(exhibit_id));
        paramIndex++;
      }
      
      if (user_id) {
        whereConditions.push(`f.user_id = $${paramIndex}`);
        params.push(parseInt(user_id));
        paramIndex++;
      }
      
      if (min_rating) {
        whereConditions.push(`f.rating >= $${paramIndex}`);
        params.push(parseInt(min_rating));
        paramIndex++;
      }
      
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

      // Get reviews with user, exhibit and exhibition data
      const reviewsQuery = `
        SELECT 
          f.feedback_id, f.user_id, f.exhibit_id, f.rating, f.description, f.created_at, f.updated_at,
          u.username, u.email,
          e.title as exhibit_title, e.description as exhibit_description,
          ex.title as exhibition_title
        FROM feedback f
        LEFT JOIN "user" u ON f.user_id = u.user_id
        LEFT JOIN exhibit e ON f.exhibit_id = e.exhibit_id
        LEFT JOIN exhibitions ex ON e.exhibition_id = ex.exhibition_id
        ${whereClause}
        ORDER BY ${orderField} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      params.push(take, skip);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM feedback f
        ${whereClause}
      `;
      
      const countParams = params.slice(0, -2); // Remove LIMIT and OFFSET params

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
        comment: review.description,
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
        },
        exhibition: {
          title: review.exhibition_title || null
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
        comment: newReview.description,
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
  static async hasUserReviewedExhibit(userId, exhibitId) {
    try {
      const existingReview = await prisma.feedback.findFirst({
        where: {
          userId: BigInt(userId),
          exhibitId: BigInt(exhibitId)
        }
      });
      return !!existingReview;
    } catch (error) {
      console.error('Error in ReviewModel.hasUserReviewedExhibit:', error);
      throw error;
    }
  }

  // Get review statistics for an exhibit
  static async getExhibitReviewStats(exhibitId) {
    try {
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

      // Get rating distribution
      const ratingDistribution = await prisma.feedback.groupBy({
        by: ['rating'],
        where: {
          exhibitId: BigInt(exhibitId)
        },
        _count: {
          feedbackId: true
        }
      });

      // Format rating distribution
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
                description: true
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
          description: review.exhibit.description
        }
      }));

      return { reviews: transformedReviews, totalCount };
    } catch (error) {
      console.error('Error in ReviewModel.getReviewsByUser:', error);
      throw error;
    }
  }
}

module.exports = ReviewModel;