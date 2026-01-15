// API utility with automatic token refresh
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth = localStorage.getItem('auth');
  if (!auth) {
    localStorage.removeItem('auth');
    throw new Error('Not authenticated');
  }

  const { accessToken, refreshToken } = JSON.parse(auth);

  // Add authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
  };

  // Make the request
  let response = await fetch(url, { ...options, headers });

  // If unauthorized, try to refresh token
  if (response.status === 401) {
    try {
      const refreshResponse = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!refreshResponse.ok) {
        // Refresh failed, logout
        localStorage.removeItem('auth');
        throw new Error('Session expired');
      }

      const { accessToken: newAccessToken } = await refreshResponse.json();

      // Update stored auth with new access token
      const updatedAuth = JSON.parse(localStorage.getItem('auth') || '{}');
      updatedAuth.accessToken = newAccessToken;
      localStorage.setItem('auth', JSON.stringify(updatedAuth));

      // Retry original request with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(url, { ...options, headers });
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  return response;
}

// --- Convenience functions used by components ---
import apiClient from './apiClient';

export async function fetchExhibitReviews(exhibitId: string | number, opts: { page?: number; limit?: number; rating?: number; sortByComment?: boolean } = {}) {
  const { page = 1, limit = 5, rating, sortByComment } = opts;
  const params = new URLSearchParams();
  params.append('page', String(page));
  params.append('limit', String(limit));
  if (rating) params.append('min_rating', String(rating));
  if (sortByComment) params.append('sort_by', 'comment');

  const res = await apiClient.get(`/reviews?${params.toString()}&exhibit_id=${exhibitId}`);
  return res.data.data;
}

export async function fetchExhibitRating(exhibitId: string | number) {
  const res = await apiClient.get(`/reviews/exhibit/${exhibitId}/stats`);
  // Expecting { success: true, data: { average_rating: x, ... } }
  return res.data.data?.average_rating || 0;
}

export async function submitExhibitReview(exhibitId: string | number, rating: number, description: string | null, userId: number | string) {
  const payload = {
    user_id: userId,
    exhibit_id: exhibitId,
    rating,
    comment: description || null,
  };
  const res = await apiClient.post('/reviews', payload);
  return res.data;
}
