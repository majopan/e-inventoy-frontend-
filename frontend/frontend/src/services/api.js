import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/',
});

// Interceptor para agregar el token a las solicitudes
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => Promise.reject(error));

// Interceptor para manejar respuestas de error
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Evitar reintento infinito
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        
        const response = await axios.post(`${api.defaults.baseURL}auth/refresh/`, { 
          refresh: refreshToken 
        });
        
        const newToken = response.data.access;
        sessionStorage.setItem('token', newToken);
        localStorage.setItem('token', newToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed:', refreshError);
        // Limpiar almacenamiento y redirigir
        sessionStorage.clear();
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;