import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  FileText, 
  Download, 
  Shield, 
  CheckCircle, 
  Clock,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';

const DocumentSign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [govSignature, setGovSignature] = useState('');

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/pending`);
      const doc = response.data.find(d => d.id == id);
      
      if (!doc) {
        toast.error('Documento não encontrado ou não autorizado para assinatura');
        navigate('/pending');
        return;
      }
      
      setDocument(doc);
    } catch (error) {
      toast.error('Erro ao carregar documento');
      navigate('/pending');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSign = async () => {
    if (!govSignature.trim()) {
      toast.error('Digite sua assinatura GOV.BR');
      return;
    }

    setSigning(true);

    try {
      await axios.post(`/api/documents/${id}/sign`, {
        govSignature: govSignature.trim()
      });

      toast.success('Documento assinado com sucesso!');
      navigate('/pending');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao assinar documento');
    } finally {
      setSigning(false);
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
                <p className="text-sm text-gray-900">{document.title}</p>
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
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Assinatura Digital GOV.BR
            </h2>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Assinatura Digital Segura
                    </h4>
                    <p className="text-sm text-blue-700">
                      Esta assinatura terá validade jurídica e será registrada com timestamp e IP.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="govSignature" className="block text-sm font-medium text-gray-700 mb-2">
                  Assinatura GOV.BR *
                </label>
                <textarea
                  id="govSignature"
                  value={govSignature}
                  onChange={(e) => setGovSignature(e.target.value)}
                  placeholder="Digite sua assinatura digital (ex: CPF, certificado digital, etc.)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  * Campo obrigatório para validação da assinatura
                </p>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">
                      Importante
                    </h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• Revise o documento antes de assinar</li>
                      <li>• A assinatura é irrevogável</li>
                      <li>• Todas as ações são registradas para auditoria</li>
                      <li>• O próximo signatário será notificado automaticamente</li>
                    </ul>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSign}
                disabled={signing || !govSignature.trim()}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Assinando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Assinar Documento</span>
                  </>
                )}
              </button>
            </div>
          </div>

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
    </div>
  );
};

export default DocumentSign;
