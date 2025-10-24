import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  FileText, 
  ArrowLeft, 
  Clock,
  User,
  Activity,
  Shield
} from 'lucide-react';

const AuditLog = () => {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditData = useCallback(async () => {
    try {
      // Buscar informações do documento
      const docsResponse = await axios.get('/api/documents/my-documents');
      const doc = docsResponse.data.find(d => d.id === id);
      setDocument(doc);

      // Buscar logs de auditoria
      const auditResponse = await axios.get(`/api/audit/${id}`);
      setAuditLogs(auditResponse.data);
    } catch (error) {
      toast.error('Erro ao carregar dados de auditoria');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAuditData();
  }, [id, fetchAuditData]);

  const getActionIcon = (action) => {
    switch (action) {
      case 'DOCUMENT_UPLOAD':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'DOCUMENT_SIGNED':
        return <Shield className="h-4 w-4 text-green-600" />;
      case 'DOCUMENT_DOWNLOAD':
        return <FileText className="h-4 w-4 text-gray-600" />;
      case 'LOGIN':
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionText = (action) => {
    const actions = {
      'DOCUMENT_UPLOAD': 'Documento Enviado',
      'DOCUMENT_SIGNED': 'Documento Assinado',
      'DOCUMENT_DOWNLOAD': 'Documento Baixado',
      'LOGIN': 'Login Realizado'
    };
    return actions[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      'DOCUMENT_UPLOAD': 'bg-blue-100 text-blue-800',
      'DOCUMENT_SIGNED': 'bg-green-100 text-green-800',
      'DOCUMENT_DOWNLOAD': 'bg-gray-100 text-gray-800',
      'LOGIN': 'bg-purple-100 text-purple-800'
    };
    return colors[action] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-8">
        <FileText className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Documento não encontrado
        </h2>
        <p className="text-gray-600 mb-4">
          O documento não foi encontrado ou você não tem permissão para visualizá-lo.
        </p>
        <Link
          to="/my-documents"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Voltar para Meus Documentos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <Link
          to="/my-documents"
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Meus Documentos</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Histórico de Auditoria
        </h1>
        <p className="text-gray-600">
          Registro completo de todas as ações realizadas no documento
        </p>
      </div>

      {/* Informações do documento */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Informações do Documento
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <p className="text-sm text-gray-900">
              {document.title}
              {document.supplier_name && (
                <span className="block text-xs text-gray-500 mt-1">
                  Fornecedor: {document.supplier_name}
                </span>
              )}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Arquivo Original
            </label>
            <p className="text-sm text-gray-900">{document.original_filename}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data de Criação
            </label>
            <p className="text-sm text-gray-900">
              {new Date(document.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              document.status === 'completed' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {document.status === 'completed' ? 'Concluído' : 'Pendente'}
            </span>
          </div>
        </div>
      </div>

      {/* Logs de auditoria */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Registro de Atividades ({auditLogs.length} eventos)
          </h2>
        </div>
        
        {auditLogs.length === 0 ? (
          <div className="p-6 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">
              Nenhum evento registrado
            </h3>
            <p className="text-sm text-gray-500">
              Ainda não há atividades registradas para este documento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {auditLogs.map((log, index) => (
              <div key={log.id} className="px-6 py-4">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getActionIcon(log.action)}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {getActionText(log.action)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {log.user_name || 'Sistema'}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {getActionText(log.action)}
                        </span>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                    {log.details && (
                      <p className="mt-2 text-sm text-gray-600">
                        {log.details}
                      </p>
                    )}
                    
                    {log.ip_address && (
                      <p className="mt-1 text-xs text-gray-500">
                        IP: {log.ip_address}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Informações sobre auditoria */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Sobre a Auditoria
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Todas as ações são registradas automaticamente</li>
              <li>• Timestamp e IP são capturados para cada evento</li>
              <li>• Este histórico é mantido para conformidade legal</li>
              <li>• Os logs não podem ser alterados ou removidos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLog;
