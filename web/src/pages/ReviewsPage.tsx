import React, { useEffect, useState } from 'react';
import apiClient from '../utils/apiClient';
import { useAuth } from '../contexts/AuthContext';

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
        // Request exact rating matches by setting both min and max to the same value
        params.append('min_rating', String(ratingFilter));
        params.append('max_rating', String(ratingFilter));
      }
      const res = await apiClient.get(`/reviews?${params.toString()}`);
      const data = res.data?.data;
      let fetched = data?.reviews || [];
      if (showOnlyWithComments) {
        fetched = fetched.filter((r: any) => r.comment && String(r.comment).trim().length > 0);
      }
      setReviews(fetched);
      setPage(data?.pagination?.current_page || p);
      setTotalPages(data?.pagination?.total_pages || 1);
    } catch (err: any) {
      console.error('Failed to load reviews', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    // Reset to first page when filters change
    setPage(1);
    fetchReviews(1);
  }, [user, ratingFilter, showOnlyWithComments]);

  // If user is not logged in, block viewing the reviews
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 py-16">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-amber-50 dark:bg-amber-900/20 text-4xl mb-6">🛑</div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">You can only view reviews if you are logined</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Please sign in to access your reviews and manage them.</p>
          <div className="flex items-center justify-center gap-4">
            <a href="/" className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">Browse Products</a>
            <a href="/login" className="px-4 py-2 rounded-md bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-700 text-sm font-medium">Sign In</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 24 }}>
      <h1>Reviews</h1>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <>
          {!user && (
            <div style={{ padding: 20, background: '#fff8e6', borderRadius: 6, marginBottom: 12 }}>
              Please log in to view your reviews.
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: '#f3f4f8', borderRadius: 24, boxShadow: '0 1px 4px #eee', overflow: 'hidden' }}>
              <button
                onClick={() => { setRatingFilter(null); setPage(1); }}
                style={{
                  padding: '8px 18px',
                  background: ratingFilter === null ? '#007bff' : 'transparent',
                  color: ratingFilter === null ? '#fff' : '#444',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '1em',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  borderRadius: '24px 0 0 24px',
                  outline: 'none',
                }}
              >All</button>
              {[1,2,3,4,5].map((r, i) => (
                <button
                  key={r}
                  onClick={() => { setRatingFilter(r); setPage(1); }}
                  style={{
                    padding: '8px 18px',
                    background: ratingFilter === r ? '#007bff' : 'transparent',
                    color: ratingFilter === r ? '#fff' : '#444',
                    border: 'none',
                    fontWeight: 500,
                    fontSize: '1em',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    borderRadius: i === 4 ? '0 24px 24px 0' : '0',
                    outline: 'none',
                  }}
                >{r}★</button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Show Only Reviews With Comments/Description</span>
              <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24 }}>
                <input
                  type="checkbox"
                  checked={showOnlyWithComments}
                  onChange={e => { setShowOnlyWithComments(e.target.checked); setPage(1); }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: showOnlyWithComments ? '#007bff' : '#ccc',
                  borderRadius: 24,
                  transition: 'background 0.2s',
                  display: 'block',
                }}></span>
                <span style={{
                  position: 'absolute',
                  left: showOnlyWithComments ? 22 : 2,
                  top: 2,
                  width: 20,
                  height: 20,
                  background: '#fff',
                  borderRadius: '50%',
                  boxShadow: '0 1px 4px #aaa',
                  transition: 'left 0.2s',
                  display: 'block',
                }}></span>
              </label>
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {reviews.map((r) => (
              <li key={r.feedback_id} style={{ background: '#fff', padding: 12, marginBottom: 12, borderRadius: 6, boxShadow: '0 1px 4px #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{r.user?.username || `User ${r.user_id}`}</strong>
                    <div style={{ fontSize: 12, color: '#666' }}>{r.exhibit?.title || `Exhibit ${r.exhibit_id}`}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Exhibition: {r.exhibition?.title || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#f5b301', fontSize: 18 }}>{'★'.repeat(Math.max(0, Math.min(5, r.rating || 0)))}</div>
                    <div style={{ fontSize: 12, color: '#999' }}>{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</div>
                  </div>
                </div>
                {r.comment && <p style={{ marginTop: 8 }}>{r.comment}</p>}
              </li>
            ))}
          </ul>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 12 }}>
            <button onClick={() => fetchReviews(Math.max(1, page - 1))} disabled={page <= 1}>Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => fetchReviews(Math.min(totalPages, page + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewsPage;
