// Configuração da API
// Em desenvolvimento (npm start): usa o proxy configurado no package.json
// Em produção (Docker/NGINX): usa o proxy do NGINX configurado no Dockerfile
// Produção standalone: usa a variável de ambiente REACT_APP_API_URL

import axios from 'axios';

const getApiUrl = () => {
  // Em produção com Docker/NGINX, SEMPRE usar caminho relativo (proxy do NGINX)
  // O NGINX já está configurado para fazer proxy de /api/ para o backend
  if (process.env.NODE_ENV === 'production') {
    // Retornar string vazia para usar proxy (NGINX ou React Dev Server)
    return '';
  }
  
  // Em desenvolvimento, retorna string vazia para usar o proxy do package.json
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  
  // Fallback (não deve ser usado)
  return '';
};

export const API_URL = getApiUrl();

// Configuração do axios
if (API_URL) {
  axios.defaults.baseURL = API_URL;
  console.log('🔧 API configurada para:', API_URL);
} else {
  console.log('🔧 Usando proxy (NGINX em produção, React Dev Server em desenvolvimento)');
}

// Interceptor para tratar erros 401 (apenas para rotas de autenticação)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratar apenas erros 401 em rotas específicas
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Se for rota de autenticação, não fazer logout automático
      if (url.includes('/api/auth/') || url.includes('/api/signatures/')) {
        console.log('🔐 Erro 401 em rota de autenticação, não fazendo logout automático');
        return Promise.reject(error);
      }
      
      // Para outras rotas, fazer logout
      console.log('🔐 Erro 401, fazendo logout automático');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default axios;

