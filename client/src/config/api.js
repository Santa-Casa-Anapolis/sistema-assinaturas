// Configuração da API
// Em desenvolvimento (npm start): usa o proxy configurado no package.json
// Em produção (npm run build): usa a variável de ambiente REACT_APP_API_URL

import axios from 'axios';

const getApiUrl = () => {
  // Se estiver em produção e REACT_APP_API_URL estiver definida, usa ela
  if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Em desenvolvimento, retorna string vazia para usar o proxy
  if (process.env.NODE_ENV === 'development') {
    return '';
  }
  
  // Fallback para produção sem variável de ambiente
  return 'http://172.16.0.219:5000';
};

export const API_URL = getApiUrl();

// Configuração do axios
if (API_URL) {
  axios.defaults.baseURL = API_URL;
  console.log('🔧 API configurada para:', API_URL);
} else {
  console.log('🔧 Usando proxy do React (desenvolvimento)');
}

export default axios;

