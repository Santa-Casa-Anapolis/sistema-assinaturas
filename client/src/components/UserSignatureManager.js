import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Upload, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  FileImage,
  User
} from 'lucide-react';
import { toast } from 'react-toastify';

const UserSignatureManager = ({ userId, userName, onSignatureChange }) => {
  const [signature, setSignature] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchSignature();
    }
  }, [userId, fetchSignature]);

  const fetchSignature = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/signature`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const signatureData = await response.json();
        setSignature(signatureData);
      } else if (response.status === 404) {
        setSignature(null);
      } else {
        throw new Error('Erro ao buscar assinatura');
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      toast.error('Erro ao buscar assinatura');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }

    // Validar tamanho (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo permitido: 2MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('signature', file);

      const response = await fetch(`/api/users/${userId}/signature`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Assinatura salva com sucesso!');
        await fetchSignature();
        setShowUploadModal(false);
        if (onSignatureChange) {
          onSignatureChange(result);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao salvar assinatura');
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || 'Erro ao fazer upload da assinatura');
    } finally {
      setUploading(false);
    }
  };

  const deleteSignature = async () => {
    if (!window.confirm('Tem certeza que deseja remover esta assinatura?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/users/${userId}/signature`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('Assinatura removida com sucesso!');
        setSignature(null);
        if (onSignatureChange) {
          onSignatureChange(null);
        }
      } else {
        throw new Error('Erro ao remover assinatura');
      }
    } catch (error) {
      console.error('Erro ao remover assinatura:', error);
      toast.error('Erro ao remover assinatura');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Assinatura Digital - {userName}
          </h3>
        </div>
        
        <div className="flex gap-2">
          {signature ? (
            <>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Alterar
              </button>
              <button
                onClick={deleteSignature}
                className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Adicionar Assinatura
            </button>
          )}
        </div>
      </div>

      {signature ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Assinatura cadastrada</p>
              <p className="text-sm text-green-600">
                Arquivo: {signature.originalFilename}
              </p>
              <p className="text-xs text-green-500">
                Atualizada em: {new Date(signature.updatedAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <FileImage className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Assinatura carregada</p>
            <p className="text-sm text-gray-500">
              {signature.originalFilename}
            </p>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Nenhuma assinatura cadastrada</p>
          <p className="text-sm text-gray-500 mb-4">
            Adicione um arquivo PNG com a assinatura do usuário
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Adicionar Assinatura
          </button>
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4">Upload de Assinatura</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecionar arquivo PNG
                </label>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploading}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Requisitos:</strong>
                </p>
                <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                  <li>• Formato: PNG</li>
                  <li>• Tamanho máximo: 2MB</li>
                  <li>• Fundo transparente recomendado</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={uploading}
                >
                  Cancelar
                </button>
                {uploading && (
                  <div className="flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Enviando...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSignatureManager;

