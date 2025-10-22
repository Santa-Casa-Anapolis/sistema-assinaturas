/**
 * Configuração robusta do PDF.js Worker
 * Com fallbacks automáticos para local e CDN
 */

import * as pdfjsLib from 'pdfjs-dist';

/**
 * URLs de fallback para o PDF.js Worker
 */
const WORKER_URLS = [
  // 1. Worker local (preferido)
  '/pdf.worker.min.js',
  // 2. CDN jsDelivr
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  // 3. CDN unpkg
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  // 4. CDN cdnjs
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
];

/**
 * Testa se um URL do worker está acessível
 * @param {string} url - URL do worker
 * @returns {Promise<boolean>} - true se acessível
 */
const testWorkerUrl = async (url) => {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    console.warn(`❌ Worker URL não acessível: ${url}`, error.message);
    return false;
  }
};

/**
 * Configura o PDF.js Worker com fallbacks automáticos
 * @returns {Promise<boolean>} - true se configurado com sucesso
 */
export const setupPDFWorker = async () => {
  // Se já está configurado, não fazer nada
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    console.log('✅ PDF.js Worker já configurado:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    return true;
  }

  console.log('🔧 Configurando PDF.js Worker...');

  for (let i = 0; i < WORKER_URLS.length; i++) {
    const url = WORKER_URLS[i];
    console.log(`🔧 Tentando PDF.js Worker ${i + 1}/${WORKER_URLS.length}: ${url}`);

    try {
      // Testar se a URL está acessível
      const isAccessible = await testWorkerUrl(url);
      
      if (isAccessible) {
        // Configurar o worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = url;
        console.log(`✅ PDF.js Worker configurado com sucesso: ${url}`);
        return true;
      }
    } catch (error) {
      console.warn(`❌ Falha ao testar worker URL ${i + 1}:`, error.message);
    }
  }

  // Se nenhum worker funcionou, usar o padrão
  console.warn('⚠️ Nenhum worker URL funcionou, usando configuração padrão');
  pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URLS[0];
  
  return false;
};

/**
 * Verifica se o PDF.js Worker está funcionando
 * @returns {Promise<boolean>} - true se funcionando
 */
export const verifyPDFWorker = async () => {
  try {
    // Tentar carregar um PDF simples para testar o worker
    const testPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    await pdfjsLib.getDocument({ data: testPdf }).promise;
    console.log('✅ PDF.js Worker funcionando corretamente');
    return true;
  } catch (error) {
    console.error('❌ PDF.js Worker não está funcionando:', error.message);
    return false;
  }
};

/**
 * Inicializa o PDF.js com configurações otimizadas
 */
export const initializePDFJS = async () => {
  try {
    // Configurar worker
    const workerConfigured = await setupPDFWorker();
    
    if (!workerConfigured) {
      console.warn('⚠️ PDF.js Worker configurado com fallback');
    }

    // Configurações otimizadas
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsLib.GlobalWorkerOptions.workerSrc || WORKER_URLS[0];
    
    // Configurações de renderização
    pdfjsLib.GlobalWorkerOptions.verbosity = pdfjsLib.VerbosityLevel.ERRORS;
    
    console.log('✅ PDF.js inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar PDF.js:', error);
    return false;
  }
};

/**
 * Obtém informações sobre o worker atual
 * @returns {object} - Informações do worker
 */
export const getWorkerInfo = () => {
  return {
    workerSrc: pdfjsLib.GlobalWorkerOptions.workerSrc,
    isConfigured: !!pdfjsLib.GlobalWorkerOptions.workerSrc,
    version: pdfjsLib.version || 'unknown'
  };
};
