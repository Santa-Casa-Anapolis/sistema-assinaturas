// Script para testar assinatura da karla.souza no servidor
const BASE_URL = 'http://172.16.0.219:5000'; // URL do servidor

async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { response, data };
  } catch (error) {
    return { error };
  }
}

async function testKarlaSignature() {
  try {
    console.log('🔍 === TESTE DE ASSINATURA - KARLA.SOUZA ===\n');

    // 1. Fazer login como karla.souza
    console.log('1️⃣ Fazendo login como karla.souza...');
    const { response: loginResponse, data: loginData, error: loginError } = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'karla.souza@santacasa.org',
        password: '123456'
      })
    });

    if (loginError) {
      console.log('❌ Erro na conexão:', loginError.message);
      return;
    }

    if (loginResponse.ok && loginData.token) {
      console.log('✅ Login realizado com sucesso');
      const token = loginData.token;
      const userId = loginData.user.id;
      
      console.log('👤 Dados do usuário:', {
        id: loginData.user.id,
        name: loginData.user.name,
        username: loginData.user.username,
        role: loginData.user.role
      });

      // 2. Verificar se já existe assinatura
      console.log('\n2️⃣ Verificando assinatura existente...');
      const { response: signatureResponse, data: signatureData, error: signatureError } = await makeRequest(`${BASE_URL}/api/users/${userId}/signature`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (signatureError) {
        console.log('❌ Erro ao buscar assinatura:', signatureError.message);
      } else if (signatureResponse.status === 404) {
        console.log('❌ Assinatura não encontrada (404)');
        console.log('💡 A usuária precisa fazer upload de uma assinatura');
      } else if (signatureResponse.ok) {
        console.log('✅ Assinatura encontrada:', signatureData);
      } else {
        console.log('❌ Erro inesperado:', signatureData);
      }

      // 3. Testar upload de assinatura (simulado)
      console.log('\n3️⃣ Testando endpoint de upload...');
      console.log('📝 Para fazer upload de assinatura, acesse:');
      console.log(`   ${BASE_URL}/admin-panel`);
      console.log('   E vá para a seção de gerenciamento de usuários');

      // 4. Verificar se o usuário tem permissões
      console.log('\n4️⃣ Verificando permissões do usuário...');
      const { response: verifyResponse, data: verifyData, error: verifyError } = await makeRequest(`${BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (verifyError) {
        console.log('❌ Erro na verificação do token:', verifyError.message);
      } else if (verifyResponse.ok) {
        console.log('✅ Token válido:', verifyData);
      } else {
        console.log('❌ Token inválido:', verifyData);
      }

    } else {
      console.log('❌ Falha no login:', loginData);
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testKarlaSignature();
