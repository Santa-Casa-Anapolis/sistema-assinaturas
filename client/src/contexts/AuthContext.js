import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// O proxy está configurado no package.json para http://localhost:5000
// Não definimos baseURL aqui para usar o proxy do React

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Função assíncrona para verificar token
    const checkAuth = async () => {
      // Verificar se há token salvo e se é válido
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (!token || !savedUser) {
        console.log('🔐 Nenhum token encontrado - redirecionando para login');
        setUser(null);
        setLoading(false);
        return;
      }
      
      try {
        // Verificar se o token não expirou
        const userData = JSON.parse(savedUser);
        const now = Date.now();
        
        // Se o token tem exp (expiration), verificar se não expirou
        if (userData.exp && userData.exp * 1000 < now) {
          console.log('🔐 Token expirado, limpando dados...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setLoading(false);
          return;
        }
        
        console.log('🔐 Token válido, carregando usuário...');
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Verificar se o token ainda é válido fazendo uma requisição de teste
        try {
          const testResponse = await axios.get('/api/auth/verify', {
            timeout: 5000 // 5 segundos de timeout
          });
          if (testResponse.status !== 200) {
            throw new Error('Token inválido');
          }
          console.log('✅ Token verificado com sucesso');
        } catch (verifyError) {
          console.log('❌ Token inválido na verificação, limpando dados...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          delete axios.defaults.headers.common['Authorization'];
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados do usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  // Limpar dados quando a aba for fechada (apenas quando realmente fechando a aba)
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Só limpar se for realmente o fechamento da aba, não navegação interna
      if (event.type === 'beforeunload') {
        console.log('🔐 Aba sendo fechada, limpando dados de autenticação...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    };

    // Remover o listener de pagehide que estava causando logout indevido
    // O pagehide é disparado durante navegação interna também

    // Adicionar apenas o listener para beforeunload (fechamento real da aba)
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup dos listeners
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      setUser(user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Erro ao fazer login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
