import axios from 'axios';

// Use Vite proxy in development (relative URL) or environment variable for production
const API_BASE_URL = import.meta.env.VITE_API_TARGET 
  ? `${import.meta.env.VITE_API_TARGET}/api` 
  : '/api'; // Use relative URL to leverage Vite proxy in development

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // You can remove withCredentials: true, as it's not needed without cookies
});

// Request Interceptor to add the token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      // Your verifyToken middleware expects "Bearer <token>"
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor to handle errors gracefully
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Public endpoints that don't require authentication
    // These endpoints are public according to the API routes
    const url = error.config?.url || '';
    const isPublicEndpoint = 
      url.includes('/exhibits') || 
      url.includes('/exhibitions') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/verify-email');
    
    // For public endpoints, don't log 401 errors as they shouldn't require auth
    // If a 401 occurs on a public endpoint, it might be a server configuration issue
    if (error.response?.status === 401) {
      if (isPublicEndpoint) {
        // Public endpoint returned 401 - this shouldn't happen, but don't spam console
        // Silently handle it since these endpoints are public
        console.debug('Public endpoint returned 401 (may indicate server issue):', url);
      } else {
        // Protected endpoint returned 401 - user needs to authenticate
        // Only log if it's not a known public endpoint to avoid noise
        const errorMessage = error.response?.data?.error || 'Unauthorized';
        console.warn('401 Unauthorized on protected endpoint:', url, errorMessage);
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;




