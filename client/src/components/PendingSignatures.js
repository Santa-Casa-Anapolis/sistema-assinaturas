import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  Clock, 
  FileText, 
  ArrowRight, 
  Download,
  AlertCircle,
  Eye
} from 'lucide-react';

const PendingSignatures = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingDocuments();
  }, []);

  const fetchPendingDocuments = async () => {
    try {
      const response = await axios.get('/api/documents/pending');
      setDocuments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar documentos pendentes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (documentId, filename) => {
    try {
      const response = await axios.get(`/api/documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download iniciado');
    } catch (error) {
      toast.error('Erro ao fazer download do documento');
    }
  };

  const handleViewDocument = async (documentId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token de autenticação não encontrado');
        return;
      }
      
      // Primeiro verificar se o documento existe
      const checkResponse = await axios.get(`/api/documents/${documentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (checkResponse.status === 200) {
        const document = checkResponse.data;
        console.log('Documento encontrado:', document);
        
        // Abrir documento em nova aba (URL absoluta para evitar interceptação do React Router)
        const viewUrl = `http://localhost:5000/api/documents/${documentId}/view?token=${token}`;
        const newWindow = window.open(viewUrl, '_blank');
        
        // Verificar se a janela foi bloqueada
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          toast.error('Popup bloqueado. Permita popups para este site.');
        }
      }
      
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      if (error.response?.status === 404) {
        toast.error('Documento não encontrado.');
      } else if (error.response?.status === 401) {
        toast.error('Token de autenticação inválido. Faça login novamente.');
      } else {
        toast.error('Erro ao abrir documento. Tente fazer o download.');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2" style={{color: 'var(--text-primary)'}}>
          Documentos Pendentes
        </h1>
        <p className="text-gray-600">
          Documentos aguardando sua assinatura digital
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum documento pendente
          </h2>
          <p className="text-gray-600 mb-6">
            Você não tem documentos aguardando assinatura no momento.
          </p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {documents.length} documento{documents.length !== 1 ? 's' : ''} pendente{documents.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <div key={doc.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <FileText className="h-5 w-5 text-yellow-600" />
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        {doc.title}
                        {doc.supplier_name && (
                          <span className="block text-xs text-gray-500 mt-1">
                            Fornecedor: {doc.supplier_name}
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>Arquivo: {doc.original_filename}</span>
                        <span>•</span>
                        <span>Criado em: {new Date(doc.created_at).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span>Ordem: {doc.order_index}º</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md"
                      title="Visualizar documento"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc.id, doc.original_filename)}
                      className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    
                    <Link
                      to={`/sign/${doc.id}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      Assinar
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informações adicionais */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Sobre as Assinaturas
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Os documentos são assinados em ordem sequencial</li>
              <li>• Cada assinatura é registrada com timestamp e IP</li>
              <li>• Após sua assinatura, o próximo signatário será notificado</li>
              <li>• Todas as ações são registradas para auditoria</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingSignatures;
