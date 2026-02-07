import React, { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Star, 
  MessageSquare, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Layout, 
  Landmark, 
  Clock, 
  Lock, 
  Loader2 
} from 'lucide-react';
import '../css/UserReviews.css';

const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [showOnlyWithComments, setShowOnlyWithComments] = useState<boolean>(false);

  const fetchReviews = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(p));
      params.append('limit', String(perPage));
      if (user && user.userId) params.append('user_id', String(user.userId));
      
      if (ratingFilter) {
        params.append('min_rating', String(ratingFilter));
        params.append('max_rating', String(ratingFilter));
      }
      
      const res = await apiClient.get(`/reviews?${params.toString()}`);
      const data = res.data?.data;
      let fetched = data?.reviews || [];
      
      // Frontend filter for comments if backend doesn't support it
      if (showOnlyWithComments) {
        fetched = fetched.filter((r: any) => r.comment && String(r.comment).trim().length > 0);
      }
      
      setReviews(fetched);
      setPage(data?.pagination?.current_page || p);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchReviews(1);
  }, [user, ratingFilter, showOnlyWithComments]);

  if (!user) {
    return (
      <div className="auth-lock-container">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="auth-lock-card"
        >
          <div className="lock-icon-wrapper">
             <Lock size={40} color="#f59e0b" />
          </div>
          <h2>Authentication Required</h2>
          <p>Please sign in to access and manage exhibit reviews.</p>
          <div className="auth-lock-actions">
            <a href="/login" className="btn-primary-ref">Sign In Now</a>
            <a href="/" className="btn-secondary-ref">Back to Home</a>
          </div>
        </motion.div>
      </div>
    );
  }

  // Helper for rendering page numbers with ellipsis
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxPageButtons = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, page + 2);

    if (end - start < maxPageButtons - 1) {
      if (start === 1) {
        end = Math.min(totalPages, start + maxPageButtons - 1);
      } else if (end === totalPages) {
        start = Math.max(1, end - maxPageButtons + 1);
      }
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    return (
      <footer className="pagination-footer">
        <button className="page-btn" onClick={() => fetchReviews(1)} disabled={page === 1} title="First Page">
          <ChevronLeft size={14} style={{ marginRight: -4 }} />
          <ChevronLeft size={14} />
        </button>
        <button className="page-btn" onClick={() => fetchReviews(page - 1)} disabled={page <= 1} title="Previous Page">
          <ChevronLeft size={18} />
        </button>
        {start > 1 && <span className="page-info">...</span>}
        {pageNumbers.map((num) => (
          <button
            key={num}
            className={`page-btn${num === page ? ' active' : ''}`}
            onClick={() => fetchReviews(num)}
            disabled={num === page}
            aria-current={num === page ? 'page' : undefined}
          >
            {num}
          </button>
        ))}
        {end < totalPages && <span className="page-info">...</span>}
        <button className="page-btn" onClick={() => fetchReviews(page + 1)} disabled={page >= totalPages} title="Next Page">
          <ChevronRight size={18} />
        </button>
        <button className="page-btn" onClick={() => fetchReviews(totalPages)} disabled={page === totalPages} title="Last Page">
          <ChevronRight size={14} />
          <ChevronRight size={14} style={{ marginLeft: -4 }} />
        </button>
        <span className="page-info">Page <strong>{page}</strong> of {totalPages}</span>
      </footer>
    );
  };

  return (
    <div className="reviews-master-container">
      <header className="reviews-header">
        <div className="header-title-group">
          <h1>Visitor Feedback</h1>
          <p>Monitor ratings and comments left by visitors across all exhibits.</p>
        </div>
      </header>

      {/* FILTERS BAR */}
      <section className="filters-bar-card">
        <div className="filter-group">
          <label className="filter-label"><Filter size={14} /> Rating Filter</label>
          <div className="rating-pill-container">
            <button 
              className={`pill ${ratingFilter === null ? 'active' : ''}`} 
              onClick={() => { setRatingFilter(null); setPage(1); }}
            >All</button>
            {[1, 2, 3, 4, 5].map((r) => (
              <button 
                key={r} 
                className={`pill ${ratingFilter === r ? 'active' : ''}`} 
                onClick={() => { setRatingFilter(r); setPage(1); }}
              >
                {r} <Star size={12} fill={ratingFilter === r ? "white" : "currentColor"} />
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group toggle-group">
          <span className="filter-label"><MessageSquare size={14} /> Only with comments</span>
          <label className="smart-switch">
            <input 
              type="checkbox" 
              checked={showOnlyWithComments} 
              onChange={e => { setShowOnlyWithComments(e.target.checked); setPage(1); }} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </section>

      {/* REVIEWS LIST */}
      <div className="reviews-list-wrapper">
        {loading ? (
          <div className="loading-state-ref">
            <Loader2 className="animate-spin" size={32} />
            <p>Fetching latest reviews...</p>
          </div>
        ) : error ? (
          <div className="error-state-ref">{error}</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state-ref">No reviews found matching your criteria.</div>
        ) : (
          <motion.div layout className="reviews-grid">
            <AnimatePresence mode='popLayout'>
              {reviews.map((r) => (
                <motion.div 
                  key={r.feedback_id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="review-card-item"
                >
                  <div className="card-top">
                    <div className="user-info">
                      <div className="user-avatar">
                        <User size={16} />
                      </div>
                      <div>
                        <span className="username">{r.user?.username || `User ${r.user_id}`}</span>
                        <div className="timestamp">
                          <Clock size={10} /> {r.created_at ? new Date(r.created_at).toLocaleDateString() : 'Recently'}
                        </div>
                      </div>
                    </div>
                    <div className="rating-badge">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          fill={i < (r.rating || 0) ? "#f5b301" : "none"} 
                          stroke={i < (r.rating || 0) ? "#f5b301" : "#cbd5e1"} 
                        />
                      ))}
                    </div>
                  </div>

                  <div className="card-meta">
                    <div className="meta-item"><Layout size={12} /> {r.exhibit?.title || 'Exhibit'}</div>
                    <div className="meta-item"><Landmark size={12} /> {r.exhibition?.title || 'General'}</div>
                  </div>

                  {r.comment && (
                    <div className="comment-bubble">
                      <p>{r.comment}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* PAGINATION */}
      {!loading && reviews.length > 0 && renderPagination()}
    </div>
  );
};

export default ReviewsPage;