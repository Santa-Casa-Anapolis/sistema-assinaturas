const STORAGE_KEY = 'sa.token';

export async function openPdf(docId) {
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    throw new Error('Sem token — usuário não autenticado');
  }

  try {
    
    const response = await fetch(`/api/documents/${docId}/view`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Falha ao carregar PDF: ${response.status} ${response.statusText}`);
    }

    
    // Converter resposta para Blob
    const blob = await response.blob();
      size: blob.size,
      type: blob.type
    });

    // Criar URL do Blob
    const url = URL.createObjectURL(blob);

    // Abrir PDF em nova aba
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    if (!newWindow) {
      throw new Error('Popup bloqueado. Permita popups para este site.');
    }


    // Limpar URL do Blob após um tempo (para liberar memória)
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 10000); // 10 segundos

  } catch (error) {
    console.error('❌ Erro ao abrir PDF:', error);
    throw error;
  }
}
