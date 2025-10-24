import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext();

const STORAGE_KEY = 'sa.token';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Hidratar no primeiro render
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(STORAGE_KEY);
      const savedUser = localStorage.getItem('sa.user');
      
      console.log('🔐 AuthContext - Hidratando dados:', {
        hasToken: !!savedToken,
        hasUser: !!savedUser,
        tokenLength: savedToken?.length
      });
      
      if (savedToken) {
        setToken(savedToken);
      }
      
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          console.log('🔐 AuthContext - Usuário carregado:', userData.username);
        } catch (error) {
          console.error('Erro ao parsear usuário salvo:', error);
          localStorage.removeItem('sa.user');
        }
      }
    } catch (error) {
      console.error('Erro ao hidratar token:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (newToken, userData) => {
    console.log('🔐 AuthContext - Fazendo login:', {
      hasToken: !!newToken,
      tokenLength: newToken?.length,
      hasUser: !!userData,
      username: userData?.username
    });
    
    localStorage.setItem(STORAGE_KEY, newToken);
    localStorage.setItem('sa.user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    
    console.log('🔐 AuthContext - Login concluído, dados salvos no localStorage');
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('sa.user');
    setToken(null);
    setUser(null);
  };

  const getToken = () => localStorage.getItem(STORAGE_KEY);

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    getToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
