import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileSignature, 
  CheckCircle, 
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-toastify';

const DocumentSignature = ({ documentId, stage, onSignatureComplete }) => {
  const [signature, setSignature] = useState(null);
  const [signing, setSigning] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [documentSignatures, setDocumentSignatures] = useState([]);
  const { user } = useAuth();

  const fetchUserSignature = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/signature`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const signatureData = await response.json();
        setSignature(signatureData);
      } else {
        setSignature(null);
      }
    } catch (error) {
      console.error('Erro ao buscar assinatura:', error);
      setSignature(null);
    }
  }, [user.id]);

  const fetchDocumentSignatures = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/signatures`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const signatures = await response.json();
        setDocumentSignatures(signatures);
      }
    } catch (error) {
      console.error('Erro ao buscar assinaturas do documento:', error);
    }
  }, [documentId]);

  useEffect(() => {
    if (user?.id) {
      fetchUserSignature();
      fetchDocumentSignatures();
    }
  }, [user?.id, documentId, fetchUserSignature, fetchDocumentSignatures]);

  const handleSignDocument = async () => {
    if (!signature) {
      toast.error('Você precisa ter uma assinatura cadastrada para assinar documentos');
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmSignature = async () => {
    try {
      setSigning(true);
      
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          stage: stage,
          signDocument: true,
          signatureFile: signature.signatureFile
        })
      });

      if (response.ok) {
        toast.success('Documento assinado com sucesso!');
        await fetchDocumentSignatures();
        setShowConfirmModal(false);
        if (onSignatureComplete) {
          onSignatureComplete('completed');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao assinar documento');
      }
    } catch (error) {
      console.error('Erro ao assinar documento:', error);
      toast.error(error.message || 'Erro ao assinar documento');
    } finally {
      setSigning(false);
    }
  };

  const skipSignature = async () => {
    try {
      setSigning(true);
      
      const response = await fetch(`/api/documents/${documentId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          stage: stage,
          signDocument: false
        })
      });

      if (response.ok) {
        toast.success('Processamento continuado sem assinatura');
        if (onSignatureComplete) {
          onSignatureComplete('completed');
        }
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar documento');
      }
    } catch (error) {
      console.error('Erro ao processar documento:', error);
      toast.error(error.message || 'Erro ao processar documento');
    } finally {
      setSigning(false);
    }
  };

  const isAlreadySigned = documentSignatures.some(
    sig => sig.user_id === user.id && sig.stage === stage
  );


  if (isAlreadySigned) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Documento já assinado</p>
            <p className="text-sm text-green-600">
              Você já assinou este documento nesta etapa ({stage})
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileSignature className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Assinatura Digital - {stage}
        </h3>
      </div>

      {!signature ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Assinatura não encontrada</p>
              <p className="text-sm text-yellow-700">
                Você precisa ter uma assinatura cadastrada para assinar documentos.
                Entre em contato com o administrador.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Assinatura disponível</p>
              <p className="text-sm text-green-700">
                Arquivo: {signature.originalFilename}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSignDocument}
          disabled={!signature || signing}
          className="btn-sign flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          title="Assinar"
        >
          <FileSignature className="h-4 w-4" />
          {signing ? 'Assinando...' : 'Assinar Documento'}
        </button>

        <button
          onClick={skipSignature}
          disabled={signing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle className="h-4 w-4" />
          Pular Assinatura
        </button>
      </div>

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h4 className="text-lg font-semibold mb-4">Confirmar Assinatura</h4>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 font-medium">Você está prestes a assinar este documento</p>
                <p className="text-sm text-blue-700 mt-1">
                  Etapa: <strong>{stage}</strong>
                </p>
                <p className="text-sm text-blue-700">
                  Assinatura: <strong>{signature?.originalFilename}</strong>
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Esta ação não pode ser desfeita.
                  Certifique-se de que está assinando o documento correto.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={signing}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSignature}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  disabled={signing}
                >
                  {signing ? 'Assinando...' : 'Confirmar Assinatura'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSignature;

