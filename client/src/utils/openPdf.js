import api from '../config/api';

/**
 * Abre um PDF em uma nova aba usando a rota de stream
 * @param {number} documentId - ID do documento
 */
export const openPdf = async (documentId) => {
  try {
    console.log('🔍 Abrindo PDF para documento ID:', documentId);
    
    // Verificar se há token
    const token = localStorage.getItem('sa.token');
    if (!token) {
      throw new Error('Sem token de autenticação');
    }
    
    // Fazer requisição para a rota de stream
    const response = await api.get(`/documents/${documentId}/stream`, {
      responseType: 'blob'
    });
    
    console.log('✅ PDF recebido via stream');
    
    // Criar blob URL
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('🔗 Blob URL criada:', blobUrl);
    
    // Abrir em nova aba
    const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      throw new Error('Popup bloqueado pelo navegador');
    }
    
    // Limpar blob URL após um tempo (opcional)
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      console.log('🧹 Blob URL limpa');
    }, 60000); // 1 minuto
    
    console.log('✅ PDF aberto com sucesso');
    
  } catch (error) {
    console.error('❌ Erro ao abrir PDF:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Token de autenticação inválido');
    } else if (error.response?.status === 404) {
      throw new Error('Documento não encontrado');
    } else if (error.response?.status === 403) {
      throw new Error('Acesso negado ao documento');
    } else {
      throw new Error(`Erro ao abrir PDF: ${error.message}`);
    }
  }
};

/**
 * Abre um PDF usando fetch diretamente (fallback)
 * @param {number} documentId - ID do documento
 */
export const openPdfWithFetch = async (documentId) => {
  try {
    console.log('🔍 Abrindo PDF com fetch para documento ID:', documentId);
    
    const token = localStorage.getItem('sa.token');
    if (!token) {
      throw new Error('Sem token de autenticação');
    }
    
    const response = await fetch(`/api/documents/${documentId}/stream`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token de autenticação inválido');
      } else if (response.status === 404) {
        throw new Error('Documento não encontrado');
      } else if (response.status === 403) {
        throw new Error('Acesso negado ao documento');
      } else {
        throw new Error(`Erro HTTP ${response.status}`);
      }
    }
    
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    console.log('🔗 Blob URL criada via fetch:', blobUrl);
    
    // Abrir em nova aba
    const newWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      throw new Error('Popup bloqueado pelo navegador');
    }
    
    // Limpar blob URL após um tempo
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      console.log('🧹 Blob URL limpa');
    }, 60000);
    
    console.log('✅ PDF aberto com sucesso via fetch');
    
  } catch (error) {
    console.error('❌ Erro ao abrir PDF com fetch:', error);
    throw error;
  }
};