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
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(100) NOT NULL,
        password VARCHAR(255) NOT NULL,
        gov_id VARCHAR(255),
        sector VARCHAR(100),
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
      { name: 'Karla Souza', email: 'karla.souza@empresa.com', username: 'karla.souza', role: 'admin', password: '123456', sector: null },
      { name: 'Fornecedor', email: 'fornecedor@empresa.com', username: 'fornecedor', role: 'fornecedor', password: '123456', sector: null },
      { name: 'Supervisor TI', email: 'supervisor.ti@empresa.com', username: 'supervisor.ti', role: 'supervisor', password: '123456', sector: 'SETOR TECNOLOGIA DA INFORMAÇÃO' },
      { name: 'Supervisor Contabilidade', email: 'supervisor.contabilidade@empresa.com', username: 'supervisor.contabilidade', role: 'supervisor', password: '123456', sector: 'SETOR CONTABILIDADE' },
      { name: 'Supervisor Centro de Imagem', email: 'supervisor.imagem@empresa.com', username: 'supervisor.imagem', role: 'supervisor', password: '123456', sector: 'SETOR CENTRO DE IMAGEM' },
      { name: 'Supervisor Centro Médico', email: 'supervisor.medico@empresa.com', username: 'supervisor.medico', role: 'supervisor', password: '123456', sector: 'SETOR CENTRO MEDICO' },
      { name: 'Contabilidade', email: 'contabilidade@empresa.com', username: 'contabilidade', role: 'contabilidade', password: '123456', sector: null },
      { name: 'Financeiro', email: 'financeiro@empresa.com', username: 'financeiro', role: 'financeiro', password: '123456', sector: null },
      { name: 'Diretoria', email: 'diretoria@empresa.com', username: 'diretoria', role: 'diretoria', password: '123456', sector: null }
    ];

    for (const user of defaultUsers) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(`
        INSERT INTO users (name, email, username, role, password, sector) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        ON CONFLICT (email) DO UPDATE SET 
          name = EXCLUDED.name,
          username = EXCLUDED.username,
          role = EXCLUDED.role,
          password = EXCLUDED.password,
          sector = EXCLUDED.sector
      `, [user.name, user.email, user.username, user.role, hashedPassword, user.sector]);
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
