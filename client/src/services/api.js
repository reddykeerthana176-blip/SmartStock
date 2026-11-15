import axios from 'axios';
import { cacheProductsOffline } from '../offline/indexedDB';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Cache products & handle authentication expiry
api.interceptors.response.use(
  (response) => {
    // If fetching products list, passively cache them into IndexedDB for offline resilience
    if (
      response.config.url &&
      response.config.url.includes('/products') &&
      response.config.method === 'get' &&
      response.data?.data &&
      Array.isArray(response.data.data)
    ) {
      cacheProductsOffline(response.data.data);
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired and not on login page
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('business');
        window.location.href = '/login?sessionExpired=true';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
