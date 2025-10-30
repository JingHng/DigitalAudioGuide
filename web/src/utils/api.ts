// API utility with automatic token refresh
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const auth = localStorage.getItem('auth');
  if (!auth) {
    window.location.href = '/login';
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
        window.location.href = '/login';
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
