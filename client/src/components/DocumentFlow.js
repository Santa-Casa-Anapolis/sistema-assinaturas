import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Clock, 
  ArrowRight, 
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const DocumentFlow = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [approvalData, setApprovalData] = useState({
    action: 'approve',
    comments: '',
    govSignatureId: ''
  });
  const [paymentData, setPaymentData] = useState({
    paymentDate: '',
    paymentProof: null
  });

  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Erro ao buscar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStageInfo = (stage) => {
    const stages = {
      'contabilidade': { name: 'Contabilidade', color: 'bg-purple-100 text-purple-800', icon: '📊' },
      'financeiro': { name: 'Financeiro', color: 'bg-yellow-100 text-yellow-800', icon: '💰' },
      'diretoria': { name: 'Diretoria', color: 'bg-red-100 text-red-800', icon: '👔' },
      'payment': { name: 'Aguardando Pagamento', color: 'bg-green-100 text-green-800', icon: '💳' },
      'completed': { name: 'Finalizado', color: 'bg-gray-100 text-gray-800', icon: '✅' },
      'rejected': { name: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: '❌' }
    };
    return stages[stage] || { name: stage, color: 'bg-gray-100 text-gray-800', icon: '📄' };
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'completed': 'bg-blue-100 text-blue-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleApproval = async (documentId, action) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action,
          comments: approvalData.comments,
          govSignatureId: approvalData.govSignatureId
        })
      });

      if (response.ok) {
        setShowApprovalModal(false);
        setApprovalData({ action: 'approve', comments: '', govSignatureId: '' });
        fetchDocuments();
      }
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
    }
  };

  const handlePayment = async (documentId) => {
    try {
      const formData = new FormData();
      formData.append('paymentDate', paymentData.paymentDate);
      if (paymentData.paymentProof) {
        formData.append('paymentProof', paymentData.paymentProof);
      }

      const response = await fetch(`/api/documents/${documentId}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        setShowPaymentModal(false);
        setPaymentData({ paymentDate: '', paymentProof: null });
        fetchDocuments();
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    }
  };

  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowViewModal(true);
  };

  const handleDownloadDocument = async (document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = document.original_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
    }
  };

  const canApprove = (document) => {
    if (!user) return false;
    
    const stage = document.current_stage;
    const userRole = user.role;
    
    switch (stage) {
      case 'contabilidade':
        return userRole === 'contabilidade';
      case 'financeiro':
        return userRole === 'financeiro';
      case 'diretoria':
        return userRole === 'diretoria';
      case 'payment':
        return userRole === 'financeiro';
      default:
        return false;
    }
  };

  const canView = (document) => {
    if (!user) return false;
    
    const userRole = user.role;
    const stage = document.current_stage;
    
    // Supervisores podem ver documentos do seu setor
    if (userRole === 'supervisor' && document.sector === user.sector) {
      return true;
    }
    
    // Contabilidade, Financeiro e Diretoria podem ver todos
    if (['contabilidade', 'financeiro', 'diretoria'].includes(userRole)) {
      return true;
    }
    
    return false;
  };

  const filteredDocuments = documents.filter(doc => canView(doc));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Fluxo de Documentos</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>Atualizado em {new Date().toLocaleString()}</span>
        </div>
      </div>

      {/* Fluxo Visual */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Fluxo de Aprovação</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">👥</span>
            </div>
            <span className="text-sm font-medium">Supervisor</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">📊</span>
            </div>
            <span className="text-sm font-medium">Contabilidade</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">💰</span>
            </div>
            <span className="text-sm font-medium">Financeiro</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">👔</span>
            </div>
            <span className="text-sm font-medium">Diretoria</span>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold">💳</span>
            </div>
            <span className="text-sm font-medium">Pagamento</span>
          </div>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocuments.map((document) => {
          const stageInfo = getStageInfo(document.current_stage);
          const canUserApprove = canApprove(document);
          
          return (
            <div key={document.id} className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{document.title}</h3>
                    <p className="text-sm text-gray-500">Setor: {document.sector}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
                  {document.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor:</span>
                  <span className="font-medium">R$ {document.amount?.toFixed(2) || '0,00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Etapa:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageInfo.color}`}>
                    {stageInfo.icon} {stageInfo.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Criado:</span>
                  <span className="font-medium">{new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewDocument(document)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 text-sm"
                >
                  <Eye className="h-4 w-4" />
                  <span>Ver</span>
                </button>
                
                {canUserApprove && document.current_stage !== 'payment' && (
                  <button
                    onClick={() => {
                      setSelectedDocument(document);
                      setShowApprovalModal(true);
                    }}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-1 text-sm"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Aprovar</span>
                  </button>
                )}

                {canUserApprove && document.current_stage === 'payment' && (
                  <button
                    onClick={() => {
                      setSelectedDocument(document);
                      setShowPaymentModal(true);
                    }}
                    className="flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-1 text-sm"
                  >
                    <DollarSign className="h-4 w-4" />
                    <span>Pagar</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Aprovação */}
      {showApprovalModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Aprovar/Reprovar Documento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ação
                </label>
                <select
                  value={approvalData.action}
                  onChange={(e) => setApprovalData({...approvalData, action: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="approve">Aprovar</option>
                  <option value="reject">Reprovar</option>
                </select>
              </div>
              
              {approvalData.action === 'approve' && user.role === 'diretoria' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID da Assinatura GOV.BR
                  </label>
                  <input
                    type="text"
                    value={approvalData.govSignatureId}
                    onChange={(e) => setApprovalData({...approvalData, govSignatureId: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="ID da assinatura digital"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentários
                </label>
                <textarea
                  value={approvalData.comments}
                  onChange={(e) => setApprovalData({...approvalData, comments: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows="3"
                  placeholder="Adicione comentários sobre a decisão..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleApproval(selectedDocument.id, approvalData.action)}
                  className={`flex-1 py-2 rounded-lg text-white ${
                    approvalData.action === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {approvalData.action === 'approve' ? 'Aprovar' : 'Reprovar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Processar Pagamento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => setPaymentData({...paymentData, paymentDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comprovante de Pagamento
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setPaymentData({...paymentData, paymentProof: e.target.files[0]})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos aceitos: PDF, JPG, PNG
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handlePayment(selectedDocument.id)}
                  className="flex-1 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700"
                >
                  Processar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualização de Documento */}
      {showViewModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{selectedDocument.title}</h2>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Informações do Documento */}
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Informações do Documento</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Título:</span>
                        <span className="font-medium">{selectedDocument.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Setor:</span>
                        <span className="font-medium">{selectedDocument.sector}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valor:</span>
                        <span className="font-medium">R$ {selectedDocument.amount?.toFixed(2) || '0,00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedDocument.status)}`}>
                          {selectedDocument.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Etapa:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStageInfo(selectedDocument.current_stage).color}`}>
                          {getStageInfo(selectedDocument.current_stage).icon} {getStageInfo(selectedDocument.current_stage).name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Criado em:</span>
                        <span className="font-medium">{new Date(selectedDocument.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Arquivo:</span>
                        <span className="font-medium">{selectedDocument.original_filename}</span>
                      </div>
                    </div>
                  </div>

                  {selectedDocument.description && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-2">Descrição</h3>
                      <p className="text-sm text-gray-700">{selectedDocument.description}</p>
                    </div>
                  )}

                  {/* Botões de Ação */}
                  <div className="space-y-3">
                    <button
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar Documento</span>
                    </button>

                    {canApprove(selectedDocument) && selectedDocument.current_stage !== 'payment' && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          setSelectedDocument(selectedDocument);
                          setShowApprovalModal(true);
                        }}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Processar Documento</span>
                      </button>
                    )}

                    {canApprove(selectedDocument) && selectedDocument.current_stage === 'payment' && (
                      <button
                        onClick={() => {
                          setShowViewModal(false);
                          setSelectedDocument(selectedDocument);
                          setShowPaymentModal(true);
                        }}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
                      >
                        <DollarSign className="h-4 w-4" />
                        <span>Processar Pagamento</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Visualização do Documento */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Visualização do Documento</h3>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    {selectedDocument.mime_type === 'application/pdf' ? (
                      <div className="space-y-4">
                        <FileText className="h-16 w-16 text-blue-600 mx-auto" />
                        <div>
                          <p className="text-gray-600 mb-2">Documento PDF</p>
                          <p className="text-sm text-gray-500">{selectedDocument.original_filename}</p>
                        </div>
                        <button
                          onClick={() => handleDownloadDocument(selectedDocument)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
                        >
                          <Download className="h-4 w-4" />
                          <span>Baixar para Visualizar</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FileText className="h-16 w-16 text-green-600 mx-auto" />
                        <div>
                          <p className="text-gray-600 mb-2">Documento DOCX</p>
                          <p className="text-sm text-gray-500">{selectedDocument.original_filename}</p>
                        </div>
                        <button
                          onClick={() => handleDownloadDocument(selectedDocument)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 mx-auto"
                        >
                          <Download className="h-4 w-4" />
                          <span>Baixar para Visualizar</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFlow;
