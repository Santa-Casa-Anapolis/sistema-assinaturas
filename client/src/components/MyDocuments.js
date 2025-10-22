import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  FileText, 
  Download, 
  Eye, 
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2
} from 'lucide-react';

const MyDocuments = () => {
  const [documents, setDocuments] = useState([]);
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchMyDocuments = async () => {
    try {
      const response = await axios.get('/api/documents/my-documents');
      setDocuments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = useCallback(() => {
    let filtered = documents;
    
    switch (activeFilter) {
      case 'pending':
        filtered = documents.filter(doc => doc.status === 'pending');
        break;
      case 'approved':
        filtered = documents.filter(doc => doc.status === 'approved');
        break;
      case 'completed':
        filtered = documents.filter(doc => doc.status === 'completed');
        break;
      case 'rejected':
        filtered = documents.filter(doc => doc.status === 'rejected');
        break;
      default:
        filtered = documents;
    }
    
    setFilteredDocuments(filtered);
  }, [documents, activeFilter]);

  useEffect(() => {
    fetchMyDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [documents, activeFilter, filterDocuments]);

  const getDocumentCounts = () => {
    return {
      all: documents.length,
      pending: documents.filter(doc => doc.status === 'pending').length,
      approved: documents.filter(doc => doc.status === 'approved').length,
      completed: documents.filter(doc => doc.status === 'completed').length,
      rejected: documents.filter(doc => doc.status === 'rejected').length
    };
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
        
        // Buscar o arquivo PDF com autenticação Bearer
        console.log('🔍 Fazendo fetch para PDF...');
        const pdfResponse = await fetch(`/api/documents/${documentId}/view`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log('📊 Resposta do fetch:', {
          status: pdfResponse.status,
          statusText: pdfResponse.statusText,
          headers: Object.fromEntries(pdfResponse.headers.entries())
        });
        
        if (pdfResponse.ok) {
          console.log('✅ PDF carregado com sucesso');
          // Converter resposta para Blob
          const pdfBlob = await pdfResponse.blob();
          console.log('📊 Blob criado:', {
            size: pdfBlob.size,
            type: pdfBlob.type
          });
          
          // Criar URL do Blob
          const pdfUrl = URL.createObjectURL(pdfBlob);
          console.log('🔗 URL do Blob criada:', pdfUrl);
          
          // Abrir PDF em nova aba
          const newWindow = window.open(pdfUrl, '_blank');
          
          // Verificar se a janela foi bloqueada
          if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
            console.log('❌ Popup bloqueado');
            toast.error('Popup bloqueado. Permita popups para este site.');
            // Limpar URL do Blob se popup foi bloqueado
            URL.revokeObjectURL(pdfUrl);
          } else {
            console.log('✅ PDF aberto em nova aba');
            // Limpar URL do Blob após um tempo (para liberar memória)
            setTimeout(() => {
              URL.revokeObjectURL(pdfUrl);
              console.log('🧹 URL do Blob limpa');
            }, 10000); // 10 segundos
          }
        } else {
          console.log('❌ Erro HTTP:', pdfResponse.status, pdfResponse.statusText);
          throw new Error(`Erro HTTP: ${pdfResponse.status}`);
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

  const handleDeleteDocument = async (documentId, documentTitle) => {
    try {
      // Confirmar exclusão
      const confirmed = window.confirm(
        `Tem certeza que deseja excluir o documento "${documentTitle}"?\n\nEsta ação não pode ser desfeita.`
      );
      
      if (!confirmed) {
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token de autenticação não encontrado');
        return;
      }
      
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        await response.json();
        toast.success('Documento excluído com sucesso!');
        // Atualizar lista de documentos
        fetchMyDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      
      if (error.message.includes('403')) {
        toast.error('Acesso negado. Você só pode excluir seus próprios documentos.');
      } else if (error.message.includes('404')) {
        toast.error('Documento não encontrado.');
      } else {
        toast.error(`Erro ao excluir documento: ${error.message}`);
      }
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'in_progress': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'Pendente',
      'completed': 'Concluído',
      'in_progress': 'Em Andamento'
    };
    return texts[status] || status;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
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
          Meus Documentos
        </h1>
        <p className="text-gray-600">
          Histórico de documentos enviados para assinatura
        </p>
      </div>

      {/* Filtros */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3" style={{color: 'var(--text-primary)'}}>
          Filtros
        </h2>
        <div className="flex flex-wrap gap-2">
          {(() => {
            const counts = getDocumentCounts();
            const filters = [
              { key: 'all', label: 'Todos', count: counts.all },
              { key: 'pending', label: 'Pendentes', count: counts.pending },
              { key: 'approved', label: 'Aprovados', count: counts.approved },
              { key: 'completed', label: 'Finalizados', count: counts.completed },
              { key: 'rejected', label: 'Rejeitados', count: counts.rejected }
            ];
            
            return filters.map(filter => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter.key
                    ? 'text-white'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeFilter === filter.key ? 'var(--info)' : 'var(--bg-secondary)',
                  color: activeFilter === filter.key ? 'white' : 'var(--text-primary)',
                  border: '1px solid var(--border-primary)'
                }}
              >
                {filter.label} ({filter.count})
              </button>
            ));
          })()}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Nenhum documento encontrado
          </h2>
          <p className="text-gray-600 mb-6">
            Você ainda não enviou documentos para assinatura.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Enviar Primeiro Documento
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredDocuments.length} documento{filteredDocuments.length !== 1 ? 's' : ''} encontrado{filteredDocuments.length !== 1 ? 's' : ''}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="px-6 py-4 transition-colors duration-200" style={{backgroundColor: 'var(--bg-card)'}} onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-hover)'} onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-card)'}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    
                    <div className="flex-1">
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
                        <span>Signatários: {doc.signed_count || 0}/{doc.total_signers || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                      {getStatusIcon(doc.status)}
                      <span className="ml-1">{getStatusText(doc.status)}</span>
                    </span>
                    
                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="btn-view inline-flex items-center px-3 py-1 text-sm text-blue-600 rounded-md transition-colors duration-200"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                        e.target.style.color = '#3b82f6';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#3b82f6';
                      }}
                      title="Ver Documento"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </button>
                    
                    <button
                      onClick={() => handleDownload(doc.id, doc.original_filename)}
                      className="inline-flex items-center px-3 py-1 text-sm text-gray-600 rounded-md transition-colors duration-200"
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.1)';
                        e.target.style.color = '#374151';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = 'transparent';
                        e.target.style.color = '#6b7280';
                      }}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                    
                    <button
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md"
                      title="Excluir documento"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </button>
                    
                    <Link
                      to={`/audit/${doc.id}`}
                      className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Auditoria
                    </Link>
                  </div>
                </div>
                
                {/* Barra de progresso das assinaturas */}
                {doc.total_signers > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Progresso das assinaturas</span>
                      <span>{doc.signed_count || 0} de {doc.total_signers}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((doc.signed_count || 0) / doc.total_signers) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estatísticas */}
      {documents.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Concluídos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.status === 'completed').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDocuments;
