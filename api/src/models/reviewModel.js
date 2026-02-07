// models/reviewModel.js - Fixed version
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

// Lightweight lexicon for sentiment estimation without external dependencies
const POSITIVE_LEXICON = ['good', 'great', 'excellent', 'amazing', 'love', 'like', 'helpful', 'enjoy', 'wonderful', 'awesome', 'fantastic', 'pleasant', 'satisfied'];
const NEGATIVE_LEXICON = ['bad', 'poor', 'terrible', 'awful', 'hate', 'dislike', 'disappointed', 'boring', 'waste', 'slow', 'rude', 'confusing', 'crowded', 'dirty', 'noisy'];

class ReviewModel {
  // Build WHERE clause and params for list/analytics queries
  static buildWhereClause(filters = {}) {
    const {
      exhibit_id,
      user_id,
      min_rating,
      max_rating,
      search,
      status,
      start_date,
      end_date
    } = filters;

    const whereConditions = [];
    const params = [];
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

    if (status === 'hidden') {
      whereConditions.push('f.is_hidden = true');
    } else if (status === 'shown') {
      whereConditions.push('f.is_hidden = false');
    }

    if (start_date) {
      whereConditions.push(`f.created_at >= $${paramIndex}`);
      params.push(new Date(start_date));
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`f.created_at <= $${paramIndex}`);
      params.push(new Date(end_date));
      paramIndex++;
    }

    if (search && search.trim() !== '') {
      whereConditions.push(`(
          LOWER(u.username) LIKE $${paramIndex} OR
          LOWER(e.title) LIKE $${paramIndex} OR
          LOWER(f.description) LIKE $${paramIndex}
        )`);
      params.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    return { whereClause, params, paramIndex };
  }
  // Toggle isHidden for a review
  static async toggleReviewHidden(reviewId) {
    try {
      // Get current value
      const review = await prisma.feedback.findUnique({
        where: { feedbackId: BigInt(reviewId) },
      });
      if (!review) throw new Error('Review not found');
      const newIsHidden = !(review.isHidden ?? review.is_hidden);
      const updated = await prisma.feedback.update({
        where: { feedbackId: BigInt(reviewId) },
        data: { isHidden: newIsHidden, updatedAt: new Date() },
        include: {
          user: { select: { userId: true, username: true, email: true } },
          exhibit: { select: { exhibitId: true, title: true, description: true } },
        },
      });
      // Transform the response
      return {
        feedback_id: Number(updated.feedbackId),
        user_id: Number(updated.userId),
        exhibit_id: Number(updated.exhibitId),
        rating: updated.rating,
        comment: updated.description,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
        is_hidden: updated.isHidden,
        user: {
          user_id: Number(updated.user.userId),
          username: updated.user.username,
          email: updated.user.email,
        },
        exhibit: {
          exhibit_id: Number(updated.exhibit.exhibitId),
          title: updated.exhibit.title,
          description: updated.exhibit.description,
        },
      };
    } catch (error) {
      console.error('Error in ReviewModel.toggleReviewHidden:', error);
      throw error;
    }
  }
  
  // Get all reviews with pagination and filtering
  static async getAllReviews(filters, pagination, sorting) {
    try {
      const { skip, take } = pagination;
      const { sort_by, sort_order } = sorting;
      const { whereClause, params, paramIndex } = ReviewModel.buildWhereClause(filters);

      // Build ORDER BY clause
      const fieldMap = {
        'created_at': 'f.created_at',
        'updated_at': 'f.updated_at',
        'rating': 'f.rating',
        'username': 'u.username',
        'exhibitName': 'e.title'
      };
      const orderField = fieldMap[sort_by] || 'f.created_at';
      const orderDirection = sort_order === 'asc' ? 'ASC' : 'DESC';

      // Always join user (u) and exhibit (e) for search to work
      const baseFrom = `FROM feedback f
        LEFT JOIN "user" u ON f.user_id = u.user_id
        LEFT JOIN exhibit e ON f.exhibit_id = e.exhibit_id
        LEFT JOIN exhibitions ex ON e.exhibition_id = ex.exhibition_id`;

      const reviewsQuery = `
        SELECT 
          f.feedback_id, f.user_id, f.exhibit_id, f.rating, f.description, f.created_at, f.updated_at,
          u.username, u.email,
          e.title as exhibit_title, e.description as exhibit_description,
          ex.title as exhibition_title
        ${baseFrom}
        ${whereClause}
        ORDER BY ${orderField} ${orderDirection}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(take, skip);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        ${baseFrom}
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

  // Aggregate analytics for admin dashboard
  static async getReviewAnalytics(filters = {}) {
    try {
      const { whereClause, params } = ReviewModel.buildWhereClause(filters);
      const baseFrom = `FROM feedback f
        LEFT JOIN "user" u ON f.user_id = u.user_id
        LEFT JOIN exhibit e ON f.exhibit_id = e.exhibit_id
        LEFT JOIN exhibitions ex ON e.exhibition_id = ex.exhibition_id`;

      const summaryQuery = `
        SELECT 
          COUNT(*)::int as total_reviews,
          COALESCE(AVG(f.rating), 0)::float as average_rating,
          COUNT(*) FILTER (WHERE f.is_hidden = true)::int as hidden_count,
          COUNT(*) FILTER (WHERE f.is_hidden = false)::int as shown_count,
          COUNT(*) FILTER (WHERE f.description IS NOT NULL AND TRIM(f.description) <> '')::int as commented_count
        ${baseFrom}
        ${whereClause}
      `;

      const distributionQuery = `
        SELECT f.rating as rating, COUNT(*)::int as count
        ${baseFrom}
        ${whereClause}
        GROUP BY f.rating
      `;

      const timelineQuery = `
        SELECT 
          DATE_TRUNC('week', f.created_at) AS bucket,
          COUNT(*)::int as count,
          COALESCE(AVG(f.rating), 0)::float as avg_rating
        ${baseFrom}
        ${whereClause}
        GROUP BY bucket
        ORDER BY bucket ASC
      `;

      const categoryQuery = `
        SELECT 
          COALESCE(e.title, 'Unassigned') AS exhibit_title,
          e.exhibit_id,
          COUNT(*)::int AS review_count,
          COALESCE(AVG(f.rating), 0)::float AS avg_rating
        ${baseFrom}
        ${whereClause}
        GROUP BY e.exhibit_id, e.title
        ORDER BY review_count DESC
        LIMIT 8
      `;

      const sentimentClause = whereClause
        ? `${whereClause} AND f.description IS NOT NULL AND TRIM(f.description) <> ''`
        : "WHERE f.description IS NOT NULL AND TRIM(f.description) <> ''";

      const sentimentQuery = `
        SELECT f.feedback_id, f.description
        ${baseFrom}
        ${sentimentClause}
        ORDER BY f.created_at DESC
        LIMIT 250
      `;

      const [summaryRows, distributionRows, timelineRows, categoryRows, sentimentRows] = await Promise.all([
        prisma.$queryRawUnsafe(summaryQuery, ...params),
        prisma.$queryRawUnsafe(distributionQuery, ...params),
        prisma.$queryRawUnsafe(timelineQuery, ...params),
        prisma.$queryRawUnsafe(categoryQuery, ...params),
        prisma.$queryRawUnsafe(sentimentQuery, ...params)
      ]);

      const summary = Array.isArray(summaryRows) && summaryRows.length ? summaryRows[0] : {};
      const totalReviews = Number(summary.total_reviews || 0);
      const commentedCount = Number(summary.commented_count || 0);

      const normalizedDistribution = [];
      const distributionList = Array.isArray(distributionRows) ? distributionRows : [];
      for (let i = 1; i <= 5; i++) {
        const bucket = distributionList.find((row) => Number(row.rating) === i);
        normalizedDistribution.push({ rating: i, count: bucket ? Number(bucket.count) : 0 });
      }

      const timeline = (Array.isArray(timelineRows) ? timelineRows : []).map((row) => ({
        bucket: row.bucket,
        count: Number(row.count),
        avg_rating: parseFloat(row.avg_rating)
      }));

      const categories = (Array.isArray(categoryRows) ? categoryRows : []).map((row) => ({
        exhibit_id: row.exhibit_id ? Number(row.exhibit_id) : null,
        exhibit_title: row.exhibit_title || 'Unassigned',
        review_count: Number(row.review_count),
        avg_rating: parseFloat(row.avg_rating)
      }));

      const sentiment = ReviewModel.computeSentimentMetrics(sentimentRows || []);

      const responseBreakdown = {
        with_comment: commentedCount,
        rating_only: Math.max(totalReviews - commentedCount, 0)
      };

      return {
        summary: {
          total_reviews: totalReviews,
          average_rating: parseFloat(summary.average_rating || 0),
          hidden_count: Number(summary.hidden_count || 0),
          shown_count: Number(summary.shown_count || 0),
          commented_count: commentedCount,
          response_rate: totalReviews ? commentedCount / totalReviews : 0
        },
        rating_distribution: normalizedDistribution,
        timeline,
        categories,
        sentiment,
        response_breakdown: responseBreakdown,
        fields: {
          core: ['feedback_id', 'rating', 'comment', 'created_at', 'updated_at', 'user_id', 'exhibit_id', 'is_hidden'],
          derived: ['response_status', 'has_comment', 'text_length', 'sentiment_score']
        }
      };
    } catch (error) {
      console.error('Error in ReviewModel.getReviewAnalytics:', error);
      throw error;
    }
  }

  // Simple sentiment scoring for short texts
  static computeSentimentScore(text) {
    if (!text) return 0;
    const tokens = text
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) return 0;

    let score = 0;
    tokens.forEach((token) => {
      if (POSITIVE_LEXICON.includes(token)) score += 1;
      if (NEGATIVE_LEXICON.includes(token)) score -= 1;
    });

    // Normalize by token length to keep scores in a manageable range
    return score / tokens.length;
  }

  static computeSentimentMetrics(rows) {
    if (!rows || rows.length === 0) {
      return { average_score: 0, positive: 0, neutral: 0, negative: 0, sample_size: 0 };
    }

    let aggregateScore = 0;
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    rows.forEach((row) => {
      const score = ReviewModel.computeSentimentScore(row.description || '');
      aggregateScore += score;
      if (score > 0.05) {
        positive += 1;
      } else if (score < -0.05) {
        negative += 1;
      } else {
        neutral += 1;
      }
    });

    const sampleSize = rows.length;

    return {
      average_score: sampleSize ? aggregateScore / sampleSize : 0,
      positive,
      neutral,
      negative,
      sample_size: sampleSize
    };
  }

  // Get review by ID
  static async getReviewById(reviewId) {
    try {
      if (reviewId === undefined || reviewId === null || reviewId === "" || isNaN(Number(reviewId))) {
        throw new Error('ReviewModel.getReviewById: reviewId is required and must be a valid number');
      }
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