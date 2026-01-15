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

// --- Review & Rating API helpers ---

export async function fetchExhibitionRating(exhibitionId: string): Promise<number> {
  const res = await fetch(`/api/reviews/exhibition/${exhibitionId}/rating`);
  if (!res.ok) throw new Error("Failed to fetch exhibition rating");
  const data = await res.json();
  // Support various backend response shapes
  if (typeof data === 'number') return data;
  if (data && typeof data.average_rating === 'number') return data.average_rating;
  if (data && data.data && typeof data.data.average_rating === 'number') return data.data.average_rating;
  if (data && typeof data.rating === 'number') return data.rating;
  return 0;
}

export async function fetchExhibitRating(exhibitId: string): Promise<number> {
  const res = await fetch(`/api/reviews/exhibit/${exhibitId}/rating`);
  if (!res.ok) throw new Error("Failed to fetch exhibit rating");
  const data = await res.json();
  // Support various backend response shapes
  if (typeof data === 'number') return data;
  if (data && typeof data.average_rating === 'number') return data.average_rating;
  if (data && data.data && typeof data.data.average_rating === 'number') return data.data.average_rating;
  if (data && typeof data.rating === 'number') return data.rating;
  return 0;
}

export async function fetchExhibitReviews(
  exhibitId: string,
  options?: { page?: number; limit?: number; rating?: number; sortByComment?: boolean }
): Promise<{ reviews: any[]; pagination: any }> {
  const params = new URLSearchParams();
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));
  if (options?.rating) params.append('rating', String(options.rating));
  if (options?.sortByComment) params.append('sortByComment', 'true');
  const res = await fetch(`/api/reviews/exhibit/${exhibitId}?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch exhibit reviews");
  const data = await res.json();
  if (data && data.data && data.data.reviews) {
    return { reviews: data.data.reviews, pagination: data.data.pagination };
  }
  // fallback for legacy
  return { reviews: [], pagination: { current_page: 1, per_page: 10, total: 0, total_pages: 1 } };
}

export async function submitExhibitReview(
  exhibitId: string,
  rating: number,
  description?: string,
  userId?: string
): Promise<any> {
  // userId should be provided by the caller (from auth context or similar)
  if (!userId) throw new Error("User ID required to submit review");
  const res = await authFetch(`/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      exhibit_id: exhibitId,
      rating,
      comment: description,
    }),
  });
  if (!res.ok) throw new Error("Failed to submit review");
  return await res.json();
}
