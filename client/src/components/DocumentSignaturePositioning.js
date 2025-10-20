import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';

const DocumentSignaturePositioning = ({ documentId, onSignatureComplete }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [signaturePositions, setSignaturePositions] = useState({});
  const [signatureImage, setSignatureImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  // const [pdfUrl, setPdfUrl] = useState(''); // Removido para evitar warning
  const [pdfDocument, setPdfDocument] = useState(null);
  const [scale, setScale] = useState(1.0); // Iniciar em 100% para melhor visualização
  const [isRendering, setIsRendering] = useState(false); // Estado para mostrar quando está renderizando
  // eslint-disable-next-line no-unused-vars
  const [mousePosition, setMousePosition] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  const [showPreview, setShowPreview] = useState(true); // Nova: mostrar prévia primeiro
  const [documentInfo, setDocumentInfo] = useState(null); // Nova: informações do documento
  const [showSignatureArea, setShowSignatureArea] = useState(false); // Nova: mostrar área de assinatura
  
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const isRenderingRef = useRef(false);

  // Função para carregar informações do documento
  const loadDocumentInfo = async () => {
    try {
      console.log('📋 Carregando informações do documento:', documentId);
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const docInfo = await response.json();
        console.log('✅ Informações do documento carregadas:', docInfo);
        setDocumentInfo(docInfo);
      } else {
        console.error('❌ Erro ao carregar informações do documento:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar informações do documento:', error);
    }
  };


  // Configurar PDF.js
  useEffect(() => {
    // Configurar o worker do PDF.js
    // Tentar múltiplas opções para garantir que funcione
    const workerOptions = [
      `${window.location.origin}/pdf.worker.min.js`,
      '/pdf.worker.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
    ];
    
    // Tentar cada opção até encontrar uma que funcione
    const tryWorker = async (index = 0) => {
      if (index >= workerOptions.length) {
        console.error('❌ Nenhum worker do PDF.js funcionou');
        toast.error('Erro ao carregar PDF.js. Recarregue a página.');
        return;
      }
      
      const workerSrc = workerOptions[index];
      console.log(`🔧 Tentando PDF.js Worker ${index + 1}/${workerOptions.length}:`, workerSrc);
      
      try {
        // Testar se o worker está acessível
        const response = await fetch(workerSrc, { method: 'HEAD' });
        if (response.ok) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
          console.log('✅ PDF.js Worker configurado com sucesso:', workerSrc);
        } else {
          throw new Error('Worker não acessível');
        }
      } catch (error) {
        console.log(`❌ Worker ${index + 1} falhou:`, error.message);
        tryWorker(index + 1);
      }
    };
    
    tryWorker();
  }, []);

  // Carregar informações do documento, PDF e assinatura quando o componente monta
  useEffect(() => {
    if (documentId) {
      loadDocumentInfo();
      loadPdf();
      loadUserSignature();
    }
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-renderizar quando o zoom mudar
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (pdfDocument && !cancelled) {
        await renderPage(currentPage);
      }
    })();
    
    return () => { 
      cancelled = true; 
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [scale, pdfDocument, currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Atalhos de teclado para melhor experiência
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Evitar atalhos quando estiver digitando em inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          if (!isRendering) {
            const newScale = Math.min(2.0, scale + 0.1);
            setScale(newScale);
            renderPage(currentPage);
          }
          break;
        case '-':
          event.preventDefault();
          if (!isRendering) {
            const newScale = Math.max(0.5, scale - 0.1);
            setScale(newScale);
            renderPage(currentPage);
          }
          break;
        case '0':
          event.preventDefault();
          if (!isRendering) {
            setScale(1.0);
            renderPage(currentPage);
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (currentPage > 1) {
            prevPage();
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (currentPage < totalPages) {
            nextPage();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [scale, currentPage, totalPages, isRendering]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPdf = async () => {
    try {
      console.log('🔍 Carregando PDF para documento:', documentId);
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📡 Fazendo requisição para visualizar documento...');
      const response = await fetch(`/api/documents/${documentId}/view?token=${token}`);
      
      console.log('📡 Resposta do documento:', response.status);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log('✅ Blob recebido, tamanho:', blob.size);
        const arrayBuffer = await blob.arrayBuffer();
        
        console.log('📄 Carregando PDF com PDF.js (otimizado)...');
        // Carregar PDF com PDF.js - configurações otimizadas
        const pdf = await pdfjsLib.getDocument({ 
          data: arrayBuffer,
          // Configurações de performance
          disableAutoFetch: false,
          disableStream: false,
          disableRange: false,
          // Configurações de renderização
          renderInteractiveForms: false,
          enableWebGL: false
        }).promise;
        console.log('✅ PDF carregado, páginas:', pdf.numPages);
        
        setPdfDocument(pdf);
        setTotalPages(pdf.numPages);
        
        // Renderizar primeira página
        console.log('🎨 Renderizando primeira página...');
        await renderPage(1);
        
        toast.success('PDF carregado com sucesso!');
      } else {
        console.error('❌ Erro ao carregar documento:', response.status);
        
        if (response.status === 404) {
          toast.error('Documento não encontrado. Verifique se o documento existe e se você tem permissão para acessá-lo.');
          console.log('🔍 Tentando carregar documento alternativo...');
          // Tentar carregar documento alternativo
          try {
            const altResponse = await fetch(`/api/documents/${documentId}/download?token=${token}`);
            if (altResponse.ok) {
              console.log('✅ Documento encontrado via endpoint alternativo');
              const blob = await altResponse.blob();
              const arrayBuffer = await blob.arrayBuffer();
              const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
              setPdfDocument(pdf);
              setTotalPages(pdf.numPages);
              await renderPage(1);
              toast.success('PDF carregado via endpoint alternativo!');
              return;
            }
          } catch (altError) {
            console.error('❌ Erro no endpoint alternativo:', altError);
          }
        } else if (response.status === 401) {
          toast.error('Token de autenticação inválido. Faça login novamente.');
        } else {
          const errorText = await response.text();
          console.error('❌ Detalhes do erro:', errorText);
          toast.error(`Erro ao carregar documento: ${response.status} - ${response.statusText}`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar PDF:', error);
      toast.error('Erro ao carregar documento');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserSignature = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      console.log('🔍 Carregando assinatura do usuário:', user);
      
      if (!user || !user.id) {
        console.log('❌ Usuário não encontrado no localStorage');
        return;
      }

      console.log('📡 Buscando dados da assinatura...');
      const response = await fetch(`/api/users/${user.id}/signature`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📡 Resposta da assinatura:', response.status);

      if (response.ok) {
        const signatureData = await response.json();
        console.log('✅ Dados da assinatura:', signatureData);
        
        // Buscar o arquivo de assinatura
        console.log('📡 Buscando arquivo da assinatura...');
        const signatureResponse = await fetch(`/api/users/${user.id}/signature/file`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('📡 Resposta do arquivo:', signatureResponse.status);

        if (signatureResponse.ok) {
          const signatureBlob = await signatureResponse.blob();
          const signatureUrl = URL.createObjectURL(signatureBlob);
          console.log('✅ Assinatura carregada:', signatureUrl);
          setSignatureImage(signatureUrl);
          toast.success('Assinatura carregada automaticamente!');
        } else if (signatureResponse.status === 404) {
          console.log('⚠️ Arquivo de assinatura não encontrado (404)');
          setSignatureImage(null);
          toast.info('Arquivo de assinatura não encontrado. Entre em contato com o administrador.');
        } else {
          console.error('❌ Erro ao carregar arquivo da assinatura:', signatureResponse.status);
          setSignatureImage(null);
        }
      } else if (response.status === 404) {
        console.log('⚠️ Usuário não possui assinatura cadastrada');
        setSignatureImage(null);
        toast.info('Nenhuma assinatura cadastrada. Entre em contato com o administrador.');
      } else {
        console.error('❌ Erro ao carregar assinatura:', response.status);
        setSignatureImage(null);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar assinatura do usuário:', error);
      setSignatureImage(null);
    }
  };

  const renderPage = async (pageNum) => {
    if (!pdfDocument) return;
    
    try {
      setIsRendering(true); // Mostrar que está renderizando
      const page = await pdfDocument.getPage(pageNum);
      const canvas = canvasRef.current;
      
      if (!canvas) return;
      
      // Se já existe um render em andamento, cancela
      if (renderTaskRef.current) {
        try { 
          renderTaskRef.current.cancel(); 
        } catch {}
        try { 
          await renderTaskRef.current.promise; 
        } catch {} // swallow cancel error
        renderTaskRef.current = null;
        isRenderingRef.current = false;
      }
      
      // Calcular scale automático baseado no container para melhor encaixe
      const containerWidth = canvas.parentElement.clientWidth - 40; // 40px de padding
      const pageViewport = page.getViewport({ scale: 1.0 });
      
      // Calcular scale automático para encaixar bem na tela
      const autoScale = Math.min(containerWidth / pageViewport.width, 1.2); // Máximo 120%
      const finalScale = scale || Math.max(autoScale, 0.9); // Mínimo 90% para boa visualização
      const viewport = page.getViewport({ scale: finalScale });
      
      // Redimensionar canvas
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const context = canvas.getContext('2d');
      
      // Configurar contexto para melhor qualidade e performance
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        intent: 'display', // Otimizado para exibição
        renderInteractiveForms: false // Desabilitar formulários interativos para melhor performance
      };
      
      // Renderizar página e salvar a task
      isRenderingRef.current = true;
      const task = page.render(renderContext);
      renderTaskRef.current = task;
      
      try {
        await task.promise;
      } catch (error) {
        // Ignorar erros de cancelamento
        if (error.name !== 'RenderingCancelledException') {
          throw error;
        }
      } finally {
        // apenas zera se esse ainda for o task atual
        if (renderTaskRef.current === task) {
          renderTaskRef.current = null;
          isRenderingRef.current = false;
        }
      }
      
      // Desenhar marcadores após renderização (sem setTimeout para ser mais rápido)
      drawSignatureMarkersOnCanvas();
      
    } catch (error) {
      // Ignorar erros de cancelamento de renderização
      if (error.name === 'RenderingCancelledException') {
        console.log('Renderização cancelada (comportamento normal)');
        return;
      }
      console.error('Erro ao renderizar página:', error);
      toast.error('Erro ao renderizar página');
    } finally {
      setIsRendering(false); // Sempre parar o indicador de renderização
    }
  };


  // Cache da imagem de assinatura para evitar recarregar
  const signatureImageCacheRef = useRef(null);
  
  const drawSignatureMarkersOnCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    
    // Salvar o estado do canvas antes de desenhar os marcadores
    context.save();
    
    // Configurar contexto para melhor qualidade
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    
    // Desenhar marcadores de assinatura apenas da página atual (otimização)
    const currentPagePosition = signaturePositions[currentPage];
    if (currentPagePosition) {
      const { x, y } = currentPagePosition;
      
      // Se temos uma imagem de assinatura, desenhar ela
      if (signatureImage) {
        // Usar cache se disponível
        if (signatureImageCacheRef.current) {
          drawSignatureAtPosition(context, signatureImageCacheRef.current, x, y);
        } else {
          // Carregar e cachear a imagem
        const img = new Image();
        img.onload = () => {
            signatureImageCacheRef.current = img;
            drawSignatureAtPosition(context, img, x, y);
          };
          img.src = signatureImage;
        }
      } else {
        // Fallback: desenhar quadrado verde
          context.fillStyle = 'rgba(34, 197, 94, 0.3)';
          context.fillRect(x - 10, y - 10, 20, 20);
          
          context.strokeStyle = 'rgb(34, 197, 94)';
          context.lineWidth = 2;
          context.strokeRect(x - 10, y - 10, 20, 20);
          
          context.fillStyle = 'rgb(34, 197, 94)';
          context.font = '12px Arial';
          context.fillText('✓', x - 4, y + 4);
        }
      }
    
    
    // Restaurar o estado do canvas
    context.restore();
  };
  
  const drawSignatureAtPosition = (context, img, x, y) => {
    const signatureWidth = 120;
    const signatureHeight = (img.height * signatureWidth) / img.width;
    
    // Desenhar sombra para melhor visibilidade
    context.shadowColor = 'rgba(0, 0, 0, 0.3)';
    context.shadowBlur = 4;
    context.shadowOffsetX = 2;
    context.shadowOffsetY = 2;
    
    // Desenhar fundo semi-transparente com borda mais destacada
    context.fillStyle = 'rgba(255, 255, 255, 0.95)';
    context.fillRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    
    // Desenhar a assinatura
    context.drawImage(img, x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
    
    // Desenhar borda dupla para melhor visibilidade
    context.shadowColor = 'transparent';
    context.strokeStyle = '#10B981';
    context.lineWidth = 3;
    context.strokeRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    
    // Borda interna
    context.strokeStyle = '#059669';
    context.lineWidth = 1;
    context.strokeRect(x - signatureWidth/2 - 6, y - signatureHeight/2 - 6, signatureWidth + 12, signatureHeight + 12);
    
    // Desenhar texto "Assinatura" com fundo
    context.fillStyle = '#10B981';
    context.font = 'bold 14px Arial';
    const text = '✓ Assinatura';
    const textWidth = context.measureText(text).width;
    
    // Fundo para o texto
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(x - textWidth/2 - 4, y - signatureHeight/2 - 25, textWidth + 8, 18);
    
    // Texto
    context.fillStyle = '#10B981';
    context.fillText(text, x - textWidth/2, y - signatureHeight/2 - 10);
    
    // Resetar sombra
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  };

  
  const drawSignaturePreview = (context, img, x, y) => {
    const signatureWidth = 120;
    const signatureHeight = (img.height * signatureWidth) / img.width;
    
    // Desenhar sombra para o preview
    context.shadowColor = 'rgba(0, 0, 0, 0.2)';
    context.shadowBlur = 3;
    context.shadowOffsetX = 1;
    context.shadowOffsetY = 1;
    
    // Desenhar preview semi-transparente com fundo mais visível
    context.globalAlpha = 0.7;
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    
    // Desenhar a assinatura
    context.globalAlpha = 0.8;
    context.drawImage(img, x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
    
    // Desenhar borda tracejada mais visível
    context.globalAlpha = 0.9;
    context.shadowColor = 'transparent';
    context.strokeStyle = '#10B981';
    context.lineWidth = 3;
    context.setLineDash([8, 4]);
    context.strokeRect(x - signatureWidth/2 - 8, y - signatureHeight/2 - 8, signatureWidth + 16, signatureHeight + 16);
    context.setLineDash([]);
    
    // Desenhar texto "Preview" com fundo
    context.fillStyle = '#10B981';
    context.font = 'bold 14px Arial';
    const text = '👁️ Preview';
    const textWidth = context.measureText(text).width;
    
    // Fundo para o texto
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.fillRect(x - textWidth/2 - 4, y - signatureHeight/2 - 25, textWidth + 8, 18);
    
    // Texto
    context.fillStyle = '#10B981';
    context.fillText(text, x - textWidth/2, y - signatureHeight/2 - 10);
    
    // Restaurar estado
    context.globalAlpha = 1;
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetX = 0;
    context.shadowOffsetY = 0;
  };


  const handleCanvasClick = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Se não há assinatura carregada, mostrar apenas a área de posicionamento
    if (!signatureImage) {
      toast.warning('Assinatura não encontrada. Entre em contato com o administrador.');
      
      // Mostrar área de posicionamento mesmo sem assinatura
      const context = canvas.getContext('2d');
      if (context) {
        // Limpar área anterior
        const clearWidth = 200;
        const clearHeight = 100;
        context.clearRect(x - clearWidth/2, y - clearHeight/2, clearWidth, clearHeight);
        
        // Redesenhar marcadores existentes
        drawSignatureMarkersOnCanvas();
      }
      return;
    }

    // Verificar se já existe uma assinatura nesta página
    const existingPosition = signaturePositions[currentPage];
    if (existingPosition) {
      // Se já existe, remover
      removeSignaturePosition(currentPage);
      toast.info(`Assinatura removida da página ${currentPage}`);
      
      // Redesenhar apenas os marcadores (sem re-renderizar a página)
      drawSignatureMarkersOnCanvas();
    } else {
      // Se não existe, adicionar
      setSignaturePositions(prev => ({
        ...prev,
        [currentPage]: { x, y }
      }));

      // Mostrar feedback visual imediato
      showClickFeedback(x, y);

      // Redesenhar marcadores com pequeno delay para melhor performance
      setTimeout(() => drawSignatureMarkersOnCanvas(), 50);

      toast.success(`Assinatura marcada na página ${currentPage}`);
    }
  };

  const showClickFeedback = (x, y) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    
    // Feedback visual mais rápido - menos frames
    let radius = 0;
    let opacity = 1;
    const animate = () => {
      // Limpar apenas uma pequena área ao redor do clique
      context.clearRect(x - 30, y - 30, 60, 60);
      
      // Redesenhar marcadores existentes na área limpa
      drawSignatureMarkersOnCanvas();
      
      // Desenhar feedback
      context.beginPath();
      context.arc(x, y, radius, 0, 2 * Math.PI);
      context.fillStyle = `rgba(34, 197, 94, ${opacity})`;
      context.fill();
      context.strokeStyle = `rgba(34, 197, 94, ${opacity})`;
      context.lineWidth = 2;
      context.stroke();
      
      radius += 2; // Mais rápido
      opacity -= 0.15; // Mais rápido
      
      if (radius < 25 && opacity > 0) {
        requestAnimationFrame(animate);
      } else {
        // Limpar área final e redesenhar marcadores
        context.clearRect(x - 30, y - 30, 60, 60);
        drawSignatureMarkersOnCanvas();
      }
    };
    
    animate();
  };

  // Throttle para movimento do mouse (otimizado)
  const mouseMoveThrottleRef = useRef(null);
  const lastMousePositionRef = useRef(null);
  
  const handleMouseMove = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Atualizar posição do mouse
    setMousePosition({ x, y });
  };

  const handleMouseLeave = () => {
    setShowSignaturePreview(false);
    setShowSignatureArea(false);
    setMousePosition(null);
  };

  // Cache do contexto para evitar múltiplos previews
  const previewContextRef = useRef(null);
  const lastPreviewPositionRef = useRef(null);
  
  const drawSignatureMarkersWithPreview = (previewX, previewY) => {
    const canvas = canvasRef.current;
    if (!canvas || !signatureImage) return;
    
    // Evitar redesenhar se a posição não mudou significativamente
    const lastPos = lastPreviewPositionRef.current;
    if (lastPos && Math.abs(lastPos.x - previewX) < 3 && Math.abs(lastPos.y - previewY) < 3) {
      return;
    }
    
    lastPreviewPositionRef.current = { x: previewX, y: previewY };
    
    const context = canvas.getContext('2d');
    
    // Limpar área do preview anterior de forma mais eficiente
    if (previewContextRef.current) {
      const prevPos = previewContextRef.current;
      const clearWidth = 200; // Área maior para limpeza
      const clearHeight = 100; // Área maior para limpeza
      
      // Salvar estado do contexto
      context.save();
      
      // Limpar área anterior
      context.clearRect(prevPos.x - clearWidth/2, prevPos.y - clearHeight/2, clearWidth, clearHeight);
      
      // Restaurar estado
      context.restore();
    }
    
    // Salvar posição atual do preview
    previewContextRef.current = { x: previewX, y: previewY };
    
    // Redesenhar apenas os marcadores existentes (não a página inteira)
    drawSignatureMarkersOnCanvas();
    
    // Desenhar preview da assinatura
    if (signatureImageCacheRef.current) {
      drawSignaturePreview(context, signatureImageCacheRef.current, previewX, previewY);
    } else {
      // Carregar e cachear a imagem
      const img = new Image();
      img.onload = () => {
        signatureImageCacheRef.current = img;
        // Verificar se ainda está na mesma posição antes de desenhar
        if (showSignaturePreview && lastPreviewPositionRef.current && 
            Math.abs(lastPreviewPositionRef.current.x - previewX) < 3 && 
            Math.abs(lastPreviewPositionRef.current.y - previewY) < 3) {
          drawSignatureMarkersOnCanvas();
          drawSignaturePreview(context, img, previewX, previewY);
        }
      };
      img.src = signatureImage;
      
      // Enquanto carrega, desenhar um preview simples
      drawSimplePreview(context, previewX, previewY);
    }
  };
  
  const drawSimplePreview = (context, x, y) => {
    const signatureWidth = 120;
    const signatureHeight = 60; // Altura padrão
    
    // Desenhar preview simples
    context.globalAlpha = 0.6;
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(x - signatureWidth/2 - 5, y - signatureHeight/2 - 5, signatureWidth + 10, signatureHeight + 10);
    
    // Desenhar borda tracejada
    context.globalAlpha = 0.9;
    context.strokeStyle = '#10B981';
    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    context.strokeRect(x - signatureWidth/2 - 5, y - signatureHeight/2 - 5, signatureWidth + 10, signatureHeight + 10);
    context.setLineDash([]);
    
    // Desenhar texto "Preview"
    context.fillStyle = '#10B981';
    context.font = 'bold 12px Arial';
    context.fillText('👁️ Preview', x - signatureWidth/2, y - signatureHeight/2 - 10);
    
    context.globalAlpha = 1;
    context.restore();
  };

  const removeSignaturePosition = (page) => {
    setSignaturePositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[page];
      return newPositions;
    });
    toast.info(`Assinatura removida da página ${page}`);
  };

  const applySignatures = async () => {
    if (!signatureImage) {
      toast.error('Assinatura não encontrada. Entre em contato com o administrador.');
      return;
    }

    if (Object.keys(signaturePositions).length === 0) {
      toast.error('Por favor, marque pelo menos uma posição de assinatura');
      return;
    }

    try {
      setIsLoading(true);
      
      // Carregar o PDF original
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/documents/${documentId}/view?token=${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Documento não encontrado. Verifique se o documento existe e se você tem permissão para acessá-lo.');
        } else if (response.status === 401) {
          throw new Error('Token de autenticação inválido. Faça login novamente.');
        } else {
          const errorText = await response.text();
          console.error('❌ Detalhes do erro:', errorText);
          throw new Error(`Erro ao carregar documento: ${response.status} ${response.statusText} - ${errorText}`);
        }
      }
      
      const pdfBytes = await response.arrayBuffer();
      
      // Verificar se o arquivo é um PDF válido
      const uint8Array = new Uint8Array(pdfBytes);
      const header = String.fromCharCode.apply(null, uint8Array.slice(0, 4));
      
      if (header !== '%PDF') {
        throw new Error('Arquivo não é um PDF válido. O arquivo deve ter o cabeçalho PDF correto.');
      }
      
      console.log('✅ Arquivo PDF válido detectado, processando...');
      
      // Carregar PDF com PDF-lib
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Converter imagem de assinatura para PNG
      const signatureImageBytes = await fetch(signatureImage).then(res => res.arrayBuffer());
      
      // Verificar se a imagem é PNG, se não for, converter
      let signaturePngImage;
      try {
        signaturePngImage = await pdfDoc.embedPng(signatureImageBytes);
      } catch (error) {
        console.log('⚠️ Imagem não é PNG, convertendo...');
        // Converter para PNG usando canvas
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = signatureImage;
        });
        
        // Criar canvas para conversão
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Desenhar imagem no canvas
        ctx.drawImage(img, 0, 0);
        
        // Converter para PNG
        const pngDataUrl = canvas.toDataURL('image/png');
        const pngResponse = await fetch(pngDataUrl);
        const pngBytes = await pngResponse.arrayBuffer();
        
        // Tentar novamente com PNG
        signaturePngImage = await pdfDoc.embedPng(pngBytes);
      }
      
      // Obter dimensões do canvas uma vez só
      let canvasWidth = 800; // Valor padrão
      let canvasHeight = 600; // Valor padrão
      
      if (canvasRef.current) {
        canvasWidth = canvasRef.current.width;
        canvasHeight = canvasRef.current.height;
      } else {
        console.warn('Canvas não encontrado, usando dimensões padrão');
      }
      
      // Aplicar assinaturas apenas nas páginas marcadas
      // const pagesToSign = Object.keys(signaturePositions).map(p => parseInt(p) - 1); // Removido para evitar warning
      
      Object.entries(signaturePositions).forEach(([pageNum, position]) => {
        const pageIndex = parseInt(pageNum) - 1; // PDF-lib usa índice baseado em 0
        const page = pdfDoc.getPage(pageIndex);
        
        // Calcular posição no PDF (coordenadas PDF são diferentes do canvas)
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Usar as dimensões já obtidas anteriormente
        // Verificar se as dimensões são válidas
        if (canvasWidth <= 0 || canvasHeight <= 0) {
          console.warn('Dimensões inválidas do canvas, usando posição padrão');
          page.drawImage(signaturePngImage, {
            x: pageWidth - 120,
            y: 50,
            width: 100,
            height: 50,
          });
          return;
        }
        
        // Converter coordenadas do canvas para coordenadas do PDF
        const pdfX = (position.x / canvasWidth) * pageWidth;
        const pdfY = pageHeight - ((position.y / canvasHeight) * pageHeight) - 50; // Ajustar altura da assinatura
        
        // Verificar se a posição está dentro dos limites da página
        const signatureWidth = 120;
        const signatureHeight = 60;
        
        // Ajustar posição se estiver fora dos limites
        let finalX = pdfX;
        let finalY = pdfY;
        
        if (finalX < 0) finalX = 10;
        if (finalX + signatureWidth > pageWidth) finalX = pageWidth - signatureWidth - 10;
        if (finalY < 0) finalY = 10;
        if (finalY + signatureHeight > pageHeight) finalY = pageHeight - signatureHeight - 10;
        
        // Desenhar assinatura no PDF
        page.drawImage(signaturePngImage, {
          x: finalX,
          y: finalY,
          width: signatureWidth,
          height: signatureHeight,
        });
      });
      
      // Salvar PDF modificado
      const pdfBytesModified = await pdfDoc.save();
      
      // Enviar PDF assinado para o servidor
      const formData = new FormData();
      const blob = new Blob([pdfBytesModified], { type: 'application/pdf' });
      formData.append('signedPdf', blob, 'documento_assinado.pdf');
      
      console.log('📤 Enviando PDF assinado para o servidor...');
      const uploadResponse = await fetch(`/api/documents/${documentId}/upload-signed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      console.log('📡 Resposta do servidor:', uploadResponse.status);
      
      if (uploadResponse.ok) {
        const result = await uploadResponse.json();
        console.log('✅ PDF assinado salvo com sucesso:', result);
        toast.success('Assinaturas aplicadas com sucesso!');
        
        // Chamar callback para notificar que a assinatura foi concluída
        if (onSignatureComplete) {
          onSignatureComplete('completed');
        }
      } else {
        const errorData = await uploadResponse.json();
        console.error('❌ Erro ao salvar PDF assinado:', errorData);
        throw new Error(errorData.error || `HTTP ${uploadResponse.status}`);
      }
      
    } catch (error) {
      console.error('Erro ao aplicar assinaturas:', error);
      toast.error('Erro ao aplicar assinaturas: ' + error.message);
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading && !pdfDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <div className="text-center">
          <p className="text-gray-600 font-medium">Carregando documento...</p>
          <p className="text-sm text-gray-500 mt-1">Isso pode levar alguns segundos</p>
        </div>
        <div className="w-64 bg-gray-200 rounded-full h-2">
          <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
        </div>
      </div>
    );
  }

  // Mostrar prévia do documento primeiro
  if (showPreview && documentInfo) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">
            📄 Visualizar Documento Antes de Assinar
          </h2>
          
          {/* Informações do Documento */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Informações do Documento</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium text-blue-800">Título:</span>
                <p className="text-blue-700">{documentInfo.title}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Valor:</span>
                <p className="text-blue-700">R$ {documentInfo.amount || '0,00'}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Setor:</span>
                <p className="text-blue-700">{documentInfo.sector || 'Não informado'}</p>
              </div>
              <div>
                <span className="font-medium text-blue-800">Status:</span>
                <p className="text-blue-700">{documentInfo.status || 'Pendente'}</p>
              </div>
            </div>
            {documentInfo.description && (
              <div className="mt-4">
                <span className="font-medium text-blue-800">Descrição:</span>
                <p className="text-blue-700">{documentInfo.description}</p>
              </div>
            )}
          </div>

          {/* Visualização do PDF */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📄 Visualização do Documento</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  <p className="text-gray-600">Carregando documento...</p>
                </div>
              ) : pdfDocument ? (
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
                        onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        -
                      </button>
                      <span className="text-sm text-gray-700">
                        {Math.round(scale * 100)}%
                      </span>
                      <button
                        onClick={() => setScale(Math.min(3, scale + 0.25))}
                        className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <canvas
                    ref={canvasRef}
                    className="border border-gray-300 max-w-full h-auto mx-auto"
                    style={{ 
                      backgroundColor: '#f9f9f9',
                      minHeight: '600px',
                      width: '100%'
                    }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="text-gray-400 text-6xl">📄</div>
                  <p className="text-gray-600">Documento não carregado</p>
                  <button
                    onClick={loadPdf}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Tentar Carregar Novamente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Aviso Importante */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-yellow-600 text-2xl mr-3">⚠️</div>
              <div>
                <h4 className="font-semibold text-yellow-800">Importante!</h4>
                <p className="text-yellow-700">
                  Verifique se este é realmente o documento que você deseja assinar. 
                  Após confirmar, você será direcionado para a tela de assinatura.
                </p>
              </div>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                if (onSignatureComplete) {
                  onSignatureComplete('cancelled');
                }
              }}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ❌ Cancelar
            </button>
            
            <button
              onClick={() => setShowPreview(false)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ✅ Confirmar e Assinar Documento
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6" style={{color: 'var(--text-primary)'}}>
          Posicionar Assinaturas no Documento
        </h2>

        {/* Status da Assinatura */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
            Assinatura Digital
          </label>
          {signatureImage ? (
            <div className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <img 
                src={signatureImage} 
                alt="Assinatura" 
                className="w-16 h-8 object-contain border border-gray-300 rounded bg-white"
              />
              <div>
                <span className="text-sm text-green-600 font-medium">✓ Assinatura carregada automaticamente</span>
                <p className="text-xs text-green-500">Assinatura cadastrada pelo administrador</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Nenhuma assinatura cadastrada. Entre em contato com o administrador para cadastrar sua assinatura.
              </p>
            </div>
          )}
        </div>

        {/* Controles de Navegação e Zoom */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-400"
            >
              ← Anterior
            </button>
            <span className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>
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
          
          <div className="flex items-center space-x-4">
            
            {/* Controles de Zoom */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newScale = Math.max(0.5, scale - 0.1);
                  setScale(newScale);
                  renderPage(currentPage);
                }}
                disabled={isRendering}
                className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                -
              </button>
              <span className="text-sm" style={{color: 'var(--text-primary)'}}>
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
                className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
              <button
                onClick={() => {
                  setScale(1.0);
                  renderPage(currentPage);
                }}
                disabled={isRendering}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
            
            {signaturePositions[currentPage] && (
              <button
                onClick={() => removeSignaturePosition(currentPage)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Remover Assinatura
              </button>
            )}
          </div>
        </div>

        {/* Canvas para o PDF */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
              {signatureImage 
                ? `Clique na página ${currentPage} para marcar onde a assinatura deve aparecer`
                : 'Aguardando carregamento da assinatura do administrador...'
              }
            </p>
              {signaturePositions[currentPage] && (
                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Assinatura marcada nesta página
                </div>
              )}
            </div>
            <div className="relative">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="border border-gray-300 cursor-crosshair max-w-full h-auto"
                style={{ 
                  backgroundColor: '#f9f9f9',
                  minHeight: '600px',
                  width: '100%'
                }}
              />
              
              {/* Área de posicionamento da assinatura - elemento HTML sobreposto */}
              {mousePosition && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: mousePosition.x - 65, // 130/2
                    top: mousePosition.y - 35,  // 70/2
                    width: '130px',
                    height: '70px',
                    border: '3px dashed #3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderRadius: '4px',
                    zIndex: 10
                  }}
                >
                  {/* Ponto central */}
                  <div
                    className="absolute w-2 h-2 bg-red-500 rounded-full"
                    style={{
                      left: '50%',
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                </div>
              )}
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

        {/* Instruções */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">
            📝 Como posicionar a assinatura:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Clique no local desejado</strong> na página para marcar onde a assinatura deve aparecer</li>
            <li>• <strong>Clique novamente</strong> no mesmo local para remover a assinatura</li>
            <li>• <strong>Passe o mouse sobre a página</strong> para ver em tempo real onde a assinatura será posicionada</li>
            <li>• <strong>Use o zoom</strong> para posicionar com mais precisão</li>
            <li>• <strong>Navegue entre as páginas</strong> para assinar em múltiplas páginas se necessário</li>
            <li>• <strong>A assinatura aparecerá apenas nas páginas marcadas</strong> (não se repetirá em todas)</li>
          </ul>
          
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold text-green-800 mb-2">⌨️ Atalhos de Teclado:</h4>
            <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
              <div><strong>+ / =</strong> - Aumentar zoom</div>
              <div><strong>-</strong> - Diminuir zoom</div>
              <div><strong>0</strong> - Resetar zoom (100%)</div>
              <div><strong>← →</strong> - Navegar páginas</div>
            </div>
          </div>
        </div>

        {/* Status das Páginas */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3" style={{color: 'var(--text-primary)'}}>
            Status das Assinaturas:
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
                {signaturePositions[page] && <div className="text-xs">✓ Assinatura</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {Object.keys(signaturePositions).length > 0 && (
              <span className="text-green-600 font-medium">
                ✓ {Object.keys(signaturePositions).length} página(s) com assinatura posicionada
              </span>
            )}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  'Tem certeza que deseja cancelar a assinatura?\n\n' +
                  'Esta ação irá cancelar o processo de assinatura e você retornará à lista de documentos.'
                );
                
                if (confirmed && onSignatureComplete) {
                  // Chamar callback de cancelamento se existir
                  onSignatureComplete('cancelled');
                }
              }}
              disabled={isLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ✕ Cancelar Assinatura
            </button>
            
            <button
              onClick={applySignatures}
              disabled={!signatureImage || Object.keys(signaturePositions).length === 0 || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Aplicando...' : 'Aplicar Assinaturas'}
            </button>
            
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  `Tem certeza que deseja finalizar a assinatura?\n\n` +
                  `Páginas com assinatura: ${Object.keys(signaturePositions).length}\n` +
                  `Total de páginas: ${totalPages}\n\n` +
                  `Esta ação irá aplicar as assinaturas e finalizar o processo.`
                );
                
                if (confirmed) {
                  applySignatures();
                }
              }}
              disabled={!signatureImage || Object.keys(signaturePositions).length === 0 || isLoading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              {isLoading ? 'Finalizando...' : '✓ Finalizar Assinatura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSignaturePositioning;
