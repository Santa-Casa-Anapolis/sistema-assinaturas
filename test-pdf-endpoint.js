// Script simples para testar endpoint de PDF
const https = require('https');
const http = require('http');

async function testPDFEndpoint() {
  console.log('🔍 TESTANDO ENDPOINT DE PDF');
  console.log('============================');
  
  try {
    // 1. Fazer login
    console.log('\n1. Fazendo login...');
    const loginData = JSON.stringify({
      username: 'supervisor@santacasa.org',
      password: 'supervisor123'
    });
    
    const loginOptions = {
      hostname: '172.16.0.219',
      port: 4000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('📊 Login response status:', loginResponse.status);
    
    if (loginResponse.status === 200) {
      const loginResult = JSON.parse(loginResponse.data);
      const token = loginResult.token;
      console.log('✅ Login bem-sucedido, token obtido');
      
      // 2. Listar documentos
      console.log('\n2. Listando documentos...');
      const docsOptions = {
        hostname: '172.16.0.219',
        port: 4000,
        path: '/api/documents',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      
      const docsResponse = await makeRequest(docsOptions);
      console.log('📊 Docs response status:', docsResponse.status);
      
      if (docsResponse.status === 200) {
        const docs = JSON.parse(docsResponse.data);
        console.log('✅ Documentos encontrados:', docs.length);
        
        if (docs.length > 0) {
          const firstDoc = docs[0];
          console.log('📄 Testando com documento ID:', firstDoc.id);
          
          // 3. Testar endpoint de visualização
          console.log('\n3. Testando endpoint de visualização...');
          const viewOptions = {
            hostname: '172.16.0.219',
            port: 4000,
            path: `/api/documents/${firstDoc.id}/view`,
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          };
          
          const viewResponse = await makeRequest(viewOptions);
          console.log('📊 View response status:', viewResponse.status);
          console.log('📊 View response headers:', viewResponse.headers);
          
          if (viewResponse.status === 200) {
            console.log('✅ Endpoint de visualização funcionando!');
            console.log('📊 Tamanho da resposta:', viewResponse.data.length);
          } else {
            console.log('❌ Erro no endpoint de visualização');
            console.log('📊 Resposta:', viewResponse.data);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Executar teste
testPDFEndpoint().then(() => {
  console.log('\n🏁 Teste concluído');
}).catch(console.error);
