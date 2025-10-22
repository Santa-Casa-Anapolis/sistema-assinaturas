import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../config/api';

const AuthTest = () => {
  const { token, user, login, logout } = useAuth();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    setTestResults(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  const testAuth = async () => {
    setLoading(true);
    setTestResults([]);
    
    try {
      addResult('🔍 Iniciando teste de autenticação...', 'info');
      
      // Teste 1: Verificar se há token
      addResult(`🔐 Token presente: ${token ? 'SIM' : 'NÃO'}`, token ? 'success' : 'error');
      
      if (!token) {
        addResult('❌ Sem token - teste interrompido', 'error');
        return;
      }

      // Teste 2: Verificar usuário
      addResult(`👤 Usuário: ${user ? user.username : 'NÃO DEFINIDO'}`, user ? 'success' : 'error');
      
      // Teste 3: Testar rota /api/auth/me
      addResult('📡 Testando /api/auth/me...', 'info');
      const meResponse = await api.get('/auth/me');
      addResult(`✅ /api/auth/me: ${meResponse.status}`, 'success');
      
      // Teste 4: Testar rota /api/documents/pending
      addResult('📡 Testando /api/documents/pending...', 'info');
      const pendingResponse = await api.get('/documents/pending');
      addResult(`✅ /api/documents/pending: ${pendingResponse.status}`, 'success');
      
      // Teste 5: Testar rota /api/documents/my-documents
      addResult('📡 Testando /api/documents/my-documents...', 'info');
      const myDocsResponse = await api.get('/documents/my-documents');
      addResult(`✅ /api/documents/my-documents: ${myDocsResponse.status}`, 'success');
      
      addResult('🎉 Todos os testes passaram!', 'success');
      
    } catch (error) {
      console.error('Erro no teste:', error);
      addResult(`❌ Erro: ${error.response?.status} - ${error.response?.data?.error || error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
        🔧 Teste de Autenticação
      </h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Token: {token ? '✅ Presente' : '❌ Ausente'}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
          Usuário: {user ? `✅ ${user.username}` : '❌ Não definido'}
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={testAuth}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? '🔄 Testando...' : '🧪 Executar Testes'}
        </button>
        
        <button
          onClick={clearResults}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
        >
          🗑️ Limpar
        </button>
        
        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          🚪 Logout
        </button>
      </div>

      {testResults.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
          <h3 className="font-bold mb-2 text-gray-900 dark:text-white">Resultados dos Testes:</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {testResults.map((result, index) => (
              <div
                key={index}
                className={`text-sm p-2 rounded ${
                  result.type === 'success' ? 'bg-green-100 text-green-800' :
                  result.type === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                {result.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthTest;
