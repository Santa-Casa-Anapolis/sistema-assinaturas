import axios from 'axios';

const STORAGE_KEY = 'sa.token';

// Configuração do axios
const api = axios.create({
  baseURL: '/api', // mesma origem via NGINX
  withCredentials: true,
  timeout: 10000,
});


// Interceptor para injetar Authorization sempre que houver token salvo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Tratar erros 401 e 403
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Logout só quando 401 vier de rotas críticas de autenticação
      if (url.includes('/api/auth/me') || url.includes('/api/auth/refresh')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('sa.user');
        window.location.href = '/login';
      }
    }
    
    if (error.response?.status === 403) {
      // Se for erro 403, pode ser token inválido
      const url = error.config?.url || '';
      if (url.includes('/api/auth/me') || url.includes('/api/auth/refresh')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('sa.user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;