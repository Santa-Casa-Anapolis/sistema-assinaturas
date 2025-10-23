import axios from 'axios';

const STORAGE_KEY = 'sa.token';

// Configuração do axios
const api = axios.create({
  baseURL: '/api', // mesma origem via NGINX
  withCredentials: true,
  timeout: 10000,
});

console.log('🔧 API configurada para:', '/api');

// Interceptor para injetar Authorization sempre que houver token salvo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  console.log('🔐 Request interceptor - Token:', token ? 'presente' : 'ausente');
  
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log('🔐 Authorization header adicionado:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.log('⚠️ Token ausente - requisição sem autenticação');
  }
  
  return config;
}, (error) => {
  console.error('❌ Erro no request interceptor:', error);
  return Promise.reject(error);
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response interceptor - Status:', response.status, response.config?.url);
    return response;
  },
  (error) => {
    console.log('❌ Response interceptor - Erro:', error.response?.status, error.config?.url);
    console.log('❌ Response interceptor - Detalhes:', error.response?.data);
    
    // Tratar erros 401 e 403
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
    
    if (error.response?.status === 403) {
      console.log('🔐 Erro 403 - Token inválido ou sem permissão');
      console.log('🔐 Token atual:', localStorage.getItem(STORAGE_KEY) ? 'presente' : 'ausente');
      
      // Se for erro 403, pode ser token inválido
      const url = error.config?.url || '';
      if (url.includes('/api/auth/me') || url.includes('/api/auth/refresh')) {
        console.log('🔐 Erro 403 crítico, fazendo logout automático');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('sa.user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;