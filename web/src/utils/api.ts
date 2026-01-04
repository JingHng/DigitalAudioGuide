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
  return data.rating ?? 0;
}

export async function fetchExhibitRating(exhibitId: string): Promise<number> {
  const res = await fetch(`/api/reviews/exhibit/${exhibitId}/rating`);
  if (!res.ok) throw new Error("Failed to fetch exhibit rating");
  const data = await res.json();
  return data.rating ?? 0;
}

export async function fetchExhibitReviews(exhibitId: string): Promise<any[]> {
  const res = await fetch(`/api/reviews/exhibit/${exhibitId}`);
  if (!res.ok) throw new Error("Failed to fetch exhibit reviews");
  return await res.json();
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
