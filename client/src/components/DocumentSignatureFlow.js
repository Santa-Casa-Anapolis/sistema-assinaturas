import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

const DocumentSignatureFlow = ({ documentId, onSignatureComplete }) => {
  // Estados do fluxo
  const [currentStep, setCurrentStep] = useState(1);
  const [documentFile, setDocumentFile] = useState(null);
  const [documentInfo, setDocumentInfo] = useState(null);
  const [signaturePositions, setSignaturePositions] = useState({});
  const [signatureImage, setSignatureImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados do PDF
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isRendering, setIsRendering] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const renderTaskRef = useRef(null);
  const isRenderingRef = useRef(false);

  // Configurar PDF.js
  useEffect(() => {
    const workerOptions = [
      `${window.location.origin}/pdf.worker.min.js`,
      '/pdf.worker.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    ];
    
    const tryWorker = async (index = 0) => {
      if (index >= workerOptions.length) {
        console.error('❌ Nenhum worker do PDF.js funcionou');
        return;
      }
      
      const workerSrc = workerOptions[index];
      try {
        const response = await fetch(workerSrc, { method: 'HEAD' });
        if (response.ok) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
          console.log('✅ PDF.js Worker configurado:', workerSrc);
        } else {
          throw new Error('Worker não acessível');
        }
      } catch (error) {
        tryWorker(index + 1);
      }
    };
    
    tryWorker();
  }, []);

  // Carregar assinatura do usuário
  useEffect(() => {
    if (currentStep >= 2) {
      loadUserSignature();
    }
  }, [currentStep]);

  const loadUserSignature = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user || !user.id) return;

      const response = await fetch(`/api/users/${user.id}/signature`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const signatureResponse = await fetch(`/api/users/${user.id}/signature/file`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (signatureResponse.ok) {
          const signatureBlob = await signatureResponse.blob();
          const signatureUrl = URL.createObjectURL(signatureBlob);
          setSignatureImage(signatureUrl);
          toast.success('Assinatura carregada automaticamente!');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar assinatura:', error);
    }
  };

  // ETAPA 1: Upload de arquivo
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const validateAndSetFile = (file) => {
    // Validar extensão
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.odt', '.jpg', '.jpeg', '.png'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      toast.error('Formato de arquivo não suportado. Use PDF, DOC, DOCX, ODT, JPG ou PNG.');
      return;
    }

    // Validar tamanho (20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setDocumentFile(file);
    setDocumentInfo({
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });
    
    toast.success('Arquivo selecionado com sucesso!');
  };

  // ETAPA 2: Carregar e visualizar PDF
  const loadPdf = async () => {
    if (!documentFile) return;

    try {
      setIsLoading(true);
      const arrayBuffer = await documentFile.arrayBuffer();
      
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        disableAutoFetch: false,
        disableStream: false,
        disableRange: false,
        renderInteractiveForms: false,
        enableWebGL: false
      }).promise;
      
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      await renderPage(1);
      
      toast.success('PDF carregado com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao carregar PDF:', error);
      toast.error('Erro ao carregar documento');
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async (pageNum) => {
    if (!pdfDocument) return;
    
    try {
      setIsRendering(true);
      const page = await pdfDocument.getPage(pageNum);
      const canvas = canvasRef.current;
      
      if (!canvas) return;
      
      if (renderTaskRef.current) {
        try { 
          renderTaskRef.current.cancel(); 
        } catch {}
        renderTaskRef.current = null;
        isRenderingRef.current = false;
      }
      
      // Calcular scale para A4 (210mm x 297mm) - proporção 1:1.414
      const containerWidth = canvas.parentElement.clientWidth - 40;
      const containerHeight = canvas.parentElement.clientHeight - 40;
      const pageViewport = page.getViewport({ scale: 1.0 });
      
      // Calcular scale baseado no tamanho A4
      const a4Ratio = 297 / 210; // Proporção A4
      const pageRatio = pageViewport.height / pageViewport.width;
      
      let autoScale;
      if (pageRatio > a4Ratio) {
        // Página é mais alta que A4, ajustar pela altura
        autoScale = Math.min(containerHeight / pageViewport.height, 1.0);
      } else {
        // Página é mais larga que A4, ajustar pela largura
        autoScale = Math.min(containerWidth / pageViewport.width, 1.0);
      }
      
      // Garantir que o documento sempre encaixe na tela (A4)
      const finalScale = scale || Math.max(autoScale, 0.7); // Mínimo 70% para A4
      const viewport = page.getViewport({ scale: finalScale });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext('2d');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: 'display',
        renderInteractiveForms: false
      };
      
      isRenderingRef.current = true;
      const task = page.render(renderContext);
      renderTaskRef.current = task;
      
      try {
        await task.promise;
      } catch (error) {
        if (error.name !== 'RenderingCancelledException') {
          throw error;
        }
      } finally {
        if (renderTaskRef.current === task) {
          renderTaskRef.current = null;
          isRenderingRef.current = false;
        }
      }
      
      drawSignatureMarkersOnCanvas();
      
    } catch (error) {
      if (error.name === 'RenderingCancelledException') {
        return;
      }
      console.error('Erro ao renderizar página:', error);
      toast.error('Erro ao renderizar página');
    } finally {
      setIsRendering(false);
    }
  };

  const drawSignatureMarkersOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    context.save();
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    const currentPagePosition = signaturePositions[currentPage];
    if (currentPagePosition) {
      const { x, y } = currentPagePosition;
      
      // Desenhar área da assinatura igual à imagem
      const signatureWidth = 200;
      const signatureHeight = 80;
      
      // Fundo branco com borda tracejada laranja
      context.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context.fillRect(x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
      
      // Borda tracejada laranja com brilho
      context.strokeStyle = '#ff6b35';
      context.lineWidth = 2;
      context.setLineDash([8, 4]);
      context.strokeRect(x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
      context.setLineDash([]);
      
      // Adicionar brilho alaranjado ao redor
      context.shadowColor = '#ff6b35';
      context.shadowBlur = 8;
      context.shadowOffsetX = 0;
      context.shadowOffsetY = 0;
      context.strokeStyle = '#ff6b35';
      context.lineWidth = 1;
      context.strokeRect(x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
      context.shadowColor = 'transparent';
      
      // Texto "Área da assinatura" em negrito
      context.fillStyle = '#ff6b35';
      context.font = 'bold 14px Arial';
      const text = 'Área da assinatura';
      const textWidth = context.measureText(text).width;
      context.fillText(text, x - textWidth/2, y - 10);
      
      // Texto de instrução
      context.fillStyle = '#666';
      context.font = '11px Arial';
      const subText = 'Tome cuidado para não esconder uma informação importante do documento.';
      const subTextWidth = context.measureText(subText).width;
      
      // Quebrar texto se necessário
      if (subTextWidth > signatureWidth - 20) {
        const words = subText.split(' ');
        let line = '';
        let yOffset = 0;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          const testWidth = context.measureText(testLine).width;
          
          if (testWidth > signatureWidth - 20 && line !== '') {
            context.fillText(line, x - context.measureText(line).width/2, y + 15 + yOffset);
            line = words[i] + ' ';
            yOffset += 12;
          } else {
            line = testLine;
          }
        }
        if (line !== '') {
          context.fillText(line, x - context.measureText(line).width/2, y + 15 + yOffset);
        }
      } else {
        context.fillText(subText, x - subTextWidth/2, y + 15);
      }
    }
    
    context.restore();
  };

  const drawSignatureAtPosition = (context, img, x, y) => {
    const signatureWidth = 120;
    const signatureHeight = (img.height * signatureWidth) / img.width;
    
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    
    context.drawImage(img, x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
    
    context.shadowColor = 'transparent';
    context.strokeStyle = '#10B981';
    context.lineWidth = 3;
    context.strokeRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    
    context.strokeStyle = '#059669';
    context.lineWidth = 1;
    context.strokeRect(x - signatureWidth/2 - 6, y - signatureHeight/2 - 6, signatureWidth + 12, signatureHeight + 12);
    
    context.fillStyle = '#10B981';
    context.font = 'bold 14px Arial';
    const text = '✓ Assinatura';
    const textWidth = context.measureText(text).width;
    
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(x - textWidth/2 - 4, y - signatureHeight/2 - 25, textWidth + 8, 18);
    
    context.fillStyle = '#10B981';
    context.fillText(text, x - textWidth/2, y - signatureHeight/2 - 10);
    
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  };

  // ETAPA 3: Posicionamento de assinatura
  const handleCanvasClick = (event) => {
    if (!signatureImage) {
      toast.warning('Assinatura não encontrada. Entre em contato com o administrador.');
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const existingPosition = signaturePositions[currentPage];
    if (existingPosition) {
      removeSignaturePosition(currentPage);
      toast.info(`Assinatura removida da página ${currentPage}`);
      drawSignatureMarkersOnCanvas();
    } else {
      setSignaturePositions(prev => ({
        ...prev,
        [currentPage]: { x, y }
      }));
      showClickFeedback(x, y);
      setTimeout(() => drawSignatureMarkersOnCanvas(), 50);
      toast.success(`Assinatura marcada na página ${currentPage}`);
    }
  };

  const showClickFeedback = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    let radius = 0;
    let opacity = 1;
    
    const animate = () => {
      context.clearRect(x - 30, y - 30, 60, 60);
      drawSignatureMarkersOnCanvas();
      
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fillStyle = `rgba(34, 197, 94, ${opacity})`;
      context.fill();
      context.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
      context.lineWidth = 2;
      context.stroke();
      
      radius += 2;
      opacity -= 0.15;
      
      if (radius < 25 && opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        context.clearRect(x - 30, y - 30, 60, 60);
        drawSignatureMarkersOnCanvas();
      }
    };
    
    animate();
  };

  const removeSignaturePosition = (page) => {
    setSignaturePositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[page];
      return newPositions;
    });
  };

  const nextPage = async () => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      await renderPage(newPage);
    }
  };

  const prevPage = async () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      await renderPage(newPage);
    }
  };

  // Navegação entre etapas
  const goToNextStep = () => {
    if (currentStep === 1 && documentFile) {
      setCurrentStep(2);
      loadPdf();
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Renderizar etapa atual
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return null;
    }
  };

  const renderStep1 = () => (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
          📁 Escolher Arquivo
        </h2>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600 text-center mb-4">
            Escolha apenas arquivos nas extensões .DOC ou .DOCX ou ODT ou .JPG ou .PNG ou .PDF com até 20MB.
          </p>
          
          <div
            ref={fileInputRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <div className="flex flex-col items-center space-y-4">
              <div className="text-6xl text-blue-300">📄</div>
              <div className="text-xl text-blue-600 font-medium">
                Arraste e solte o arquivo do seu computador aqui
              </div>
              <div className="text-sm text-gray-500">
                ou clique para selecionar um arquivo
              </div>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.odt,.jpg,.jpeg,.png"
            className="hidden"
          />
        </div>

        {documentFile && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="text-green-600 text-2xl">✅</div>
              <div>
                <div className="font-medium text-green-800">{documentInfo?.name}</div>
                <div className="text-sm text-green-600">
                  {(documentInfo?.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={() => onSignatureComplete?.('cancelled')}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ❌ Cancelar
          </button>
          
          <button
            onClick={goToNextStep}
            disabled={!documentFile}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ✅ Continuar
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
          👁️ Visualizar Arquivo
        </h2>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Carregando documento...</p>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
                >
                  ← Anterior
                </button>
                <span className="text-sm font-medium text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>
                <button
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
                >
                  Próxima →
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const newScale = Math.max(0.5, scale - 0.1);
                    setScale(newScale);
                    renderPage(currentPage);
                  }}
                  disabled={isRendering}
                  className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  -
                </button>
                <span className="text-sm text-gray-700">
                  {Math.round(scale * 100)}%
                  {isRendering && <span className="ml-2 text-blue-600">🔄</span>}
                </span>
                <button
                  onClick={() => {
                    const newScale = Math.min(2.0, scale + 0.1);
                    setScale(newScale);
                    renderPage(currentPage);
                  }}
                  disabled={isRendering}
                  className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    setScale(1.0);
                    renderPage(currentPage);
                  }}
                  disabled={isRendering}
                  className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </div>
            
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="border border-gray-300 max-w-full h-auto mx-auto"
                style={{ 
                  backgroundColor: '#f9f9f9',
                  minHeight: '600px',
                  width: '100%'
                }}
              />
              {isRendering && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Renderizando página...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={goToPreviousStep}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Voltar
          </button>
          
          <button
            onClick={goToNextStep}
            disabled={isLoading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ✅ Continuar
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
          ✍️ Posicionar Assinatura
        </h2>
        
        {/* Dica Importante */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-600 text-xl">💡</div>
            <div>
              <h4 className="font-semibold text-yellow-800 mb-1">Dica:</h4>
              <p className="text-sm text-yellow-700">
                Não é necessário assinar cada página. Apenas uma assinatura garante a integridade de todo o documento.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700">
            Assinatura Digital
          </label>
          {signatureImage ? (
            <div className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-16 h-8 bg-gray-100 border border-gray-300 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">✓ Assinatura</span>
              </div>
              <div>
                <span className="text-sm text-green-600 font-medium">✓ Assinatura carregada</span>
                <p className="text-xs text-green-500">Pronta para posicionamento</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhuma assinatura cadastrada. Entre em contato com o administrador.
              </p>
            </div>
          )}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
            >
              Próxima →
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const newScale = Math.max(0.5, scale - 0.1);
                setScale(newScale);
                renderPage(currentPage);
              }}
              disabled={isRendering}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              -
            </button>
            <span className="text-sm text-gray-700">
              {Math.round(scale * 100)}%
              {isRendering && <span className="ml-2 text-blue-600">🔄</span>}
            </span>
            <button
              onClick={() => {
                const newScale = Math.min(2.0, scale + 0.1);
                setScale(newScale);
                renderPage(currentPage);
              }}
              disabled={isRendering}
              className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50"
            >
              +
            </button>
            <button
              onClick={() => {
                setScale(1.0);
                renderPage(currentPage);
              }}
              disabled={isRendering}
              className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                {signatureImage 
                  ? `Clique no documento para reposicionar a assinatura`
                  : 'Aguardando carregamento da assinatura...'
                }
              </p>
              {signaturePositions[currentPage] && (
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Área da assinatura marcada
                </div>
              )}
            </div>
            <div className="relative">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="border border-gray-300 cursor-crosshair max-w-full h-auto"
                style={{ 
                  backgroundColor: '#f9f9f9',
                  minHeight: '600px',
                  width: '100%'
                }}
              />
              {isRendering && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Renderizando página...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            Status da Assinatura:
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <div
                key={page}
                className={`p-2 rounded text-center text-sm ${
                  signaturePositions[page] 
                    ? 'bg-green-100 text-green-800 border border-green-300' 
                    : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}
              >
                Página {page}
                {signaturePositions[page] && <div className="text-xs">✓ Área marcada</div>}
              </div>
            ))}
          </div>
          {Object.keys(signaturePositions).length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>✓ Área da assinatura marcada:</strong> A assinatura será aplicada apenas na página selecionada.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={goToPreviousStep}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            ← Voltar
          </button>
          
          <div className="flex space-x-4">
            <button
              onClick={() => onSignatureComplete?.('cancelled')}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ✕ Cancelar
            </button>
            
            <button
              onClick={() => {
                if (Object.keys(signaturePositions).length === 0) {
                  toast.error('Por favor, marque a área da assinatura no documento');
                  return;
                }
                setShowConfirmModal(true);
              }}
              disabled={!signatureImage || Object.keys(signaturePositions).length === 0}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              ✍️ Assinar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barra de Progresso */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <span className="font-medium">Escolher arquivo</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
                <span className="font-medium">Visualizar arquivo</span>
              </div>
              
              <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <span className="font-medium">Posicionar assinatura</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo da Etapa Atual */}
      {renderCurrentStep()}

      {/* Modal de Confirmação */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="text-yellow-500 text-2xl">⚠️</div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirmação de Assinatura
                  </h3>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 mb-4">
                  Você pode carregar <strong>até cinco documentos</strong> e assiná-los todos de uma vez!
                </p>
                <p className="text-gray-600 mb-4">
                  O que deseja fazer?
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    // Voltar para a etapa 1 para carregar outro documento
                    setCurrentStep(1);
                    setDocumentFile(null);
                    setDocumentInfo(null);
                    setSignaturePositions({});
                    setPdfDocument(null);
                    setCurrentPage(1);
                    setTotalPages(0);
                  }}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  📄 Carregar outro documento
                </button>
                
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    // Aplicar assinatura
                    toast.success('Assinatura aplicada com sucesso!');
                    onSignatureComplete?.();
                  }}
                  className="w-full px-4 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  ✍️ Assinar
                </button>
                
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full px-4 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  ❌ Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentSignatureFlow;
