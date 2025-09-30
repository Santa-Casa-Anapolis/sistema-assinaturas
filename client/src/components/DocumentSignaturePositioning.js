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
  const [scale, setScale] = useState(1.0);
  // eslint-disable-next-line no-unused-vars
  const [mousePosition, setMousePosition] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showSignaturePreview, setShowSignaturePreview] = useState(false);
  
  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const isRenderingRef = useRef(false);

  // Configurar PDF.js
  useEffect(() => {
    // Configurar o worker do PDF.js usando o arquivo local
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  }, []);

  // Carregar PDF e assinatura quando o componente monta
  useEffect(() => {
    if (documentId) {
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

  const loadPdf = async () => {
    try {
      console.log('🔍 Carregando PDF para documento:', documentId);
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      console.log('📡 Fazendo requisição para visualizar documento...');
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}/view?token=${token}`);
      
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
      const response = await fetch(`http://localhost:5000/api/users/${user.id}/signature`, {
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
        const signatureResponse = await fetch(`http://localhost:5000/api/users/${user.id}/signature/file`, {
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
      
      // Calcular scale automático baseado no container (otimizado)
      const containerWidth = canvas.parentElement.clientWidth - 40; // 40px de padding
      const pageViewport = page.getViewport({ scale: 1.0 });
      
      // Scale mais conservador para melhor performance
      const autoScale = Math.min(containerWidth / pageViewport.width, 1.5); // Máximo 1.5x (reduzido de 2x)
      const finalScale = Math.max(autoScale, 0.8); // Mínimo 0.8x (aumentado de 0.5x)
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
    }
  };

  const drawSignatureMarkers = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Apenas desenhar os marcadores sem re-renderizar
    drawSignatureMarkersOnCanvas();
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
            
            // Desenhar fundo semi-transparente
            context.fillStyle = 'rgba(255, 255, 255, 0.9)';
            context.fillRect(x - signatureWidth/2 - 5, y - signatureHeight/2 - 5, signatureWidth + 10, signatureHeight + 10);
            
            // Desenhar a assinatura
            context.drawImage(img, x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
            
            // Desenhar borda verde ao redor
            context.strokeStyle = '#10B981';
            context.lineWidth = 2;
            context.strokeRect(x - signatureWidth/2 - 5, y - signatureHeight/2 - 5, signatureWidth + 10, signatureHeight + 10);
            
            // Desenhar texto "Assinatura"
            context.fillStyle = '#10B981';
            context.font = 'bold 12px Arial';
            context.fillText('✓ Assinatura', x - signatureWidth/2, y - signatureHeight/2 - 10);
          };
  
  const drawSignaturePreview = (context, img, x, y) => {
    const signatureWidth = 120;
    const signatureHeight = (img.height * signatureWidth) / img.width;
    
    // Desenhar preview semi-transparente
    context.globalAlpha = 0.6;
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    context.fillRect(x - signatureWidth/2 - 5, y - signatureHeight/2 - 5, signatureWidth + 10, signatureHeight + 10);
    
    // Desenhar a assinatura
    context.globalAlpha = 0.7;
    context.drawImage(img, x - signatureWidth/2, y - signatureHeight/2, signatureWidth, signatureHeight);
    
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
    
    // Restaurar estado
    context.globalAlpha = 1;
    context.restore();
  };


  const handleCanvasClick = (event) => {
    if (!signatureImage) {
      toast.warning('Assinatura não encontrada. Entre em contato com o administrador.');
      return;
    }

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

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

      // Redesenhar marcadores imediatamente (sem delay)
      drawSignatureMarkersOnCanvas();

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
    if (!canvas || !signatureImage) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Evitar processamento se a posição não mudou significativamente
    const lastPos = lastMousePositionRef.current;
    if (lastPos && Math.abs(lastPos.x - x) < 3 && Math.abs(lastPos.y - y) < 3) {
      return;
    }
    
    lastMousePositionRef.current = { x, y };
    
    // Throttle otimizado com requestAnimationFrame
    if (mouseMoveThrottleRef.current) {
      return;
    }
    
    mouseMoveThrottleRef.current = requestAnimationFrame(() => {
      setMousePosition({ x, y });
      setShowSignaturePreview(true);
      
      // Redesenhar marcadores com preview
      drawSignatureMarkersWithPreview(x, y);
      
      mouseMoveThrottleRef.current = null;
    });
  };

  const handleMouseLeave = () => {
    setShowSignaturePreview(false);
    setMousePosition(null);
    
    // Limpar área do preview se existir
    if (previewContextRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext('2d');
        const prevPos = previewContextRef.current;
        const clearWidth = 200;
        const clearHeight = 100;
        
        context.save();
        context.clearRect(prevPos.x - clearWidth/2, prevPos.y - clearHeight/2, clearWidth, clearHeight);
        context.restore();
        
        // Redesenhar marcadores na área limpa
        drawSignatureMarkersOnCanvas();
      }
    }
    
    // Limpar referências
    previewContextRef.current = null;
    lastPreviewPositionRef.current = null;
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
      const response = await fetch(`http://localhost:5000/api/documents/${documentId}/view?token=${token}`);
      
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
      const signaturePngImage = await pdfDoc.embedPng(signatureImageBytes);
      
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
      const uploadResponse = await fetch(`http://localhost:5000/api/documents/${documentId}/upload-signed`, {
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
          onSignatureComplete();
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
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
                className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                -
              </button>
              <span className="text-sm" style={{color: 'var(--text-primary)'}}>
                {Math.round(scale * 100)}%
              </span>
              <button
                onClick={() => setScale(Math.min(3, scale + 0.25))}
                className="px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                +
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
          </div>
        </div>

        {/* Instruções */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-800">
            📝 Como posicionar a assinatura:
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Mova o mouse</strong> sobre o documento para ver um preview da assinatura</li>
            <li>• <strong>Clique no local desejado</strong> na página para marcar onde a assinatura deve aparecer</li>
            <li>• <strong>Clique novamente</strong> no mesmo local para remover a assinatura</li>
            <li>• <strong>Use o zoom</strong> para posicionar com mais precisão</li>
            <li>• <strong>Navegue entre as páginas</strong> para assinar em múltiplas páginas se necessário</li>
            <li>• <strong>A assinatura aparecerá apenas nas páginas marcadas</strong> (não se repetirá em todas)</li>
          </ul>
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
