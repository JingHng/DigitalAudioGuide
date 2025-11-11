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

// The response interceptor is completely gone!

export default apiClient;


