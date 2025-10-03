import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import axios from 'axios';

// Configuração de API para ambiente local/implantado
const HOST = window.location?.hostname || 'localhost';
const API_BASE = process.env.REACT_APP_API_URL || window.API_BASE || `http://${HOST}:4000`;
window.API_BASE = API_BASE;
axios.defaults.baseURL = API_BASE;

// Monkeypatch do fetch para redirecionar chamadas para o backend local
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  try {
    // Se for uma URL string
    if (typeof input === 'string') {
      // Ajustar chamadas relativas para /api
      if (input.startsWith('/api')) {
        return originalFetch(`${API_BASE}${input}`, init);
      }
      // Ajustar chamadas absolutas apontando para 5000
      if (input.startsWith('http://localhost:5000/api')) {
        const path = input.replace('http://localhost:5000', '');
        return originalFetch(`${API_BASE}${path}`, init);
      }
      if (input.startsWith('http://127.0.0.1:5000/api')) {
        const path = input.replace('http://127.0.0.1:5000', '');
        return originalFetch(`${API_BASE}${path}`, init);
      }
      // Caso padrão
      return originalFetch(input, init);
    }

    // Se for um objeto Request
    if (input && typeof input === 'object' && 'url' in input) {
      const url = input.url;
      if (url.startsWith('/api')) {
        const req = new Request(`${API_BASE}${url}`, input);
        return originalFetch(req, init);
      }
      if (url.startsWith('http://localhost:5000/api')) {
        const path = url.replace('http://localhost:5000', '');
        const req = new Request(`${API_BASE}${path}`, input);
        return originalFetch(req, init);
      }
      if (url.startsWith('http://127.0.0.1:5000/api')) {
        const path = url.replace('http://127.0.0.1:5000', '');
        const req = new Request(`${API_BASE}${path}`, input);
        return originalFetch(req, init);
      }
      return originalFetch(input, init);
    }
  } catch (e) {
    // Em caso de erro inesperado, cair no fetch original
    return originalFetch(input, init);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
