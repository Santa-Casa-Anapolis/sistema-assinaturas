const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notasfiscais_db',
  password: '123456',
  port: 5432,
});

async function fixSignatureFilename() {
  try {
    console.log('🔧 Corrigindo nome do arquivo de assinatura...');
    
    const client = await pool.connect();
    
    // Atualizar o signature_filename para o arquivo correto
    const result = await client.query(`
      UPDATE user_signatures 
      SET signature_filename = 'signature-1758656468257-771960751.png'
      WHERE user_id = 27
    `);
    
    console.log('✅ Arquivo de assinatura atualizado!');
    
    // Verificar se foi atualizado
    const check = await client.query('SELECT * FROM user_signatures WHERE user_id = 27');
    console.log('📋 Dados atualizados:', check.rows[0]);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro ao corrigir assinatura:', error);
  } finally {
    await pool.end();
  }
}

fixSignatureFilename();










