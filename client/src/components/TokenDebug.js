import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const TokenDebug = () => {
  const { token, user } = useAuth();
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    if (token) {
      try {
        // Decodificar o JWT para ver as informações
        const payload = JSON.parse(atob(token.split('.')[1]));
        setTokenInfo({
          header: JSON.parse(atob(token.split('.')[0])),
          payload: payload,
          signature: token.split('.')[2],
          expiresAt: new Date(payload.exp * 1000).toLocaleString(),
          isExpired: Date.now() > payload.exp * 1000
        });
      } catch (error) {
        console.error('Erro ao decodificar token:', error);
        setTokenInfo({ error: 'Token inválido' });
      }
    }
  }, [token]);

  const refreshToken = () => {
    // Simular refresh do token
    window.location.reload();
  };

  const clearToken = () => {
    localStorage.removeItem('sa.token');
    localStorage.removeItem('sa.user');
    window.location.reload();
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        🔧 Debug do Token JWT
      </h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Token: {token ? '✅ Presente' : '❌ Ausente'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Usuário: {user ? `✅ ${user.username}` : '❌ Não definido'}
        </p>
      </div>

      {token && tokenInfo && (
        <div className="mb-6">
          <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Informações do Token:</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Payload:</h4>
                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded overflow-auto">
                  {JSON.stringify(tokenInfo.payload, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Status:</h4>
                <div className="space-y-2">
                  <p className={`text-sm ${tokenInfo.isExpired ? 'text-red-600' : 'text-green-600'}`}>
                    {tokenInfo.isExpired ? '❌ Expirado' : '✅ Válido'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Expira em: {tokenInfo.expiresAt}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Usuário: {tokenInfo.payload.username}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Role: {tokenInfo.payload.role}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={refreshToken}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          🔄 Atualizar
        </button>
        
        <button
          onClick={clearToken}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          🗑️ Limpar Token
        </button>
      </div>

      {token && (
        <div className="mt-4">
          <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Token Completo:</h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <pre className="text-xs break-all overflow-auto">
              {token}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenDebug;
