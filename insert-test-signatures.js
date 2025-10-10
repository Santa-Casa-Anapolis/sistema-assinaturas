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

async function insertTestSignatures() {
  try {
    console.log('🖊️ Inserindo assinaturas de teste no banco...');
    
    // Usuários de teste
    const testUsers = [
      { username: 'admin@santacasa.org', name: 'Administrador Sistema' },
      { username: 'supervisor@santacasa.org', name: 'Supervisor Setor A' },
      { username: 'contabilidade@santacasa.org', name: 'Contabilidade' },
      { username: 'financeiro@santacasa.org', name: 'Financeiro' },
      { username: 'diretoria@santacasa.org', name: 'Diretoria' }
    ];

    for (const user of testUsers) {
      // Buscar ID do usuário
      const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      
      if (userResult.rows.length === 0) {
        console.log(`⚠️ Usuário não encontrado: ${user.username}`);
        continue;
      }
      
      const userId = userResult.rows[0].id;
      
      // Criar assinatura de teste
      const signatureData = {
        name: `Assinatura ${user.name}`,
        signature_type: 'text',
        signature_data: `${user.name}\n________________\nData: ${new Date().toLocaleDateString('pt-BR')}\nSistema de Assinaturas - Santa Casa`,
        is_active: true,
        created_at: new Date()
      };
      
      // Inserir assinatura no banco
      await pool.query(`
        INSERT INTO user_signatures (user_id, name, signature_type, signature_data, is_active, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, name) DO UPDATE SET
          signature_type = EXCLUDED.signature_type,
          signature_data = EXCLUDED.signature_data,
          is_active = EXCLUDED.is_active
      `, [
        userId,
        signatureData.name,
        signatureData.signature_type,
        signatureData.signature_data,
        signatureData.is_active,
        signatureData.created_at
      ]);
      
      console.log(`✅ Assinatura inserida para: ${user.name}`);
    }
    
    console.log('\n🎯 Assinaturas de teste inseridas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao inserir assinaturas:', error);
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  insertTestSignatures();
}

module.exports = { insertTestSignatures };
