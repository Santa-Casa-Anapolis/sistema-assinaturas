/**
 * Utilitários para validação de arquivos no frontend
 */

/**
 * Verifica se o arquivo é PDF ou P7S (bloquear)
 * @param {File} file - Arquivo a ser verificado
 * @returns {boolean} - true se for PDF/P7S
 */
export const isPdfOrP7s = (file) => {
  if (!file) return false;
  
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  
  // Verificar extensão
  const isPdfExt = fileName.endsWith('.pdf');
  const isP7sExt = fileName.endsWith('.p7s');
  
  // Verificar MIME type
  const isPdfMime = mimeType === 'application/pdf';
  const isP7sMime = mimeType === 'application/pkcs7-signature';
  
  return isPdfExt || isP7sExt || isPdfMime || isP7sMime;
};

/**
 * Verifica se o arquivo é uma imagem válida para assinatura
 * @param {File} file - Arquivo a ser verificado
 * @returns {boolean} - true se for imagem válida
 */
export const isValidSignatureImage = (file) => {
  if (!file) return false;
  
  const validMimeTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml'
  ];
  
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
  const fileName = file.name.toLowerCase();
  
  // Verificar MIME type
  const hasValidMime = validMimeTypes.includes(file.type.toLowerCase());
  
  // Verificar extensão
  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));
  
  return hasValidMime || hasValidExt;
};

/**
 * Obtém mensagem de erro para arquivo inválido
 * @param {File} file - Arquivo que falhou na validação
 * @returns {string} - Mensagem de erro
 */
export const getFileValidationError = (file) => {
  if (!file) return 'Nenhum arquivo selecionado.';
  
  if (isPdfOrP7s(file)) {
    const fileName = file.name;
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return 'Arquivo inválido. Envie apenas PNG, JPEG, WEBP ou SVG (não PDF).';
    } else if (fileName.toLowerCase().endsWith('.p7s')) {
      return 'Arquivo inválido. Envie apenas PNG, JPEG, WEBP ou SVG (não .p7s).';
    } else {
      return 'Arquivo inválido. Envie apenas PNG, JPEG, WEBP ou SVG (não PDF ou .p7s).';
    }
  }
  
  return 'Tipo de arquivo não suportado. Envie apenas PNG, JPEG, WEBP ou SVG.';
};

/**
 * Valida arquivo de assinatura com mensagens detalhadas
 * @param {File} file - Arquivo a ser validado
 * @returns {{valid: boolean, error?: string}} - Resultado da validação
 */
export const validateSignatureFile = (file) => {
  if (!file) {
    return {
      valid: false,
      error: 'Nenhum arquivo selecionado.'
    };
  }
  
  // Verificar tamanho (5MB máximo)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Arquivo muito grande. Tamanho máximo: 5MB.'
    };
  }
  
  // Verificar se é PDF/P7S (bloquear)
  if (isPdfOrP7s(file)) {
    return {
      valid: false,
      error: getFileValidationError(file)
    };
  }
  
  // Verificar se é imagem válida
  if (!isValidSignatureImage(file)) {
    return {
      valid: false,
      error: getFileValidationError(file)
    };
  }
  
  return {
    valid: true
  };
};

/**
 * Logs amigáveis para debug
 */
export const logFileInfo = (file, context = '') => {
  if (!file) {
    console.log(`📄 ${context}: Nenhum arquivo`);
    return;
  }
  
  console.log(`📄 ${context}:`, {
    name: file.name,
    type: file.type,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    lastModified: new Date(file.lastModified).toLocaleString()
  });
};
