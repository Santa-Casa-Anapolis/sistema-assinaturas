import api from '../config/api';

/**
 * Abre um PDF usando a rota de stream
 * @param {number} documentId - ID do documento
 */
export const openPdf = async (documentId) => {
  try {
    console.log('Abrindo PDF para documento ID:', documentId);

    const token = localStorage.getItem('sa.token');
    if (!token) {
      throw new Error('Sem token de autenticacao');
    }

    const response = await api.get(`/documents/${documentId}/stream`, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    console.error('Erro ao abrir PDF:', error);

    if (error.response?.status === 401) {
      throw new Error('Token de autenticacao invalido');
    }
    if (error.response?.status === 404) {
      throw new Error('Documento nao encontrado');
    }
    if (error.response?.status === 403) {
      throw new Error('Acesso negado ao documento');
    }

    throw new Error(`Erro ao abrir PDF: ${error.message}`);
  }
};

/**
 * Abre um PDF usando fetch diretamente (fallback)
 * @param {number} documentId - ID do documento
 */
export const openPdfWithFetch = async (documentId) => {
  try {
    console.log('Abrindo PDF com fetch para documento ID:', documentId);

    const token = localStorage.getItem('sa.token');
    if (!token) {
      throw new Error('Sem token de autenticacao');
    }

    const response = await fetch(`/api/documents/${documentId}/stream`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token de autenticacao invalido');
      }
      if (response.status === 404) {
        throw new Error('Documento nao encontrado');
      }
      if (response.status === 403) {
        throw new Error('Acesso negado ao documento');
      }

      throw new Error(`Erro HTTP ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (error) {
    console.error('Erro ao abrir PDF com fetch:', error);
    throw error;
  }
};
