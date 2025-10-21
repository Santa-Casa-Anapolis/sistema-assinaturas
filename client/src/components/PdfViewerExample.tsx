import React, { useState, useRef } from 'react';
import PdfViewerPro from './PdfViewerPro';

/**
 * Exemplo completo de uso do PdfViewerPro
 * Demonstra todas as funcionalidades implementadas
 */
const PdfViewerExample: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [viewerProps, setViewerProps] = useState({
    showNavigation: true,
    showThumbnails: true,
    showOutline: true,
    showSearch: true,
    initialScale: 'auto' as number | 'auto',
    initialPage: 1
  });
  
  const [events, setEvents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Adicionar evento ao log
  const addEvent = (event: string) => {
    setEvents(prev => [
      `${new Date().toLocaleTimeString()}: ${event}`,
      ...prev.slice(0, 9) // Manter apenas os últimos 10 eventos
    ]);
  };
  
  // Carregar arquivo PDF
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      addEvent(`Arquivo carregado: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      alert('Por favor, selecione um arquivo PDF válido.');
    }
  };
  
  // Carregar PDF de exemplo
  const loadSamplePDF = () => {
    const sampleUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    setPdfUrl(sampleUrl);
    setSelectedFile(null);
    addEvent('PDF de exemplo carregado');
  };
  
  // Callbacks do PDF Viewer
  const handlePDFLoad = (pdf: any) => {
    setTotalPages(pdf.numPages);
    setIsLoading(false);
    addEvent(`PDF carregado: ${pdf.numPages} páginas`);
  };
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    addEvent(`Página alterada para: ${pageNumber}`);
  };
  
  const handlePageRender = (pageNumber: number, canvas: HTMLCanvasElement) => {
    addEvent(`Página ${pageNumber} renderizada`);
  };
  
  const handleError = (error: Error) => {
    setIsLoading(false);
    addEvent(`Erro: ${error.message}`);
  };
  
  // Toggle de funcionalidades
  const toggleFeature = (feature: keyof typeof viewerProps) => {
    setViewerProps(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }));
    addEvent(`${feature} ${!viewerProps[feature] ? 'habilitado' : 'desabilitado'}`);
  };
  
  // Limpar eventos
  const clearEvents = () => {
    setEvents([]);
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">
        📄 PdfViewerPro - Exemplo Completo
      </h1>
      
      {/* Controles superiores */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload de arquivo */}
          <div>
            <h2 className="text-lg font-semibold mb-4">📁 Carregar PDF</h2>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
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
              <button
                onClick={loadSamplePDF}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                📄 Carregar PDF de Exemplo
              </button>
              {selectedFile && (
                <div className="text-sm text-gray-600">
                  <strong>Arquivo selecionado:</strong> {selectedFile.name}
                </div>
              )}
            </div>
          </div>
          
          {/* Configurações */}
          <div>
            <h2 className="text-lg font-semibold mb-4">⚙️ Configurações</h2>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={viewerProps.showNavigation}
                  onChange={() => toggleFeature('showNavigation')}
                  className="mr-2"
                />
                Controles de Navegação
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={viewerProps.showThumbnails}
                  onChange={() => toggleFeature('showThumbnails')}
                  className="mr-2"
                />
                Thumbnails
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={viewerProps.showOutline}
                  onChange={() => toggleFeature('showOutline')}
                  className="mr-2"
                />
                Outline/Bookmarks
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={viewerProps.showSearch}
                  onChange={() => toggleFeature('showSearch')}
                  className="mr-2"
                />
                Busca
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Status */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm">
              <span className="font-semibold">Status:</span>
              {isLoading ? (
                <span className="text-blue-600"> Carregando...</span>
              ) : pdfUrl ? (
                <span className="text-green-600"> PDF Carregado</span>
              ) : (
                <span className="text-gray-500"> Nenhum PDF</span>
              )}
            </div>
            {totalPages > 0 && (
              <div className="text-sm">
                <span className="font-semibold">Páginas:</span>
                <span className="text-gray-600"> {currentPage} de {totalPages}</span>
              </div>
            )}
          </div>
          <button
            onClick={clearEvents}
            className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
          >
            Limpar Log
          </button>
        </div>
      </div>
      
      {/* PDF Viewer */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        {pdfUrl ? (
          <PdfViewerPro
            url={pdfUrl}
            width="100%"
            height="700px"
            {...viewerProps}
            onLoad={handlePDFLoad}
            onPageChange={handlePageChange}
            onPageRender={handlePageRender}
            onError={handleError}
            className="pdf-viewer-example"
          />
        ) : (
          <div className="flex items-center justify-center h-96 text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">📄</div>
              <div className="text-xl mb-2">Nenhum PDF carregado</div>
              <div className="text-sm">Selecione um arquivo PDF ou carregue o exemplo</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Log de eventos */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">📋 Log de Eventos</h2>
        <div className="bg-gray-100 rounded p-4 h-48 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-gray-500 text-center py-8">
              Nenhum evento registrado ainda
            </div>
          ) : (
            <div className="space-y-1">
              {events.map((event, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {event}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Funcionalidades implementadas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-green-700">✅ Performance</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Device Pixel Ratio scaling</li>
            <li>• Cancelamento de renderização</li>
            <li>• IntersectionObserver para thumbnails</li>
            <li>• RequestAnimationFrame otimizado</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-700">🎨 Visualização</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Fit-to-width automático</li>
            <li>• Zoom e rotação</li>
            <li>• Text layer para seleção</li>
            <li>• Thumbnails virtuais</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-3 text-purple-700">🔍 Navegação</h3>
          <ul className="text-sm space-y-1 text-gray-700">
            <li>• Outline/Bookmarks</li>
            <li>• Busca com destaque</li>
            <li>• Navegação Next/Prev</li>
            <li>• Callbacks completos</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerExample;
