// Script para criar documento de teste
const fetch = require('node-fetch');

async function createTestDocument() {
  try {
    console.log('🔐 Fazendo login como admin...');
    
    // Login
    const loginResponse = await fetch('http://172.16.0.219:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'admin@santacasa.org',
        password: '123456',
        authMode: 'local'
      })
    });
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login realizado com sucesso');
    
    // Criar documento
    console.log('📄 Criando documento de teste...');
    const documentResponse = await fetch('http://172.16.0.219:5000/api/documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'Documento de Teste para Assinatura',
        description: 'Este é um documento de teste criado automaticamente para testar o sistema de assinaturas.',
        amount: 150.75,
        sector: 'TECNOLOGIA DA INFORMAÇÃO'
      })
    });
    
    if (documentResponse.ok) {
      const documentData = await documentResponse.json();
      console.log('✅ Documento criado com sucesso!');
      console.log('📋 ID do documento:', documentData.documentId);
      console.log('📋 Título:', documentData.title);
      return documentData.documentId;
    } else {
      const error = await documentResponse.text();
      console.error('❌ Erro ao criar documento:', error);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

createTestDocument();
