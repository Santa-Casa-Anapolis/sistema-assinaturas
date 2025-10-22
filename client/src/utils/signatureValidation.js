/**
 * Utilitários para validação de assinaturas
 * Bloqueia PDF/p7s e permite apenas imagens
 */

/**
 * Detecta o tipo real do arquivo analisando os bytes
 * @param {Blob} blob - Arquivo a ser analisado
 * @returns {Promise<string>} - MIME type detectado
 */
export const detectFileType = async (blob) => {
  const buf = await blob.slice(0, 32).arrayBuffer();
  const bytes = new Uint8Array(buf);
  
  // Detectar PNG
  const isPNG = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
  if (isPNG) return 'image/png';
  
  // Detectar JPEG
  const isJPG = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
  if (isJPG) return 'image/jpeg';
  
  // Detectar WebP
  const isRIFF = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
                 bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  if (isRIFF) return 'image/webp';
  
  // Detectar SVG (texto)
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (text.includes('<svg') || text.includes('<?xml')) return 'image/svg+xml';
  
  // Detectar PDF (bloquear)
  const isPDF = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (isPDF) return 'application/pdf';
  
  // Detectar PKCS#7 (p7s) - assinatura digital (bloquear)
  const isP7S = bytes[0] === 0x30 && bytes[1] === 0x82; // DER encoding
  if (isP7S) return 'application/pkcs7-signature';
  
  // Se não conseguir detectar, usar o tipo reportado pelo blob
  return blob.type || 'application/octet-stream';
};

/**
 * Valida se o arquivo é uma imagem válida para assinatura
 * @param {Blob} blob - Arquivo a ser validado
 * @returns {Promise<{valid: boolean, error?: string, detectedType?: string}>}
 */
export const validateSignatureFile = async (blob) => {
  try {
    const detectedType = await detectFileType(blob);
    
    // Tipos permitidos para assinatura visual
    const allowedTypes = [
      'image/png',
      'image/jpeg', 
      'image/webp',
      'image/svg+xml'
    ];
    
    // Tipos bloqueados
    const blockedTypes = [
      'application/pdf',
      'application/pkcs7-signature'
    ];
    
    if (blockedTypes.includes(detectedType)) {
      return {
        valid: false,
        error: `Arquivo inválido: ${detectedType === 'application/pdf' ? 'PDF' : 'P7S'} detectado. Envie apenas PNG, JPEG, WEBP ou SVG.`,
        detectedType
      };
    }
    
    if (!allowedTypes.includes(detectedType)) {
      return {
        valid: false,
        error: `Tipo de arquivo não suportado: ${detectedType}. Envie apenas PNG, JPEG, WEBP ou SVG.`,
        detectedType
      };
    }
    
    return {
      valid: true,
      detectedType
    };
    
  } catch (error) {
    console.error('Erro na validação de arquivo:', error);
    return {
      valid: false,
      error: 'Erro ao validar arquivo. Tente novamente.'
    };
  }
};

/**
 * Converte qualquer imagem válida para PNG
 * @param {Blob} blob - Imagem a ser convertida
 * @returns {Promise<Blob>} - Imagem em formato PNG
 */
export const convertToPNG = async (blob) => {
  const detectedType = await detectFileType(blob);
  
  // Se já é PNG, retornar como está
  if (detectedType === 'image/png') {
    return blob;
  }
  
  // Carregar imagem
  const imageBitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = imageBitmap.width;
  canvas.height = imageBitmap.height;
  
  // Desenhar imagem no canvas
  ctx.drawImage(imageBitmap, 0, 0);
  
  // Converter para PNG
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Falha ao converter para PNG'));
      }
    }, 'image/png');
  });
};

/**
 * Mensagens de erro amigáveis
 */
export const ERROR_MESSAGES = {
  INVALID_FILE_TYPE: 'Arquivo inválido. Envie apenas PNG, JPEG, WEBP ou SVG.',
  PDF_DETECTED: 'PDF detectado. Para assinatura visual, envie uma imagem (PNG, JPEG, WEBP ou SVG).',
  P7S_DETECTED: 'Assinatura digital (P7S) detectada. Para assinatura visual, envie uma imagem (PNG, JPEG, WEBP ou SVG).',
  FILE_TOO_LARGE: 'Arquivo muito grande. Tamanho máximo: 5MB.',
  FILE_CORRUPTED: 'Arquivo corrompido. Tente novamente.',
  CONVERSION_FAILED: 'Falha ao processar imagem. Tente um formato diferente.'
};
