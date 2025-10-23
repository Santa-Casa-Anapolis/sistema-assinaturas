import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

// Configurar WebWorker do PDF.js
const setupPDFWorker = async () => {
  const workerOptions = [
    `${window.location.origin}/pdf.worker.min.js`,
    '/pdf.worker.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  ];
  
  for (const workerSrc of workerOptions) {
    try {
      const response = await fetch(workerSrc, { method: 'HEAD' });
      if (response.ok) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
        return;
      }
    } catch (error) {
      console.warn(`⚠️ Worker falhou: ${workerSrc}`);
    }
  }
  throw new Error('Nenhum worker do PDF.js funcionou');
};

// Funções utilitárias para mapeamento de coordenadas
const utils = {
  // Converte coordenadas do mouse para porcentagem da página
  clientToPagePercentage: (clientX, clientY, pageRect, pageDimensions) => {
    const xPct = ((clientX - pageRect.left) / pageRect.width) * 100;
    const yPct = ((clientY - pageRect.top) / pageRect.height) * 100;
    return { xPct: Math.max(0, Math.min(100, xPct)), yPct: Math.max(0, Math.min(100, yPct)) };
  },

  // Converte porcentagem para coordenadas PDF (eixo Y invertido)
  percentageToPDFCoords: (xPct, yPct, pageWidth, pageHeight) => {
    const x = (xPct / 100) * pageWidth;
    const y = pageHeight - ((yPct / 100) * pageHeight); // Inverte Y
    return { x, y };
  },

  // Converte porcentagem para pixels da tela
  percentageToScreenPixels: (xPct, yPct, pageRect) => {
    const x = (xPct / 100) * pageRect.width;
    const y = (yPct / 100) * pageRect.height;
    return { x, y };
  }
};

const PDFSignatureViewer = ({ pdfUrl, onExport }) => {
  // Estados principais
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [signatures, setSignatures] = useState({}); // { pageNumber: [{ id, xPct, yPct, wPct, hPct, text }] }
  const [isDragging, setIsDragging] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  // Refs para performance
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const dragStartRef = useRef(null);
  const dragOffsetRef = useRef(null);
  const rafRef = useRef(null);
  const pageDimensionsRef = useRef({});

  // Inicializar PDF.js Worker
  useEffect(() => {
    setupPDFWorker().catch(console.error);
  }, []);

  // Carregar PDF
  const loadPDF = useCallback(async () => {
    try {
      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      setCurrentPage(1);
      
    } catch (error) {
      console.error('❌ Erro ao carregar PDF:', error);
    }
  }, [pdfUrl]);

  // Renderizar página do PDF
  const renderPage = useCallback(async (pageNumber, targetScale = scale) => {
    if (!pdfDocument) return;

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = canvasRef.current;
      if (!canvas) return;

      const viewport = page.getViewport({ scale: targetScale });
      
      // Salvar dimensões da página para cálculos
      pageDimensionsRef.current[pageNumber] = {
        width: viewport.width,
        height: viewport.height
      };

      // Configurar canvas
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Renderizar página
      const context = canvas.getContext('2d');
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error(`❌ Erro ao renderizar página ${pageNumber}:`, error);
    }
  }, [pdfDocument, scale]);

  // Carregar PDF quando URL muda
  useEffect(() => {
    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl, loadPDF]);

  // Renderizar página quando necessário
  useEffect(() => {
    if (pdfDocument) {
      renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, renderPage]);

  // Adicionar nova assinatura
  const addSignature = useCallback((pageNumber, xPct, yPct) => {
    const newId = `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSignature = {
      id: newId,
      xPct,
      yPct,
      wPct: 15, // 15% da largura da página
      hPct: 8,  // 8% da altura da página
      text: `Assinatura ${Object.keys(signatures).length + 1}`
    };

    setSignatures(prev => ({
      ...prev,
      [pageNumber]: [...(prev[pageNumber] || []), newSignature]
    }));

    return newId;
  }, [signatures]);

  // Iniciar arraste
  const handlePointerDown = useCallback((e, signatureId) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = overlayRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    // Encontrar a assinatura sendo arrastada
    const pageSignatures = signatures[currentPage] || [];
    const signature = pageSignatures.find(s => s.id === signatureId);
    if (!signature) return;

    // Calcular offset inicial
    const currentPos = utils.percentageToScreenPixels(signature.xPct, signature.yPct, rect);
    dragOffsetRef.current = {
      x: startX - currentPos.x,
      y: startY - currentPos.y
    };

    dragStartRef.current = { x: startX, y: startY };
    setIsDragging(true);
    setDraggingId(signatureId);
    
    // Desabilitar pointer events no canvas durante o arraste
    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = 'none';
    }
  }, [signatures, currentPage]);

  // Atualizar posição durante arraste (com requestAnimationFrame)
  const updateDragPosition = useCallback((clientX, clientY) => {
    if (!isDragging || !draggingId || !overlayRef.current) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const adjustedX = clientX - dragOffsetRef.current.x;
    const adjustedY = clientY - dragOffsetRef.current.y;
    
    // Converter para porcentagem
    const { xPct, yPct } = utils.clientToPagePercentage(adjustedX, adjustedY, rect, {});
    
    // Cancelar RAF anterior
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    
    // Atualizar posição via RAF para 60fps
    rafRef.current = requestAnimationFrame(() => {
      // Atualizar transform diretamente no DOM (sem setState)
      const element = document.getElementById(`signature-${draggingId}`);
      if (element) {
        const screenPos = utils.percentageToScreenPixels(xPct, yPct, rect);
        element.style.transform = `translate(${screenPos.x}px, ${screenPos.y}px)`;
      }
    });
  }, [isDragging, draggingId]);

  // Finalizar arraste
  const handlePointerUp = useCallback((e) => {
    if (!isDragging || !draggingId) return;

    const rect = overlayRef.current.getBoundingClientRect();
    const adjustedX = e.clientX - dragOffsetRef.current.x;
    const adjustedY = e.clientY - dragOffsetRef.current.y;
    
    // Converter para porcentagem final
    const { xPct, yPct } = utils.clientToPagePercentage(adjustedX, adjustedY, rect, {});
    
    // Atualizar estado com posição final
    setSignatures(prev => ({
      ...prev,
      [currentPage]: prev[currentPage]?.map(sig => 
        sig.id === draggingId 
          ? { ...sig, xPct, yPct }
          : sig
      ) || []
    }));

    // Limpar estado de arraste
    setIsDragging(false);
    setDraggingId(null);
    dragStartRef.current = null;
    dragOffsetRef.current = null;
    
    // Reabilitar pointer events no canvas
    if (canvasRef.current) {
      canvasRef.current.style.pointerEvents = 'auto';
    }
    
    // Cancelar RAF
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [isDragging, draggingId, currentPage]);

  // Event listeners para arraste
  useEffect(() => {
    const handlePointerMove = (e) => updateDragPosition(e.clientX, e.clientY);
    
    if (isDragging) {
      document.addEventListener('pointermove', handlePointerMove, { passive: false });
      document.addEventListener('pointerup', handlePointerUp, { passive: false });
      
      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [isDragging, updateDragPosition, handlePointerUp]);

  // Limpar RAF no unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  // Clique na página para adicionar assinatura
  const handlePageClick = useCallback((e) => {
    if (isDragging) return; // Não adicionar durante arraste
    
    const rect = overlayRef.current.getBoundingClientRect();
    const { xPct, yPct } = utils.clientToPagePercentage(e.clientX, e.clientY, rect, {});
    
    addSignature(currentPage, xPct, yPct);
  }, [isDragging, currentPage, addSignature]);

  // Exportar PDF com assinaturas
  const exportPDF = useCallback(async () => {
    if (!pdfDocument) return;

    try {
      
      // Criar novo PDF com pdf-lib
      const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Aplicar assinaturas em cada página
      for (const pageNum of Object.keys(signatures)) {
        const pageSignatures = signatures[pageNum];
        if (!pageSignatures?.length) continue;
        
        const page = pdfDoc.getPages()[parseInt(pageNum) - 1];
        const { width, height } = page.getSize();
        
        // Desenhar cada assinatura
        for (const sig of pageSignatures) {
          const { x, y } = utils.percentageToPDFCoords(sig.xPct, sig.yPct, width, height);
          const sigWidth = (sig.wPct / 100) * width;
          const sigHeight = (sig.hPct / 100) * height;
          
          // Desenhar retângulo representando a assinatura
          page.drawRectangle({
            x,
            y: y - sigHeight, // Ajustar para eixo Y invertido
            width: sigWidth,
            height: sigHeight,
            borderColor: rgb(0, 0, 1),
            borderWidth: 2,
          });
          
          // Adicionar texto
          page.drawText(sig.text, {
            x: x + 5,
            y: y - sigHeight + 5,
            size: 12,
            color: rgb(0, 0, 1),
          });
        }
      }
      
      // Salvar PDF
      const pdfBytesFinal = await pdfDoc.save();
      
      // Criar download
      const blob = new Blob([pdfBytesFinal], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documento-assinado-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (onExport) onExport(pdfBytesFinal);
    } catch (error) {
      console.error('❌ Erro ao exportar PDF:', error);
    }
  }, [pdfDocument, signatures, pdfUrl, onExport]);

  // Renderizar assinatura
  const renderSignature = useCallback((signature, pageRect) => {
    const screenPos = utils.percentageToScreenPixels(signature.xPct, signature.yPct, pageRect);
    const screenWidth = (signature.wPct / 100) * pageRect.width;
    const screenHeight = (signature.hPct / 100) * pageRect.height;
    
    return (
      <div
        key={signature.id}
        id={`signature-${signature.id}`}
        className="absolute cursor-move select-none"
        style={{
          left: screenPos.x,
          top: screenPos.y,
          width: screenWidth,
          height: screenHeight,
          border: '2px dashed #3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#3B82F6',
          zIndex: 20,
          transform: `translate(0px, 0px)`, // Inicial
        }}
        onPointerDown={(e) => handlePointerDown(e, signature.id)}
      >
        {signature.text}
      </div>
    );
  }, [handlePointerDown]);

  if (!pdfDocument) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-600">Carregando PDF...</div>
      </div>
    );
  }

  const pageRect = overlayRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
  const pageSignatures = signatures[currentPage] || [];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Controles */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
          >
            ← Anterior
          </button>
          <span className="text-sm font-medium">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50"
          >
            Próxima →
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setScale(Math.max(0.5, scale - 0.25))}
            className="px-2 py-1 bg-gray-300 text-gray-700 rounded"
          >
            -
          </button>
          <span className="text-sm">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(Math.min(3.0, scale + 0.25))}
            className="px-2 py-1 bg-gray-300 text-gray-700 rounded"
          >
            +
          </button>
          
          <button
            onClick={exportPDF}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Viewer */}
      <div className="relative border border-gray-300 bg-white">
        {/* Canvas do PDF (camada inferior) */}
        <canvas
          ref={canvasRef}
          className="block"
          style={{ 
            width: '100%',
            height: 'auto',
            // NUNCA aplicar transform aqui para evitar stacking context
          }}
        />
        
        {/* Overlay para assinaturas (camada superior) */}
        <div
          ref={overlayRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ zIndex: 10 }}
          onClick={handlePageClick}
        >
          {/* Renderizar assinaturas da página atual */}
          {pageSignatures.map(signature => 
            renderSignature(signature, pageRect)
          )}
        </div>
      </div>

      {/* Instruções */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-blue-800">
          📝 Como usar:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Clique na página</strong> para adicionar uma assinatura</li>
          <li>• <strong>Arraste a assinatura</strong> para reposicioná-la</li>
          <li>• <strong>Use o zoom</strong> para posicionar com mais precisão</li>
          <li>• <strong>Navegue entre páginas</strong> para adicionar assinaturas em outras páginas</li>
          <li>• <strong>Exporte o PDF</strong> para salvar com as assinaturas aplicadas</li>
        </ul>
      </div>
    </div>
  );
};

export default PDFSignatureViewer;
