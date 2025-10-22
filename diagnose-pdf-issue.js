// Script de diagnóstico para problema de PDF
const axios = require('axios');

async function diagnosePDFIssue() {
  console.log('🔍 DIAGNÓSTICO DO PROBLEMA DE PDF');
  console.log('=====================================');
  
  try {
    // 1. Testar endpoint de autenticação
    console.log('\n1. Testando autenticação...');
    const loginResponse = await axios.post('http://172.16.0.219:4000/api/auth/login', {
      username: 'supervisor@santacasa.org',
      password: 'supervisor123'
    });
    
    if (loginResponse.status === 200) {
      console.log('✅ Login bem-sucedido');
      const token = loginResponse.data.token;
      
      // 2. Testar endpoint de documentos
      console.log('\n2. Testando listagem de documentos...');
      const docsResponse = await axios.get('http://172.16.0.219:4000/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (docsResponse.status === 200 && docsResponse.data.length > 0) {
        console.log('✅ Documentos encontrados:', docsResponse.data.length);
        const firstDoc = docsResponse.data[0];
        console.log('📄 Primeiro documento:', firstDoc.id, firstDoc.title);
        
        // 3. Testar endpoint de visualização
        console.log('\n3. Testando endpoint de visualização...');
        const viewResponse = await axios.get(`http://172.16.0.219:4000/api/documents/${firstDoc.id}/view`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf'
          },
          responseType: 'stream'
        });
        
        if (viewResponse.status === 200) {
          console.log('✅ Endpoint de visualização funcionando');
          console.log('📊 Headers da resposta:', {
            'content-type': viewResponse.headers['content-type'],
            'content-length': viewResponse.headers['content-length']
          });
        } else {
          console.log('❌ Erro no endpoint de visualização:', viewResponse.status);
        }
        
        // 4. Testar com fetch (como o frontend faz)
        console.log('\n4. Testando com fetch (simulando frontend)...');
        const fetchResponse = await fetch(`http://172.16.0.219:4000/api/documents/${firstDoc.id}/view`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/pdf'
          }
        });
        
        if (fetchResponse.ok) {
          console.log('✅ Fetch funcionando');
          const blob = await fetchResponse.blob();
          console.log('📊 Blob criado, tamanho:', blob.size);
          console.log('📊 Tipo do blob:', blob.type);
        } else {
          console.log('❌ Erro no fetch:', fetchResponse.status, fetchResponse.statusText);
        }
        
      } else {
        console.log('❌ Nenhum documento encontrado');
      }
      
    } else {
      console.log('❌ Erro no login:', loginResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error.message);
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Data:', error.response.data);
    }
  }
}

// Executar diagnóstico
diagnosePDFIssue().then(() => {
  console.log('\n🏁 Diagnóstico concluído');
}).catch(console.error);
