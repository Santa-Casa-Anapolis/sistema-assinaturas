import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  Download, 
  Clock,
  AlertCircle,
  ArrowLeft,
  PenTool
} from 'lucide-react';
import DocumentSignaturePositioning from './DocumentSignaturePositioning';

const DocumentSign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPositioning, setShowPositioning] = useState(false);
  const [signatureMode, setSignatureMode] = useState('positioning'); // apenas 'positioning'

  useEffect(() => {
    fetchDocument();
  }, [id, fetchDocument]);

  const fetchDocument = useCallback(async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocument(response.data);
    } catch (error) {
      toast.error('Erro ao carregar documento');
      navigate('/pending');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleDownload = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', document.original_filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Download iniciado');
    } catch (error) {
      toast.error('Erro ao fazer download do documento');
    }
  };


  const handleSignatureComplete = (status = 'completed') => {
    if (status === 'cancelled') {
      toast.info('Assinatura cancelada');
      setShowPositioning(false);
      setSignatureMode('positioning');
      navigate('/my-documents');
    } else {
      toast.success('Assinaturas posicionadas com sucesso!');
      setShowPositioning(false);
      setSignatureMode('positioning');
    }
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
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Documento não encontrado
        </h2>
        <p className="text-gray-600 mb-4">
          O documento não foi encontrado ou você não tem permissão para assiná-lo.
        </p>
        <button
          onClick={() => navigate('/pending')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Voltar para Pendentes
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pending')}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Pendentes</span>
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Assinar Documento
        </h1>
        <p className="text-gray-600">
          Revise o documento e realize a assinatura digital via GOV.BR
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Informações do documento */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Informações do Documento
            </h2>
            
            <div className="space-y-4">
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
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Aguardando Assinatura
                </span>
              </div>
            </div>
          </div>

          {/* Download do documento */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Visualizar Documento
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Faça o download do documento para revisá-lo antes da assinatura.
            </p>
            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              <span>Download do Documento</span>
            </button>
          </div>
        </div>

        {/* Área de assinatura */}
        <div className="space-y-6">
          {/* Escolha do modo de assinatura */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Modo de Assinatura
            </h2>
            
            <div className="p-4 rounded-lg mb-6" style={{backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)'}}>
              <div className="flex items-start space-x-3">
                <PenTool className="h-5 w-5 mt-0.5" style={{color: 'var(--info)'}} />
                <div>
                  <h4 className="text-sm font-medium mb-1" style={{color: 'var(--text-primary)'}}>
                    Posicionamento Visual da Assinatura
                  </h4>
                  <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                    Você poderá posicionar sua assinatura visualmente no documento PDF.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {signatureMode === 'positioning' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Posicionamento de Assinatura
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Clique no botão abaixo para posicionar sua assinatura visualmente no documento PDF.
              </p>
              <button
                onClick={() => setShowPositioning(true)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <PenTool className="h-4 w-4" />
                <span>Posicionar Assinatura no PDF</span>
              </button>
            </div>
          )}


          {/* Fluxo de assinaturas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Fluxo de Assinaturas
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="h-6 w-6 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">1</span>
                </div>
                <span className="text-sm font-medium text-green-800">Sua vez de assinar</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="h-6 w-6 bg-gray-400 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">2</span>
                </div>
                <span className="text-sm text-gray-600">Próximos signatários</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Posicionamento de Assinatura */}
      {showPositioning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Posicionar Assinatura - {document?.title}
              </h3>
              <button
                onClick={() => {
                  const confirmed = window.confirm('Tem certeza que deseja cancelar a assinatura?');
                  if (confirmed) {
                    toast.info('Assinatura cancelada');
                    setShowPositioning(false);
                    navigate('/my-documents');
                  }
                }}
                className="text-gray-400 hover:text-red-600 transition-colors"
                title="Cancelar assinatura e fechar"
              >
                <span className="sr-only">Cancelar assinatura</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <DocumentSignaturePositioning
                documentId={id}
                onSignatureComplete={handleSignatureComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSign;
