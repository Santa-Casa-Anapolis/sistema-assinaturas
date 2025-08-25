import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import axios from 'axios';
import { 
  Upload, 
  FileText, 
  Users, 
  ArrowRight, 
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const UploadDocument = () => {
  const [title, setTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [signers, setSigners] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Fluxo fixo de assinaturas
  const fixedFlow = [
    { role: 'supervisor', name: 'Supervisor' },
    { role: 'contabilidade', name: 'Contabilidade' },
    { role: 'financeiro', name: 'Financeiro' },
    { role: 'diretoria', name: 'Diretoria' }
  ];

  // Buscar usuário atual e criar fluxo baseado no setor
  useEffect(() => {
    const fetchCurrentUserAndCreateFlow = async () => {
      try {
        // Buscar usuário atual do localStorage
        const token = localStorage.getItem('token');
        if (!token) {
          toast.error('Usuário não autenticado');
          return;
        }

        // Decodificar token para pegar informações do usuário
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const currentUserId = tokenData.id;
        
        // Buscar dados completos do usuário atual
        const userResponse = await axios.get(`/api/users/${currentUserId}`);
        const currentUserData = userResponse.data;
        setCurrentUser(currentUserData);

        // Verificar se o usuário atual é supervisor
        if (currentUserData.role !== 'supervisor') {
          toast.error('Apenas supervisores podem enviar documentos');
          return;
        }

        // Buscar usuários para o fluxo (apenas outros papéis)
        const roles = ['contabilidade', 'financeiro', 'diretoria'];
        const allUsers = [];
        const flowUsers = [];
        
        // Adicionar o supervisor atual como primeiro no fluxo
        flowUsers.push(currentUserData);
        
        for (const role of roles) {
          const response = await axios.get(`/api/users/by-role/${role}`);
          const users = response.data;
          allUsers.push(...users);
          
          // Para outros papéis, pegar o primeiro usuário
          if (users.length > 0) {
            flowUsers.push(users[0]);
          }
        }
        
        setAvailableUsers(allUsers);
        setSigners(flowUsers);
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchCurrentUserAndCreateFlow();
  }, []);

  // Configuração do dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      setSelectedFile(acceptedFiles[0]);
    }
  });

  // Fluxo fixo - não permite alterações
  const addSigner = (user) => {
    // Função desabilitada - fluxo fixo
  };

  const removeSigner = (userId) => {
    // Função desabilitada - fluxo fixo
  };

  const moveSigner = (index, direction) => {
    // Função desabilitada - fluxo fixo
  };

  // Enviar documento
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error('Digite um título para o documento');
      return;
    }

    if (!selectedFile) {
      toast.error('Selecione um arquivo');
      return;
    }

    if (signers.length === 0) {
      toast.error('Erro: Fluxo de assinaturas não configurado');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('title', title);
      formData.append('signers', JSON.stringify(signers));

      const response = await axios.post('/api/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Documento enviado com sucesso!');
      
      // Limpar formulário
      setTitle('');
      setSelectedFile(null);
      setSigners([]);
      
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao enviar documento');
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplayName = (role, sector) => {
    const roleNames = {
      'supervisor': sector ? `Supervisor - ${sector}` : 'Supervisor',
      'contabilidade': 'Contabilidade',
      'financeiro': 'Financeiro',
      'diretoria': 'Diretoria'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      'supervisor': 'bg-blue-100 text-blue-800',
      'contabilidade': 'bg-purple-100 text-purple-800',
      'financeiro': 'bg-yellow-100 text-yellow-800',
      'diretoria': 'bg-red-100 text-red-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Enviar Documento para Assinatura
        </h1>
        <p className="text-gray-600">
          Faça upload do documento para o fluxo padrão de assinaturas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Título do documento */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
            Título do Documento
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ex: Nota Fiscal 001/2024"
            required
          />
        </div>

        {/* Upload do arquivo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Arquivo do Documento
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="mx-auto h-8 w-8 text-green-500" />
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">
                  {isDragActive
                    ? 'Solte o arquivo aqui...'
                    : 'Arraste e solte um arquivo aqui, ou clique para selecionar'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Apenas arquivos PDF e DOCX são aceitos (máx. 10MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Fluxo fixo de assinaturas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Fluxo de Assinaturas (Ordem Fixa)
          </label>
          {loadingUsers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Carregando fluxo...</p>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800 mb-4">
                <CheckCircle className="inline h-4 w-4 mr-2" />
                Fluxo padrão configurado automaticamente
              </div>
              <div className="space-y-3">
                {signers.map((signer, index) => (
                  <div
                    key={signer.id}
                    className="flex items-center justify-between p-3 border border-blue-200 rounded-lg bg-white"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{signer.name}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(signer.role)}`}>
                          {getRoleDisplayName(signer.role, signer.sector)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {index < signers.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-blue-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        {/* Botão de envio */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !title || !selectedFile}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Enviando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Enviar Documento</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UploadDocument;
