const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notasfiscais_db',
  password: '123456',
  port: 5432,
});

async function testSignatureLoading() {
  try {
    console.log('🔍 Testando carregamento de assinatura do supervisor.teste...');
    
    const client = await pool.connect();
    
    // 1. Verificar se o usuário existe
    const userResult = await client.query('SELECT * FROM users WHERE username = $1', ['supervisor.teste']);
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário supervisor.teste não encontrado!');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:', {
      id: user.id,
      username: user.username,
      name: user.name
    });
    
    // 2. Verificar assinatura no banco
    const signatureResult = await client.query('SELECT * FROM user_signatures WHERE user_id = $1', [user.id]);
    if (signatureResult.rows.length === 0) {
      console.log('❌ Nenhuma assinatura encontrada no banco para este usuário!');
      return;
    }
    
    const signature = signatureResult.rows[0];
    console.log('✅ Assinatura encontrada no banco:', {
      id: signature.id,
      user_id: signature.user_id,
      signature_filename: signature.signature_filename,
      signature_path: signature.signature_path,
      original_filename: signature.original_filename
    });
    
    // 3. Verificar se o arquivo físico existe
    const filePath = path.join(__dirname, 'server', 'uploads', signature.signature_filename);
    console.log('📁 Caminho do arquivo:', filePath);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log('✅ Arquivo físico encontrado:', {
        tamanho: stats.size + ' bytes',
        modificado: stats.mtime
      });
    } else {
      console.log('❌ ARQUIVO FÍSICO NÃO ENCONTRADO!');
      
      // Procurar arquivos similares
      const uploadsDir = path.join(__dirname, 'server', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log('📁 Arquivos na pasta uploads:');
        files.forEach(file => {
          if (file.includes('signature') || file.includes('assinatura') || file.endsWith('.png')) {
            console.log('  -', file);
          }
        });
      }
    }
    
    // 4. Testar a rota da API
    console.log('\n🌐 Testando rotas da API...');
    
    // Simular requisição para /api/users/:id/signature
    const apiSignatureResult = await client.query(`
      SELECT 
        id,
        user_id,
        signature_filename as "signatureFile",
        original_filename as "originalFilename",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM user_signatures 
      WHERE user_id = $1
    `, [user.id]);
    
    if (apiSignatureResult.rows.length > 0) {
      console.log('✅ Dados da API (rota /api/users/:id/signature):');
      console.log(JSON.stringify(apiSignatureResult.rows[0], null, 2));
    } else {
      console.log('❌ Erro na consulta da API');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro ao testar carregamento de assinatura:', error);
  } finally {
    await pool.end();
  }
}

testSignatureLoading();












