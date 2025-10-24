/**
 * Script de teste para a nova rota de stream de PDF
 * Testa a autenticação via Authorization header
 */

const fetch = require('node-fetch');

async function testPdfStream() {
  try {
    console.log('🧪 Testando nova rota de stream de PDF...');
    
    // 1. Fazer login para obter token
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username: 'karla.souza', 
        password: 'SENHA_CORRETA' 
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login falhou: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log('✅ Login realizado com sucesso');
    console.log('🔑 Token obtido:', token.substring(0, 20) + '...');
    
    // 2. Testar rota de stream com Authorization header
    console.log('\n2️⃣ Testando rota de stream...');
    const streamResponse = await fetch('http://localhost:5000/api/documents/113/stream', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/pdf'
      }
    });
    
    console.log('📊 Status da resposta:', streamResponse.status);
    console.log('📊 Headers da resposta:', Object.fromEntries(streamResponse.headers.entries()));
    
    if (streamResponse.ok) {
      console.log('✅ Stream funcionando corretamente!');
      console.log('📄 Content-Type:', streamResponse.headers.get('content-type'));
      console.log('📄 Content-Disposition:', streamResponse.headers.get('content-disposition'));
      
      // Verificar se é um PDF válido
      const buffer = await streamResponse.buffer();
      const header = buffer.slice(0, 4).toString();
      console.log('📄 Cabeçalho do arquivo:', header);
      
      if (header === '%PDF') {
        console.log('✅ Arquivo PDF válido recebido!');
      } else {
        console.log('❌ Arquivo não é um PDF válido');
      }
    } else {
      const errorText = await streamResponse.text();
      console.log('❌ Erro na resposta:', errorText);
    }
    
    // 3. Testar rota antiga para comparação
    console.log('\n3️⃣ Testando rota antiga (compatibilidade)...');
    const oldResponse = await fetch(`http://localhost:5000/api/documents/113/view?token=${token}`);
    
    console.log('📊 Status da rota antiga:', oldResponse.status);
    
    if (oldResponse.ok) {
      console.log('✅ Rota antiga ainda funciona');
    } else {
      console.log('❌ Rota antiga falhou:', await oldResponse.text());
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testPdfStream();
