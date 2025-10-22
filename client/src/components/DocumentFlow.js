import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Download,
  Eye,
  DollarSign,
  X,
  FileSignature
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DocumentSignature from './DocumentSignature';

// O proxy está configurado no package.json para http://localhost:5000
// Não definimos baseURL aqui para usar o proxy do React

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
  const [filterStatus, setFilterStatus] = useState('all'); // Novo estado para filtro
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signatureDocument, setSignatureDocument] = useState(null);
  const [signatureStage, setSignatureStage] = useState('');

  const { user } = useAuth();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get('/api/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setDocuments(response.data);
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
      const response = await axios.post(`/api/documents/${documentId}/approve`, {
        action,
        comments: approvalData.comments,
        govSignatureId: approvalData.govSignatureId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setShowApprovalModal(false);
        setShowViewModal(false); // Fechar modal de visualização
        setSelectedDocument(null); // Limpar documento selecionado
        setApprovalData({ action: 'approve', comments: '', govSignatureId: '' });
        
        // Atualizar lista de documentos imediatamente
        await fetchDocuments();
        
        // Mostrar mensagem de sucesso
        alert(action === 'approve' ? 'Documento aprovado e encaminhado com sucesso!' : 'Documento rejeitado.');
      } else {
        alert('Erro ao processar aprovação. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
      alert('Erro ao processar aprovação. Verifique sua conexão.');
    }
  };

  // Função para aprovação rápida direto do botão
  const handleQuickApprove = async (document) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          action: 'approve',
          comments: 'Aprovação direta',
          govSignatureId: ''
        })
      });

      if (response.ok) {
        // Atualizar lista completa do servidor para refletir mudanças
        await fetchDocuments();
        
        // Determinar próxima etapa
        const currentStage = document.current_stage;
        let nextStage = '';
        
        switch (currentStage) {
          case 'contabilidade':
            nextStage = 'financeiro';
            break;
          case 'financeiro':
            nextStage = 'diretoria';
            break;
          case 'diretoria':
            nextStage = 'payment';
            break;
          case 'payment':
            nextStage = 'completed';
            break;
          default:
            nextStage = 'unknown';
            break;
        }
        
        alert(`Documento aprovado e encaminhado para ${nextStage}!`);
      } else {
        alert('Erro ao aprovar documento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao aprovar documento:', error);
      alert('Erro ao processar aprovação. Verifique sua conexão.');
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
        setShowViewModal(false); // Fechar modal de visualização
        setSelectedDocument(null); // Limpar documento selecionado
        setPaymentData({ paymentDate: '', paymentProof: null });
        
        // Atualizar lista de documentos
        await fetchDocuments();
        
        // Mostrar mensagem de sucesso
        alert('Pagamento processado com sucesso!');
      } else {
        alert('Erro ao processar pagamento. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      alert('Erro ao processar pagamento. Verifique sua conexão.');
    }
  };


  const handleRequestSignature = (document, stage) => {
    setSignatureDocument(document);
    setSignatureStage(stage);
    setShowSignatureModal(true);
  };

  const handleSignatureComplete = () => {
    setShowSignatureModal(false);
    setSignatureDocument(null);
    setSignatureStage('');
    fetchDocuments(); // Recarregar documentos
  };

  // Função para visualizar documento online em nova aba
  const handleViewDocumentOnline = async (document) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Token de autenticação não encontrado');
        return;
      }
      
      // Buscar o arquivo PDF com autenticação Bearer
      const pdfResponse = await fetch(`/api/documents/${document.id}/view`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/pdf'
        }
      });
      
      if (pdfResponse.ok) {
        // Converter resposta para Blob
        const pdfBlob = await pdfResponse.blob();
        
        // Criar URL do Blob
        const pdfUrl = URL.createObjectURL(pdfBlob);
        
        // Abrir PDF em nova aba
        const newWindow = window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        
        if (!newWindow) {
          alert('Por favor, permita pop-ups para este site para visualizar documentos.');
          // Limpar URL do Blob se popup foi bloqueado
          URL.revokeObjectURL(pdfUrl);
        } else {
          // Limpar URL do Blob após um tempo (para liberar memória)
          setTimeout(() => {
            URL.revokeObjectURL(pdfUrl);
          }, 10000); // 10 segundos
        }
      } else {
        throw new Error(`Erro HTTP: ${pdfResponse.status}`);
      }
    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      alert('Erro ao abrir documento. Verifique sua conexão.');
    }
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

  const filteredDocuments = documents.filter(doc => {
    if (!canView(doc)) return false;
    
    const userRole = user?.role;
    const currentStage = doc.current_stage;
    
    // Mostrar documentos baseado no papel do usuário e etapa atual
    let shouldShow = false;
    
    if (userRole === 'contabilidade') {
      shouldShow = currentStage === 'contabilidade';
    } else if (userRole === 'financeiro') {
      shouldShow = ['financeiro', 'payment'].includes(currentStage);
    } else if (userRole === 'diretoria') {
      shouldShow = currentStage === 'diretoria';
    } else if (userRole === 'supervisor') {
      shouldShow = currentStage === 'contabilidade';
    } else {
      shouldShow = true; // Admin vê tudo
    }
    
    if (!shouldShow) return false;
    
    // Aplicar filtro de status
    if (filterStatus === 'pending') {
      return doc.status === 'pending' && currentStage !== 'completed';
    }
    if (filterStatus === 'approved') {
      return doc.status === 'approved';
    }
    if (filterStatus === 'rejected') {
      return doc.status === 'rejected';
    }
    if (filterStatus === 'completed') {
      return doc.status === 'completed' || currentStage === 'completed';
    }
    
    return true; // 'all'
  });

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

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">Filtros</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({filteredDocuments.length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'pending' 
                ? 'bg-yellow-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Pendentes ({filteredDocuments.filter(doc => doc.status === 'pending' && doc.current_stage !== 'completed').length})
          </button>
          <button
            onClick={() => setFilterStatus('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'approved' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Aprovados ({filteredDocuments.filter(doc => doc.status === 'approved').length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'completed' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Finalizados ({filteredDocuments.filter(doc => doc.status === 'completed' || doc.current_stage === 'completed').length})
          </button>
          <button
            onClick={() => setFilterStatus('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === 'rejected' 
                ? 'bg-red-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Rejeitados ({filteredDocuments.filter(doc => doc.status === 'rejected').length})
          </button>
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
                  <span className="font-medium">R$ {typeof document.amount === 'number' ? document.amount.toFixed(2) : '0,00'}</span>
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
                  onClick={() => handleViewDocumentOnline(document)}
                  className="btn-view flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-1 text-sm"
                  title="Ver Documento"
                >
                  <Eye className="h-4 w-4" />
                  <span>Ver Documento</span>
                </button>
                
                {canUserApprove && document.current_stage !== 'payment' && (
                  <>
                    <button
                      onClick={() => handleRequestSignature(document, document.current_stage)}
                      className="btn-sign flex-1 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-1 text-sm"
                      title="Assinar"
                    >
                      <FileSignature className="h-4 w-4" />
                      <span>Assinar</span>
                    </button>
                    <button
                      onClick={() => handleQuickApprove(document)}
                      className="btn-approve flex-1 bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-1 text-sm"
                      title="Aprovar"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Aprovar</span>
                    </button>
                  </>
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
                        <span className="font-medium">R$ {typeof selectedDocument.amount === 'number' ? selectedDocument.amount.toFixed(2) : '0,00'}</span>
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
                      onClick={() => handleViewDocumentOnline(selectedDocument)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Ver Documento</span>
                    </button>

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
                        <div className="space-y-2">
                          <button
                            onClick={() => handleViewDocumentOnline(selectedDocument)}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Ver Documento</span>
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(selectedDocument)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <FileText className="h-16 w-16 text-green-600 mx-auto" />
                        <div>
                          <p className="text-gray-600 mb-2">Documento DOCX</p>
                          <p className="text-sm text-gray-500">{selectedDocument.original_filename}</p>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => handleViewDocumentOnline(selectedDocument)}
                            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Ver Documento</span>
                          </button>
                          <button
                            onClick={() => handleDownloadDocument(selectedDocument)}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
                          >
                            <Download className="h-4 w-4" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Assinatura */}
      {showSignatureModal && signatureDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Assinatura Digital</h3>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <DocumentSignature 
                documentId={signatureDocument.id}
                stage={signatureStage}
                onSignatureComplete={handleSignatureComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFlow;
