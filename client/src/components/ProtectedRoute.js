import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();

  // Mostrar loading enquanto hidrata o token
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg">Carregando...</span>
      </div>
    );
  }

  // Só redireciona se não houver token após a hidratação
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
