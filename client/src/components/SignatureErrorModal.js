import React from 'react';

/**
 * Modal de erro para problemas com assinatura
 */
const SignatureErrorModal = ({ 
  isOpen, 
  onClose, 
  error, 
  onRetry 
}) => {
  if (!isOpen) return null;

  return (
    <div className="error-modal-overlay">
      <div className="error-modal">
        <div className="error-header">
          <div className="error-icon">⚠️</div>
          <h3>Arquivo de assinatura inválido</h3>
        </div>
        
        <div className="error-content">
          <p className="error-message">{error}</p>
          
          <div className="error-details">
            <h4>Formatos aceitos:</h4>
            <div className="format-list">
              <span className="format-item valid">✅ PNG</span>
              <span className="format-item valid">✅ JPEG</span>
              <span className="format-item valid">✅ WEBP</span>
              <span className="format-item valid">✅ SVG</span>
            </div>
            
            <h4>Formatos bloqueados:</h4>
            <div className="format-list">
              <span className="format-item invalid">❌ PDF</span>
              <span className="format-item invalid">❌ P7S</span>
            </div>
          </div>
        </div>
        
        <div className="error-actions">
          <button 
            className="btn-secondary" 
            onClick={onClose}
          >
            Fechar
          </button>
          <button 
            className="btn-primary" 
            onClick={onRetry}
          >
            Enviar nova assinatura
          </button>
        </div>

        <style jsx>{`
          .error-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .error-modal {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }

          .error-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e5e7eb;
          }

          .error-icon {
            font-size: 2rem;
          }

          .error-header h3 {
            margin: 0;
            color: #dc2626;
            font-size: 1.5rem;
            font-weight: 600;
          }

          .error-content {
            margin-bottom: 2rem;
          }

          .error-message {
            color: #374151;
            font-size: 1rem;
            margin-bottom: 1.5rem;
            line-height: 1.5;
          }

          .error-details h4 {
            margin: 0 0 0.5rem 0;
            color: #374151;
            font-size: 0.875rem;
            font-weight: 600;
          }

          .format-list {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            margin-bottom: 1rem;
          }

          .format-item {
            padding: 0.25rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
          }

          .format-item.valid {
            background: #dcfce7;
            color: #166534;
            border: 1px solid #bbf7d0;
          }

          .format-item.invalid {
            background: #fef2f2;
            color: #dc2626;
            border: 1px solid #fecaca;
          }

          .error-actions {
            display: flex;
            gap: 1rem;
            justify-content: flex-end;
          }

          .btn-primary, .btn-secondary {
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: none;
          }

          .btn-primary {
            background: #3b82f6;
            color: white;
          }

          .btn-primary:hover {
            background: #2563eb;
          }

          .btn-secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .btn-secondary:hover {
            background: #e5e7eb;
          }
        `}</style>
      </div>
    </div>
  );
};

export default SignatureErrorModal;
