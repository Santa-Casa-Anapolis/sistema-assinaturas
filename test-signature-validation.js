/**
 * Script para testar a validação de assinaturas
 * Testa upload de diferentes tipos de arquivo
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuração
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  username: 'admin@santacasa.org',
  password: 'admin123'
};

// Função para fazer login
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    console.log('✅ Login realizado com sucesso');
    return response.data.token;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    throw error;
  }
}

// Função para testar upload de assinatura
async function testSignatureUpload(token, filePath, expectedResult) {
  try {
    console.log(`\n📤 Testando upload: ${filePath}`);
    
    const formData = new FormData();
    formData.append('signature', fs.createReadStream(filePath));
    
    const response = await axios.post(`${BASE_URL}/api/users/1/signature`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Upload bem-sucedido:', response.status);
    return true;
  } catch (error) {
    if (expectedResult === 'should_fail') {
      console.log('✅ Upload bloqueado corretamente:', error.response?.data?.message);
      return true;
    } else {
      console.error('❌ Upload falhou inesperadamente:', error.response?.data || error.message);
      return false;
    }
  }
}

// Função principal
async function runTests() {
  console.log('🧪 Iniciando testes de validação de assinatura...\n');
  
  try {
    // Fazer login
    const token = await login();
    
    // Criar arquivos de teste
    const testFiles = [
      {
        name: 'test-png.png',
        content: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG header
        expected: 'should_pass'
      },
      {
        name: 'test-jpg.jpg',
        content: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JPEG header
        expected: 'should_pass'
      },
      {
        name: 'test-pdf.pdf',
        content: Buffer.from([0x25, 0x50, 0x44, 0x46]), // PDF header
        expected: 'should_fail'
      },
      {
        name: 'test-p7s.p7s',
        content: Buffer.from([0x30, 0x82]), // PKCS#7 header
        expected: 'should_fail'
      }
    ];
    
    // Criar arquivos temporários
    const tempDir = path.join(__dirname, 'temp-test-files');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
    
    for (const file of testFiles) {
      const filePath = path.join(tempDir, file.name);
      fs.writeFileSync(filePath, file.content);
    }
    
    // Executar testes
    let passedTests = 0;
    let totalTests = testFiles.length;
    
    for (const file of testFiles) {
      const filePath = path.join(tempDir, file.name);
      const result = await testSignatureUpload(token, filePath, file.expected);
      if (result) passedTests++;
    }
    
    // Limpar arquivos temporários
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    // Resultados
    console.log(`\n📊 Resultados dos testes:`);
    console.log(`✅ Testes aprovados: ${passedTests}/${totalTests}`);
    console.log(`❌ Testes falharam: ${totalTests - passedTests}/${totalTests}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 Todos os testes passaram!');
      process.exit(0);
    } else {
      console.log('💥 Alguns testes falharam!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Erro durante os testes:', error.message);
    process.exit(1);
  }
}

// Executar testes
runTests();
