import React, { useState } from 'react';
import PDFSignatureViewer from './PDFSignatureViewer';

/**
 * Exemplo de uso do PDFSignatureViewer
 * Demonstra todas as funcionalidades implementadas
 */
const PDFSignatureExample = () => {
  const [pdfUrl, setPdfUrl] = useState('');
  const [showViewer, setShowViewer] = useState(false);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setShowViewer(true);
    } else {
      alert('Por favor, selecione um arquivo PDF válido.');
    }
  };

  const handleExport = (pdfBytes) => {
    console.log('PDF exportado:', pdfBytes);
    // Aqui você pode fazer upload do PDF assinado para o servidor
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        Sistema de Assinatura em PDF
      </h1>
      
      {!showViewer ? (
        <div className="text-center">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
            <div className="space-y-4">
              <div className="text-lg text-gray-600">
                Carregue um PDF para começar a adicionar assinaturas
              </div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100"
              />
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">✨ Funcionalidades Implementadas:</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="font-semibold text-green-700">🎯 Performance:</div>
                <ul className="space-y-1 text-gray-700">
                  <li>• Arraste fluido a 60fps</li>
                  <li>• WebWorker para PDF.js</li>
                  <li>• RequestAnimationFrame para movimentos</li>
                  <li>• Camadas separadas (canvas + overlay)</li>
                </ul>
              </div>
              <div className="space-y-2">
                <div className="font-semibold text-blue-700">🔧 Técnicas:</div>
                <ul className="space-y-1 text-gray-700">
                  <li>• Coordenadas normalizadas (x%, y%)</li>
                  <li>• Transform translate para movimento</li>
                  <li>• Pointer events desabilitados durante drag</li>
                  <li>• Export com pdf-lib</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                setShowViewer(false);
                setPdfUrl('');
                URL.revokeObjectURL(pdfUrl);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              ← Voltar
            </button>
            <div className="text-sm text-gray-600">
              PDF carregado com sucesso
            </div>
          </div>
          
          <PDFSignatureViewer 
            pdfUrl={pdfUrl} 
            onExport={handleExport}
          />
        </div>
      )}
    </div>
  );
};

export default PDFSignatureExample;
