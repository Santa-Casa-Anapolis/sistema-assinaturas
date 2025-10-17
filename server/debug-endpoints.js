const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuração do banco
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notasfiscais_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function debugEndpoints() {
  console.log('🔍 === DEBUG DOS ENDPOINTS ===');
  
  try {
    // 1. Verificar documento ID 22
    console.log('\n📄 Verificando documento ID 22...');
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [22]);
    if (docResult.rows.length > 0) {
      const doc = docResult.rows[0];
      console.log('✅ Documento encontrado:', {
        id: doc.id,
        title: doc.title,
        filename: doc.filename,
        original_filename: doc.original_filename,
        signed_filename: doc.signed_filename,
        created_at: doc.created_at
      });
      
      // Verificar arquivos na pasta uploads
      const uploadsDir = path.join(__dirname, 'uploads');
      console.log('\n📁 Verificando pasta uploads...');
      console.log('📂 Caminho:', uploadsDir);
      
      if (fs.existsSync(uploadsDir)) {
        const files = fs.readdirSync(uploadsDir);
        console.log('📁 Arquivos encontrados:', files.length);
        console.log('📋 Primeiros 10 arquivos:', files.slice(0, 10));
        
        // Verificar se o arquivo do documento existe
        if (doc.filename) {
          const filePath = path.join(uploadsDir, doc.filename);
          console.log('🔍 Verificando arquivo:', doc.filename);
          console.log('📂 Caminho completo:', filePath);
          console.log('✅ Arquivo existe:', fs.existsSync(filePath));
        }
        
        if (doc.signed_filename) {
          const signedPath = path.join(uploadsDir, doc.signed_filename);
          console.log('🔍 Verificando arquivo assinado:', doc.signed_filename);
          console.log('📂 Caminho completo:', signedPath);
          console.log('✅ Arquivo assinado existe:', fs.existsSync(signedPath));
        }
      } else {
        console.log('❌ Pasta uploads não existe!');
      }
    } else {
      console.log('❌ Documento ID 22 não encontrado');
    }
    
    // 2. Verificar usuário ID 2
    console.log('\n👤 Verificando usuário ID 2...');
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [2]);
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ Usuário encontrado:', {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email
      });
    } else {
      console.log('❌ Usuário ID 2 não encontrado');
    }
    
    // 3. Verificar assinatura do usuário ID 2
    console.log('\n✍️ Verificando assinatura do usuário ID 2...');
    const signatureResult = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [2]);
    if (signatureResult.rows.length > 0) {
      const signature = signatureResult.rows[0];
      console.log('✅ Assinatura encontrada:', {
        id: signature.id,
        user_id: signature.user_id,
        signature_file: signature.signature_file,
        original_filename: signature.original_filename,
        created_at: signature.created_at
      });
      
      // Verificar arquivo de assinatura
      if (signature.signature_file) {
        const uploadsDir = path.join(__dirname, 'uploads');
        const signaturePath = path.join(uploadsDir, signature.signature_file);
        console.log('🔍 Verificando arquivo de assinatura:', signature.signature_file);
        console.log('📂 Caminho completo:', signaturePath);
        console.log('✅ Arquivo de assinatura existe:', fs.existsSync(signaturePath));
      }
    } else {
      console.log('❌ Assinatura do usuário ID 2 não encontrada');
    }
    
    // 4. Verificar estrutura da tabela documents
    console.log('\n🗄️ Verificando estrutura da tabela documents...');
    const tableResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position
    `);
    console.log('📋 Colunas da tabela documents:');
    tableResult.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    await pool.end();
  }
}

debugEndpoints();
