/**
 * Script de teste para as rotas de assinatura
 * Testa upload e download de assinaturas
 */

const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testSignatureRoutes() {
  try {
    console.log('🧪 Testando rotas de assinatura...');
    
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
    
    // 2. Criar arquivo de teste (PNG simples)
    console.log('\n2️⃣ Criando arquivo de teste...');
    const testImagePath = path.join(__dirname, 'test-signature.png');
    
    // Criar um PNG simples de 1x1 pixel
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // width: 1
      0x00, 0x00, 0x00, 0x01, // height: 1
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
      0x90, 0x77, 0x53, 0xDE, // CRC
      0x00, 0x00, 0x00, 0x0C, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // compressed data
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    
    fs.writeFileSync(testImagePath, pngData);
    console.log('✅ Arquivo de teste criado:', testImagePath);
    
    // 3. Testar upload de assinatura
    console.log('\n3️⃣ Testando upload de assinatura...');
    const formData = new FormData();
    formData.append('signature', fs.createReadStream(testImagePath), {
      filename: 'test-signature.png',
      contentType: 'image/png'
    });
    
    const uploadResponse = await fetch('http://localhost:5000/api/signatures/8', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('📊 Status do upload:', uploadResponse.status);
    
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      console.log('✅ Upload realizado com sucesso!');
      console.log('📄 Dados da assinatura:', uploadData);
      
      // 4. Testar download da assinatura
      console.log('\n4️⃣ Testando download da assinatura...');
      const downloadResponse = await fetch('http://localhost:5000/api/signatures/me/file', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('📊 Status do download:', downloadResponse.status);
      console.log('📊 Headers do download:', Object.fromEntries(downloadResponse.headers.entries()));
      
      if (downloadResponse.ok) {
        console.log('✅ Download realizado com sucesso!');
        
        // Verificar se é uma imagem válida
        const imageBuffer = await downloadResponse.buffer();
        const header = imageBuffer.slice(0, 8).toString('hex');
        console.log('📄 Cabeçalho da imagem:', header);
        
        if (header.startsWith('89504e47')) {
          console.log('✅ Arquivo PNG válido recebido!');
        } else {
          console.log('❌ Arquivo não é um PNG válido');
        }
      } else {
        const errorText = await downloadResponse.text();
        console.log('❌ Erro no download:', errorText);
      }
      
    } else {
      const errorText = await uploadResponse.text();
      console.log('❌ Erro no upload:', errorText);
    }
    
    // 5. Limpar arquivo de teste
    console.log('\n5️⃣ Limpando arquivo de teste...');
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('✅ Arquivo de teste removido');
    }
    
    console.log('\n🎉 Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

// Executar teste
testSignatureRoutes();
