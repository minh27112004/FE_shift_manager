import axios from 'axios';
import { toast } from './toast';

// Methods whose success responses should NOT auto-toast (GET = read-only, no message needed)
const SILENT_METHODS = new Set(['get', 'head', 'options']);

const baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    // Auto-toast khi BE trả về `detail` trong response thành công (POST/PUT/PATCH/DELETE)
    const method = response.config.method?.toLowerCase() ?? '';
    if (!SILENT_METHODS.has(method) && response.data?.detail) {
      toast.success(response.data.detail);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('auth/login/')) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(`${baseURL}auth/refresh/`, {
          refresh: refreshToken
        });
        
        const newAccessToken = response.data.access;
        localStorage.setItem('access_token', newAccessToken);

        if (response.data.refresh) {
            localStorage.setItem('refresh_token', response.data.refresh);
        }
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
