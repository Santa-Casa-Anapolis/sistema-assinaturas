import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `${window.location.origin}/pdf.worker.min.js`;

// Interfaces TypeScript
interface PdfViewerProProps {
  /** URL do arquivo PDF */
  url: string;
  /** Largura do container */
  width?: number | string;
  /** Altura do container */
  height?: number | string;
  /** Escala inicial (padrão: 'auto' para fit-to-width) */
  initialScale?: number | 'auto';
  /** Página inicial (padrão: 1) */
  initialPage?: number;
  /** Mostrar controles de navegação */
  showNavigation?: boolean;
  /** Mostrar thumbnails */
  showThumbnails?: boolean;
  /** Mostrar outline/bookmarks */
  showOutline?: boolean;
  /** Mostrar busca */
  showSearch?: boolean;
  /** Callback quando página é renderizada */
  onPageRender?: (pageNumber: number, canvas: HTMLCanvasElement) => void;
  /** Callback quando ocorre erro */
  onError?: (error: Error) => void;
  /** Callback quando PDF é carregado */
  onLoad?: (pdf: pdfjsLib.PDFDocumentProxy) => void;
  /** Callback quando página muda */
  onPageChange?: (pageNumber: number) => void;
  /** Classe CSS personalizada */
  className?: string;
}

interface ViewportState {
  scale: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

interface SearchResult {
  pageNumber: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PdfViewerPro: React.FC<PdfViewerProProps> = ({
  url,
  width = '100%',
  height = '600px',
  initialScale = 'auto',
  initialPage = 1,
  showNavigation = true,
  showThumbnails = true,
  showOutline = true,
  showSearch = true,
  onPageRender,
  onError,
  onLoad,
  onPageChange,
  className = ''
}) => {
  // Estados principais
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number>(1);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState | null>(null);
  
  // Estados para funcionalidades avançadas
  const [thumbnails, setThumbnails] = useState<{ [key: number]: string }>({});
  const [outline, setOutline] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<{ [key: number]: HTMLDivElement }>({});
  
  // Device Pixel Ratio para nitidez
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Carregar PDF
  const loadPDF = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      
      const pdf = await loadingTask.promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      
      // Carregar outline/bookmarks
      try {
        const outlineData = await pdf.getOutline();
        setOutline(outlineData || []);
      } catch (err) {
        console.warn('Erro ao carregar outline:', err);
      }
      
      if (onLoad) onLoad(pdf);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar PDF';
      setError(errorMessage);
      if (onError) onError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [url, onLoad, onError]);
  
  // Calcular viewport otimizado
  const calculateViewport = useCallback((page: pdfjsLib.PDFPageProxy, containerWidth: number, targetScale?: number) => {
    const pageViewport = page.getViewport({ scale: 1, rotation });
    const scaleToUse = targetScale || scale;
    
    let finalScale = scaleToUse;
    if (scaleToUse === 'auto' || typeof scaleToUse !== 'number') {
      finalScale = containerWidth / pageViewport.width;
    }
    
    const scaledViewport = page.getViewport({ scale: finalScale, rotation });
    
    return {
      scale: finalScale,
      width: scaledViewport.width,
      height: scaledViewport.height,
      pageWidth: pageViewport.width,
      pageHeight: pageViewport.height
    };
  }, [scale, rotation]);
  
  // Renderizar página com alta qualidade
  const renderPage = useCallback(async (pageNumber: number, targetScale?: number) => {
    if (!pdfDocument || !canvasRef.current) return;
    
    try {
      // Cancelar renderização anterior
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      const containerWidth = containerRef.current?.clientWidth || 800;
      const viewportData = calculateViewport(page, containerWidth, targetScale);
      setViewport(viewportData);
      
      // Configurar canvas com DPR scaling para nitidez
      const scaledViewport = page.getViewport({ 
        scale: viewportData.scale * devicePixelRatio, 
        rotation 
      });
      
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${viewportData.width}px`;
      canvas.style.height = `${viewportData.height}px`;
      
      // Aplicar DPR scaling ao contexto
      context.scale(devicePixelRatio, devicePixelRatio);
      
      // Renderizar página
      const renderContext = {
        canvasContext: context,
        viewport: page.getViewport({ scale: viewportData.scale, rotation }),
      };
      
      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      
      // Renderizar text layer se habilitado
      if (textLayerRef.current) {
        const textLayer = new pdfjsLib.TextLayerBuilder({
          textLayerDiv: textLayerRef.current,
          pageIndex: pageNumber - 1,
          viewport: renderContext.viewport,
        });
        
        page.getTextContent().then((textContent) => {
          textLayer.setTextContent(textContent);
          textLayer.render();
        });
      }
      
      if (onPageRender) onPageRender(pageNumber, canvas);
      
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error('Erro ao renderizar página:', err);
        if (onError) onError(err as Error);
      }
    }
  }, [pdfDocument, calculateViewport, rotation, devicePixelRatio, onPageRender, onError]);
  
  // Gerar thumbnail
  const generateThumbnail = useCallback(async (pageNumber: number) => {
    if (!pdfDocument || thumbnails[pageNumber]) return;
    
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const thumbnailViewport = page.getViewport({ scale: 0.2 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      canvas.width = thumbnailViewport.width;
      canvas.height = thumbnailViewport.height;
      
      const renderContext = {
        canvasContext: context,
        viewport: thumbnailViewport,
      };
      
      await page.render(renderContext).promise;
      
      setThumbnails(prev => ({
        ...prev,
        [pageNumber]: canvas.toDataURL()
      }));
    } catch (err) {
      console.error('Erro ao gerar thumbnail:', err);
    }
  }, [pdfDocument, thumbnails]);
  
  // Buscar texto no PDF
  const searchText = useCallback(async (term: string) => {
    if (!pdfDocument || !term.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    setCurrentSearchIndex(-1);
    
    try {
      const results: SearchResult[] = [];
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        textContent.items.forEach((item: any) => {
          if (item.str.toLowerCase().includes(term.toLowerCase())) {
            results.push({
              pageNumber: pageNum,
              text: item.str,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height
            });
          }
        });
      }
      
      setSearchResults(results);
      setCurrentSearchIndex(0);
      
    } catch (err) {
      console.error('Erro na busca:', err);
    } finally {
      setIsSearching(false);
    }
  }, [pdfDocument, totalPages]);
  
  // Navegar para próximo resultado de busca
  const goToNextSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    
    const result = searchResults[nextIndex];
    setCurrentPage(result.pageNumber);
    
    // Destacar resultado
    setTimeout(() => {
      const highlight = document.createElement('div');
      highlight.style.position = 'absolute';
      highlight.style.left = `${result.x}px`;
      highlight.style.top = `${result.y}px`;
      highlight.style.width = `${result.width}px`;
      highlight.style.height = `${result.height}px`;
      highlight.style.backgroundColor = 'yellow';
      highlight.style.opacity = '0.3';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '1000';
      
      document.body.appendChild(highlight);
      setTimeout(() => highlight.remove(), 2000);
    }, 100);
  }, [searchResults, currentSearchIndex]);
  
  // Navegar para resultado anterior de busca
  const goToPrevSearchResult = useCallback(() => {
    if (searchResults.length === 0) return;
    
    const prevIndex = currentSearchIndex <= 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    
    const result = searchResults[prevIndex];
    setCurrentPage(result.pageNumber);
  }, [searchResults, currentSearchIndex]);
  
  // Intersection Observer para virtualização
  useEffect(() => {
    if (!showThumbnails) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNumber = parseInt(entry.target.getAttribute('data-page') || '1');
            generateThumbnail(pageNumber);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [showThumbnails, generateThumbnail]);
  
  // Carregar PDF quando URL muda
  useEffect(() => {
    loadPDF();
  }, [loadPDF]);
  
  // Renderizar página quando necessário
  useEffect(() => {
    if (pdfDocument && currentPage) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, renderPage]);
  
  // Callback de mudança de página
  useEffect(() => {
    if (onPageChange) {
      onPageChange(currentPage);
    }
  }, [currentPage, onPageChange]);
  
  // Calcular escala automática
  useEffect(() => {
    if (initialScale === 'auto' && viewport) {
      setScale(viewport.scale);
    }
  }, [initialScale, viewport]);
  
  // Limpar ao desmontar
  useEffect(() => {
    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, []);
  
  // Handlers
  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, newPage)));
  };
  
  const handleScaleChange = (newScale: number | 'auto') => {
    if (newScale === 'auto') {
      setScale('auto' as any);
    } else {
      setScale(newScale);
    }
  };
  
  const handleRotationChange = (newRotation: number) => {
    setRotation((prev) => (prev + newRotation) % 360);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <div className="text-gray-600">Carregando PDF...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <div className="text-lg font-semibold mb-2">Erro ao carregar PDF</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      ref={containerRef}
      className={`pdf-viewer-pro ${className}`}
      style={{ width, height, position: 'relative' }}
    >
      {/* Controles superiores */}
      {showNavigation && (
        <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              ← Anterior
            </button>
            <span className="text-sm">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              Próxima →
            </button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleScaleChange('auto')}
              className={`px-3 py-1 rounded ${scale === 'auto' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
            >
              Fit Width
            </button>
            <button
              onClick={() => handleScaleChange(scale * 0.8)}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              -
            </button>
            <span className="text-sm">{Math.round((scale || 1) * 100)}%</span>
            <button
              onClick={() => handleScaleChange((scale || 1) * 1.2)}
              className="px-2 py-1 bg-gray-300 rounded"
            >
              +
            </button>
            <button
              onClick={() => handleRotationChange(90)}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              ↻ Rotate
            </button>
          </div>
        </div>
      )}
      
      {/* Busca */}
      {showSearch && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar no documento..."
              className="flex-1 px-3 py-1 border rounded"
              onKeyPress={(e) => e.key === 'Enter' && searchText(searchTerm)}
            />
            <button
              onClick={() => searchText(searchTerm)}
              disabled={isSearching}
              className="px-4 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
            {searchResults.length > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={goToPrevSearchResult}
                  className="px-2 py-1 bg-gray-300 rounded"
                >
                  ←
                </button>
                <span className="text-sm">
                  {currentSearchIndex + 1} de {searchResults.length}
                </span>
                <button
                  onClick={goToNextSearchResult}
                  className="px-2 py-1 bg-gray-300 rounded"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="flex h-full">
        {/* Thumbnails */}
        {showThumbnails && (
          <div className="w-48 bg-gray-100 border-r overflow-y-auto">
            <div className="p-2">
              <h3 className="font-semibold mb-2">Páginas</h3>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <div
                  key={pageNum}
                  ref={(el) => {
                    if (el) pageRefs.current[pageNum] = el;
                    if (observerRef.current && el) {
                      observerRef.current.observe(el);
                    }
                  }}
                  data-page={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`mb-2 p-2 border rounded cursor-pointer ${
                    pageNum === currentPage ? 'bg-blue-100 border-blue-300' : 'bg-white'
                  }`}
                >
                  <div className="text-xs text-gray-600 mb-1">Página {pageNum}</div>
                  {thumbnails[pageNum] ? (
                    <img
                      src={thumbnails[pageNum]}
                      alt={`Página ${pageNum}`}
                      className="w-full h-auto border"
                    />
                  ) : (
                    <div className="w-full h-20 bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                      Carregando...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Outline */}
        {showOutline && outline.length > 0 && (
          <div className="w-64 bg-gray-100 border-r overflow-y-auto">
            <div className="p-2">
              <h3 className="font-semibold mb-2">Sumário</h3>
              <div className="space-y-1">
                {outline.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => item.dest && handlePageChange(item.dest[0])}
                    className="p-1 text-sm cursor-pointer hover:bg-gray-200 rounded"
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Área principal do PDF */}
        <div className="flex-1 overflow-auto bg-gray-200">
          <div className="flex justify-center p-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border shadow-lg bg-white"
                style={{ maxWidth: '100%' }}
              />
              <div
                ref={textLayerRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 10 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfViewerPro;
