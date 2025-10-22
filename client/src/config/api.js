import axios from 'axios';

const STORAGE_KEY = 'sa.token';

// Configuração do axios
const api = axios.create({
  baseURL: '/api', // mesma origem via NGINX
  withCredentials: false,
});

console.log('🔧 API configurada para:', '/api');

// Interceptor para injetar Authorization sempre que houver token salvo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros 401 (apenas para rotas críticas)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratar apenas erros 401 em rotas críticas
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Logout só quando 401 vier de rotas críticas de autenticação
      if (url.includes('/api/auth/me') || url.includes('/api/auth/refresh')) {
        console.log('🔐 Erro 401 crítico, fazendo logout automático');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('sa.user');
        window.location.href = '/login';
      } else {
        console.log('🔐 Erro 401 não-crítico, não fazendo logout');
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;