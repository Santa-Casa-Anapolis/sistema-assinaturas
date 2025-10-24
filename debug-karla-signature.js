const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco de dados
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'sistema_assinaturas',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function debugKarlaSignature() {
  try {
    console.log('🔍 === DIAGNÓSTICO DE ASSINATURA - KARLA.SOUZA ===\n');

    // 1. Verificar se o usuário karla.souza existe
    console.log('1️⃣ Verificando usuário karla.souza...');
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', ['karla.souza']);
    
    if (userResult.rows.length === 0) {
      console.log('❌ Usuário karla.souza não encontrado no banco de dados');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('✅ Usuário encontrado:', {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      sector: user.sector
    });

    // 2. Verificar assinaturas do usuário
    console.log('\n2️⃣ Verificando assinaturas do usuário...');
    const signatureResult = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [user.id]);
    
    if (signatureResult.rows.length === 0) {
      console.log('❌ Nenhuma assinatura encontrada para karla.souza');
      console.log('💡 Solução: A usuária precisa fazer upload de uma assinatura');
    } else {
      const signature = signatureResult.rows[0];
      console.log('✅ Assinatura encontrada:', {
        id: signature.id,
        userId: signature.user_id,
        signatureFile: signature.signature_file,
        originalFilename: signature.original_filename,
        createdAt: signature.created_at,
        updatedAt: signature.updated_at
      });

      // 3. Verificar se o arquivo físico existe
      console.log('\n3️⃣ Verificando arquivo físico da assinatura...');
      const filePath = path.join(__dirname, 'server', 'uploads', signature.signature_file);
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log('✅ Arquivo físico encontrado:', {
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        });
      } else {
        console.log('❌ Arquivo físico não encontrado:', filePath);
        console.log('💡 O arquivo pode ter sido movido ou deletado');
      }
    }

    // 4. Verificar todas as assinaturas no sistema
    console.log('\n4️⃣ Verificando todas as assinaturas no sistema...');
    const allSignaturesResult = await pool.query(`
      SELECT us.*, u.name, u.username 
      FROM user_signatures us 
      JOIN users u ON us.user_id = u.id 
      ORDER BY us.created_at DESC
    `);
    
    console.log(`📊 Total de assinaturas cadastradas: ${allSignaturesResult.rows.length}`);
    allSignaturesResult.rows.forEach((sig, index) => {
      console.log(`${index + 1}. ${sig.name} (${sig.username}) - ${sig.signature_file}`);
    });

    // 5. Verificar estrutura da pasta uploads
    console.log('\n5️⃣ Verificando estrutura da pasta uploads...');
    const uploadsPath = path.join(__dirname, 'server', 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
      const files = fs.readdirSync(uploadsPath);
      const signatureFiles = files.filter(file => file.startsWith('signature-'));
      console.log(`📁 Pasta uploads existe. Arquivos de assinatura: ${signatureFiles.length}`);
      signatureFiles.forEach(file => {
        console.log(`   - ${file}`);
      });
    } else {
      console.log('❌ Pasta uploads não existe:', uploadsPath);
    }

  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

// Executar diagnóstico
debugKarlaSignature();
