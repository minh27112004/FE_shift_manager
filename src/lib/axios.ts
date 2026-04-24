import axios from 'axios';
import { toast } from './toast';


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
    const method = response.config.method?.toLowerCase() ?? '';
    const successMsg = response.data?.detail || response.data?.message;
    if (!SILENT_METHODS.has(method) && successMsg) {
      toast.success(successMsg);
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
    
    // Auto-toast lỗi từ BE
    if (error.response) {
      const data = error.response.data;
      const status = error.response.status;
      const msg =
        data?.detail ||
        data?.non_field_errors?.[0] ||
        (typeof data === 'string' ? data : null) ||
        (status === 403 ? 'Bạn không có quyền thực hiện thao tác này.' : null) ||
        (status === 404 ? 'Không tìm thấy tài nguyên.' : null) ||
        (status >= 500 ? 'Lỗi máy chủ. Vui lòng thử lại sau.' : null) ||
        'Đã có lỗi xảy ra.';
      toast.error(msg);
    }

    return Promise.reject(error);
  }
);

export default api;
