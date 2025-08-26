const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nota_fiscais',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
  // Configurações de pool
  max: 20, // máximo de conexões no pool
  idleTimeoutMillis: 30000, // tempo limite de inatividade
  connectionTimeoutMillis: 2000, // tempo limite de conexão
});

// Testar conexão
pool.on('connect', () => {
  console.log('✅ Conectado ao PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Erro na conexão PostgreSQL:', err);
});

// Função para inicializar o banco de dados
async function initDatabase() {
  try {
    // Criar tabelas se não existirem
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        username VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        gov_id VARCHAR(255),
        sector VARCHAR(100),
        group_name VARCHAR(100),
        function_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar coluna username se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE
      `);
      console.log('✅ Coluna username adicionada/verificada');
    } catch (error) {
      console.log('ℹ️ Coluna username já existe ou erro:', error.message);
    }

    // Remover constraint NOT NULL da coluna email se existir
    try {
      await pool.query(`
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL
      `);
      console.log('✅ Constraint NOT NULL removida da coluna email');
    } catch (error) {
      console.log('ℹ️ Constraint NOT NULL já removida ou erro:', error.message);
    }

    // Adicionar coluna group_name se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS group_name VARCHAR(100)
      `);
      console.log('✅ Coluna group_name adicionada/verificada');
    } catch (error) {
      console.log('ℹ️ Coluna group_name já existe ou erro:', error.message);
    }

    // Adicionar coluna function_type se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS function_type VARCHAR(100)
      `);
      console.log('✅ Coluna function_type adicionada/verificada');
    } catch (error) {
      console.log('ℹ️ Coluna function_type já existe ou erro:', error.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS signature_flow (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        order_index INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        signed_at TIMESTAMP,
        signature_data TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Tabelas criadas/verificadas com sucesso');

    // Inserir usuários padrão
    const defaultUsers = [
      { name: 'Karla Souza', username: 'karla.souza', role: 'admin', password: '123456', sector: null, group: null, function_type: 'admin' },
      { name: 'Fornecedor', username: 'fornecedor', role: 'fornecedor', password: '123456', sector: null, group: null, function_type: 'fornecedor' },
      
      // Usuários do ciclo de aprovação (apenas aprovam e assinam)
      { name: 'Analista Contabilidade', username: 'analista.contabilidade', role: 'contabilidade', password: '123456', sector: null, group: 'GRUPO CONTABILIDADE', function_type: 'contabilidade' },
      { name: 'Analista Financeiro', username: 'analista.financeiro', role: 'financeiro', password: '123456', sector: null, group: 'GRUPO FINANCEIRO', function_type: 'financeiro' },
      { name: 'Diretor Executivo', username: 'diretor.executivo', role: 'diretoria', password: '123456', sector: null, group: 'GRUPO DIRETORIA', function_type: 'diretoria' },
      
      // Usuários antigos (mantidos para compatibilidade)
      { name: 'Contabilidade', username: 'contabilidade', role: 'contabilidade', password: '123456', sector: null, group: 'GRUPO CONTABILIDADE', function_type: 'contabilidade' },
      { name: 'Financeiro', username: 'financeiro', role: 'financeiro', password: '123456', sector: null, group: 'GRUPO FINANCEIRO', function_type: 'financeiro' },
      { name: 'Diretoria', username: 'diretoria', role: 'diretoria', password: '123456', sector: null, group: 'GRUPO DIRETORIA', function_type: 'diretoria' }
    ];

    // Criar tabela para controlar usuários excluídos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    for (const user of defaultUsers) {
      // Verificar se o usuário foi excluído manualmente
      const deletedUser = await pool.query('SELECT id FROM deleted_users WHERE username = $1', [user.username]);
      
      if (deletedUser.rows.length > 0) {
        console.log(`ℹ️ Usuário excluído manualmente, não recriando: ${user.username}`);
        continue;
      }

      // Verificar se o usuário já existe
      const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [user.username]);
      
      if (existingUser.rows.length === 0) {
        // Usuário não existe, criar novo
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(user.password, 10);
        
        await pool.query(`
          INSERT INTO users (name, username, role, password, sector, group_name, function_type) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [user.name, user.username, user.role, hashedPassword, user.sector, user.group, user.function_type]);
        
        console.log(`✅ Usuário criado: ${user.username}`);
      } else {
        console.log(`ℹ️ Usuário já existe: ${user.username}`);
      }
    }

    console.log('✅ Usuários padrão criados/verificados');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  }
}

// Funções auxiliares para queries
const db = {
  // Query simples
  query: (text, params) => pool.query(text, params),
  
  // Query com retorno de uma linha
  get: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows[0];
  },
  
  // Query com retorno de múltiplas linhas
  all: async (text, params) => {
    const result = await pool.query(text, params);
    return result.rows;
  },
  
  // Query com callback (para compatibilidade)
  run: async (text, params, callback) => {
    try {
      const result = await pool.query(text, params);
      if (callback) {
        callback(null, result);
      }
      return result;
    } catch (error) {
      if (callback) {
        callback(error);
      }
      throw error;
    }
  }
};

module.exports = { pool, db, initDatabase };
