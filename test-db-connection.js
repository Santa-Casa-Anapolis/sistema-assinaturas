const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'nota_fiscais',
  password: '123456',
  port: 5432,
});

async function testConnection() {
  try {
    console.log('🔍 Testando conexão com o banco...');
    
    // Testar conexão básica
    const client = await pool.connect();
    console.log('✅ Conexão estabelecida com sucesso');
    
    // Testar se a tabela documents existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'documents'
      );
    `);
    
    console.log('📋 Tabela documents existe:', tableCheck.rows[0].exists);
    
    if (tableCheck.rows[0].exists) {
      // Verificar estrutura da tabela
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'documents'
        ORDER BY ordinal_position;
      `);
      
      console.log('🏗️ Estrutura da tabela documents:');
      structure.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Testar query simples
      const testQuery = await client.query('SELECT COUNT(*) as total FROM documents');
      console.log('📊 Total de documentos:', testQuery.rows[0].total);
      
      // Testar query com JOIN
      const testJoin = await client.query(`
        SELECT d.*, u.name as created_by_name
        FROM documents d
        LEFT JOIN users u ON d.created_by = u.id
        LIMIT 1
      `);
      console.log('🔗 Query com JOIN funcionando:', testJoin.rows.length > 0 ? 'Sim' : 'Não');
      
    } else {
      console.log('❌ Tabela documents não existe!');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Erro ao testar conexão:', error);
  } finally {
    await pool.end();
  }
}

testConnection();


