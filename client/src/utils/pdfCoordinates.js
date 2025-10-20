/**
 * Utilitários para mapeamento de coordenadas entre tela e PDF
 * 
 * PERFORMANCE: Estas funções são otimizadas para serem chamadas frequentemente
 * durante o arraste de assinaturas, evitando cálculos desnecessários.
 */

/**
 * Converte coordenadas do mouse (clientX, clientY) para porcentagem da página
 * @param {number} clientX - Posição X do mouse
 * @param {number} clientY - Posição Y do mouse
 * @param {DOMRect} pageRect - Bounding rect da página
 * @returns {Object} { xPct, yPct } - Porcentagem da página (0-100)
 */
export const clientToPagePercentage = (clientX, clientY, pageRect) => {
  const xPct = ((clientX - pageRect.left) / pageRect.width) * 100;
  const yPct = ((clientY - pageRect.top) / pageRect.height) * 100;
  
  return {
    xPct: Math.max(0, Math.min(100, xPct)),
    yPct: Math.max(0, Math.min(100, yPct))
  };
};

/**
 * Converte porcentagem da página para coordenadas PDF
 * IMPORTANTE: PDF tem eixo Y invertido (origem no canto inferior esquerdo)
 * @param {number} xPct - Porcentagem X da página (0-100)
 * @param {number} yPct - Porcentagem Y da página (0-100)
 * @param {number} pageWidth - Largura da página em pontos PDF
 * @param {number} pageHeight - Altura da página em pontos PDF
 * @returns {Object} { x, y } - Coordenadas em pontos PDF
 */
export const percentageToPDFCoords = (xPct, yPct, pageWidth, pageHeight) => {
  const x = (xPct / 100) * pageWidth;
  const y = pageHeight - ((yPct / 100) * pageHeight); // Inverte Y para PDF
  
  return { x, y };
};

/**
 * Converte porcentagem da página para pixels da tela
 * @param {number} xPct - Porcentagem X da página (0-100)
 * @param {number} yPct - Porcentagem Y da página (0-100)
 * @param {DOMRect} pageRect - Bounding rect da página
 * @returns {Object} { x, y } - Coordenadas em pixels da tela
 */
export const percentageToScreenPixels = (xPct, yPct, pageRect) => {
  const x = (xPct / 100) * pageRect.width;
  const y = (yPct / 100) * pageRect.height;
  
  return { x, y };
};

/**
 * Converte coordenadas PDF para porcentagem da página
 * @param {number} pdfX - Coordenada X em pontos PDF
 * @param {number} pdfY - Coordenada Y em pontos PDF
 * @param {number} pageWidth - Largura da página em pontos PDF
 * @param {number} pageHeight - Altura da página em pontos PDF
 * @returns {Object} { xPct, yPct } - Porcentagem da página (0-100)
 */
export const pdfCoordsToPercentage = (pdfX, pdfY, pageWidth, pageHeight) => {
  const xPct = (pdfX / pageWidth) * 100;
  const yPct = ((pageHeight - pdfY) / pageHeight) * 100; // Inverte Y de volta
  
  return {
    xPct: Math.max(0, Math.min(100, xPct)),
    yPct: Math.max(0, Math.min(100, yPct))
  };
};

/**
 * Normaliza coordenadas para garantir que estão dentro dos limites da página
 * @param {Object} coords - { xPct, yPct }
 * @returns {Object} { xPct, yPct } - Coordenadas normalizadas
 */
export const normalizeCoordinates = (coords) => {
  return {
    xPct: Math.max(0, Math.min(100, coords.xPct)),
    yPct: Math.max(0, Math.min(100, coords.yPct))
  };
};

/**
 * Calcula o offset para centralizar um elemento em uma posição
 * @param {number} elementWidth - Largura do elemento
 * @param {number} elementHeight - Altura do elemento
 * @returns {Object} { offsetX, offsetY } - Offset para centralização
 */
export const getCenteringOffset = (elementWidth, elementHeight) => {
  return {
    offsetX: -elementWidth / 2,
    offsetY: -elementHeight / 2
  };
};

/**
 * Verifica se uma posição está dentro dos limites da página
 * @param {number} xPct - Porcentagem X
 * @param {number} yPct - Porcentagem Y
 * @param {number} widthPct - Porcentagem de largura do elemento
 * @param {number} heightPct - Porcentagem de altura do elemento
 * @returns {boolean} - true se está dentro dos limites
 */
export const isWithinPageBounds = (xPct, yPct, widthPct = 0, heightPct = 0) => {
  return (
    xPct >= 0 &&
    yPct >= 0 &&
    (xPct + widthPct) <= 100 &&
    (yPct + heightPct) <= 100
  );
};
