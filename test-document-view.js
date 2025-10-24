async function testDocumentView() {
  try {
    console.log('🧪 Testando visualização de documento...');
    
    // Primeiro, fazer login para obter token
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'karla.souza',
        password: 'SENHA_CORRETA' // Substitua pela senha correta
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login realizado:', loginData);
    const token = loginData.token;
    
    // Testar visualização de documento (ID 100, 101, 102, 103 que apareceram nos logs)
    const documentIds = [100, 101, 102, 103];
    
    for (const docId of documentIds) {
      console.log(`\n🔍 Testando documento ID: ${docId}`);
      
      try {
        const response = await fetch(`http://localhost:5000/api/documents/${docId}/view`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`✅ Documento ${docId} - Status: ${response.status}`);
        console.log(`📄 Content-Type: ${response.headers.get('content-type')}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.log(`❌ Erro:`, errorData);
        }
        
      } catch (error) {
        console.log(`❌ Documento ${docId} - Erro:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testDocumentView();
