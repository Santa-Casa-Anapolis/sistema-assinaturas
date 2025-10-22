import React, { useState, useRef } from 'react';
import { validateSignatureFile, convertToPNG, ERROR_MESSAGES } from '../utils/signatureValidation';

/**
 * Componente para upload de assinatura com validação robusta
 */
const SignatureUpload = ({ onSignatureUpload, onError, disabled = false }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setIsUploading(true);

    try {
      // Validar tipo de arquivo
      const validation = await validateSignatureFile(file);
      
      if (!validation.valid) {
        onError(validation.error);
        return;
      }

      // Converter para PNG se necessário
      const pngBlob = await convertToPNG(file);
      
      // Criar URL para preview
      const signatureUrl = URL.createObjectURL(pngBlob);
      
      onSignatureUpload({
        file: pngBlob,
        url: signatureUrl,
        originalName: file.name,
        size: pngBlob.size,
        type: pngBlob.type
      });

    } catch (error) {
      console.error('Erro no upload de assinatura:', error);
      onError(ERROR_MESSAGES.CONVERSION_FAILED);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (disabled) return;
    
    const files = e.target.files;
    if (files && files[0]) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="signature-upload-container">
      <div
        className={`signature-upload-area ${dragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        
        <div className="upload-content">
          {isUploading ? (
            <div className="upload-loading">
              <div className="spinner"></div>
              <p>Processando assinatura...</p>
            </div>
          ) : (
            <div className="upload-prompt">
              <div className="upload-icon">📝</div>
              <h3>Enviar Assinatura</h3>
              <p>Arraste uma imagem ou clique para selecionar</p>
              <div className="supported-formats">
                <span className="format-tag">PNG</span>
                <span className="format-tag">JPEG</span>
                <span className="format-tag">WEBP</span>
                <span className="format-tag">SVG</span>
              </div>
              <p className="warning-text">
                ⚠️ PDF e P7S não são aceitos para assinatura visual
              </p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .signature-upload-container {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .signature-upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f9fafb;
        }

        .signature-upload-area:hover:not(.disabled) {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .signature-upload-area.drag-active {
          border-color: #10b981;
          background: #ecfdf5;
        }

        .signature-upload-area.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .upload-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .upload-prompt h3 {
          margin: 0 0 0.5rem 0;
          color: #374151;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .upload-prompt p {
          margin: 0 0 1rem 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .supported-formats {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .format-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .warning-text {
          color: #dc2626;
          font-size: 0.75rem;
          font-weight: 500;
          margin: 0;
        }

        .upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .spinner {
          width: 2rem;
          height: 2rem;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SignatureUpload;
