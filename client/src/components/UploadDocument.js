import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { 
  Upload, 
  FileText, 
  DollarSign,
  X,
  CheckCircle,
  AlertCircle,
  PenTool,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DocumentSignaturePositioning from './DocumentSignaturePositioning';

const UploadDocument = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [signatureMode, setSignatureMode] = useState('none'); // 'none', 'text', 'positioning'
  const [govSignature, setGovSignature] = useState('');
  const [showSignaturePositioning, setShowSignaturePositioning] = useState(false);
  const [tempDocumentId, setTempDocumentId] = useState(null);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      setSelectedFiles(prevFiles => [...prevFiles, ...acceptedFiles]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    multiple: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return;
    }

    if (!title.trim()) {
      toast.error('Digite um título para o documento');
      return;
    }

    // Verificar se é supervisor
    if (user.role !== 'supervisor') {
      toast.error('Apenas supervisores podem enviar documentos');
      return;
    }

    // Verificar assinatura se necessário
    if (signatureMode === 'text' && !govSignature.trim()) {
      toast.error('Digite sua assinatura GOV.BR');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('amount', amount);
      formData.append('sector', user.sector);
      formData.append('signatureMode', signatureMode);
      
      if (signatureMode === 'text') {
        formData.append('govSignature', govSignature.trim());
      }
      
      // Adicionar todos os arquivos
      selectedFiles.forEach((file, index) => {
        formData.append(`documents`, file);
      });

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        if (signatureMode === 'positioning') {
          // Se for posicionamento visual, abrir modal de posicionamento
          setTempDocumentId(result.documentId);
          setShowSignaturePositioning(true);
          toast.info('Documento criado! Agora posicione sua assinatura.');
        } else {
          // Assinatura textual ou sem assinatura
          toast.success('Documento enviado com sucesso!');
          resetForm();
        }
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao enviar documento');
      }
    } catch (error) {
      console.error('Erro ao enviar documento:', error);
      toast.error('Erro ao enviar documento');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAmount('');
    setSelectedFiles([]);
    setSignatureMode('none');
    setGovSignature('');
    setTempDocumentId(null);
  };

  const handleSignatureComplete = () => {
    toast.success('Documento assinado e enviado com sucesso!');
    setShowSignaturePositioning(false);
    resetForm();
  };

  const removeFile = (indexToRemove) => {
    setSelectedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (user.role !== 'supervisor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600">
            Apenas supervisores podem enviar documentos para o fluxo de aprovação.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Upload className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>Enviar Documento</h1>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Fluxo de Aprovação</h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">📊 Contabilidade</span>
              <span className="text-blue-500">→</span>
              <span className="text-blue-700">💰 Financeiro</span>
              <span className="text-blue-500">→</span>
              <span className="text-blue-700">👔 Diretoria</span>
              <span className="text-blue-500">→</span>
              <span className="text-blue-700">💳 Pagamento</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                Título do Documento *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
                placeholder="Ex: Nota fiscal de equipamentos"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                Descrição
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
                rows="3"
                placeholder="Descreva o documento e seu propósito..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                Valor (R$)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border rounded-lg pl-10 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)'
                  }}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Seção de Assinatura */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                Assinatura do Supervisor
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setSignatureMode('none')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    signatureMode === 'none'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className={`h-6 w-6 ${signatureMode === 'none' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">Sem Assinatura</h3>
                      <p className="text-sm text-gray-600">Enviar sem assinar</p>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSignatureMode('text')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    signatureMode === 'text'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Shield className={`h-6 w-6 ${signatureMode === 'text' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">Assinatura Textual</h3>
                      <p className="text-sm text-gray-600">Assinatura via texto GOV.BR</p>
                    </div>
                  </div>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSignatureMode('positioning')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    signatureMode === 'positioning'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <PenTool className={`h-6 w-6 ${signatureMode === 'positioning' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div>
                      <h3 className="font-medium text-gray-900">Posicionamento Visual</h3>
                      <p className="text-sm text-gray-600">Posicionar assinatura no PDF</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Campo de assinatura textual */}
              {signatureMode === 'text' && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                    Assinatura GOV.BR *
                  </label>
                  <textarea
                    value={govSignature}
                    onChange={(e) => setGovSignature(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)'
                    }}
                    rows="3"
                    placeholder="Digite sua assinatura digital (ex: CPF, certificado digital, etc.)"
                    required
                  />
                </div>
              )}

              {/* Informação sobre posicionamento visual */}
              {signatureMode === 'positioning' && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <PenTool className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-purple-900 mb-1">
                        Posicionamento Visual
                      </h4>
                      <p className="text-sm text-purple-700">
                        Após enviar o documento, você poderá posicionar sua assinatura visualmente em cada página do PDF.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                Arquivo do Documento *
              </label>
              
              {selectedFiles.length === 0 ? (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-blue-600">Solte o arquivo aqui...</p>
                  ) : (
                    <div>
                      <p className="text-gray-600 mb-2">
                        Arraste e solte arquivos aqui, ou clique para selecionar
                      </p>
                      <p className="text-sm text-gray-500">
                        Formatos aceitos: PDF, DOCX (máx. 10MB cada)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      Arquivos selecionados ({selectedFiles.length})
                    </h4>
                    <div
                      {...getRootProps()}
                      className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
                    >
                      <input {...getInputProps()} />
                      + Adicionar mais arquivos
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="border border-gray-300 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Informações do Setor</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Setor:</span>
                  <span className="ml-2 font-medium">{user.sector}</span>
                </div>
                <div>
                  <span className="text-gray-500">Supervisor:</span>
                  <span className="ml-2 font-medium">{user.name}</span>
                </div>
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-3 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                Limpar
              </button>
              <button
                type="submit"
                disabled={loading || selectedFiles.length === 0 || !title.trim()}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Enviar Documentos</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de Posicionamento de Assinatura */}
      {showSignaturePositioning && tempDocumentId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Posicionar Assinatura - {title}
              </h3>
              <button
                onClick={() => {
                  setShowSignaturePositioning(false);
                  setTempDocumentId(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Fechar</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <DocumentSignaturePositioning
                documentId={tempDocumentId}
                onSignatureComplete={handleSignatureComplete}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDocument;
