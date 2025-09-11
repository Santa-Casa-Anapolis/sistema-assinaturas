const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notasfiscais_db',
  password: process.env.DB_PASSWORD || '2025SantaCasaFD',
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
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Adicionar coluna username se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE
      `);
    } catch (err) {
      // Coluna já existe, ignorar erro
    }

    // Adicionar coluna is_admin se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0
      `);
    } catch (err) {
      // Coluna já existe, ignorar erro
    }

    // Criar tabela de grupos de acesso
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        permissions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de associação usuário-grupo
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_groups (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        group_id INTEGER,
        assigned_by INTEGER,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (group_id) REFERENCES access_groups (id),
        FOREIGN KEY (assigned_by) REFERENCES users (id)
      )
    `);

    // Criar tabela de documentos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        current_stage VARCHAR(50) DEFAULT 'contabilidade',
        created_by INTEGER NOT NULL,
        supervisor_id INTEGER,
        sector VARCHAR(100),
        amount DECIMAL(10,2),
        payment_proof_path VARCHAR(500),
        payment_date TIMESTAMP,
        payment_status VARCHAR(50) DEFAULT 'pending',
        final_approval_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users (id),
        FOREIGN KEY (supervisor_id) REFERENCES users (id)
      )
    `);

    // Criar tabela de histórico de aprovações
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_approvals (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        stage VARCHAR(50) NOT NULL,
        action VARCHAR(50) NOT NULL,
        comments TEXT,
        gov_signature_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Criar tabela de setores
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        folder_path VARCHAR(500) NOT NULL,
        supervisor_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (supervisor_id) REFERENCES users (id)
      )
    `);

    // Verificar se já existem usuários
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    
    if (userCount.rows[0].count === '0') {
      console.log('✅ Criando usuários e grupos padrão...');
      
      // Criar usuários de teste
      const bcrypt = require('bcryptjs');
      const users = [
        {
          name: 'Administrador Sistema',
          email: 'admin@empresa.com',
          username: 'admin@empresa.com',
          role: 'admin',
          password: await bcrypt.hash('admin123', 10),
          sector: 'Administração',
          is_admin: 1
        },
        {
          name: 'Supervisor Setor A',
          email: 'supervisor.setora@empresa.com',
          username: 'supervisor.setora@empresa.com',
          role: 'supervisor',
          password: await bcrypt.hash('123456', 10),
          sector: 'TECNOLOGIA DA INFORMAÇÃO'
        },
        {
          name: 'Contabilidade',
          email: 'contabilidade@empresa.com',
          username: 'contabilidade@empresa.com',
          role: 'contabilidade',
          password: await bcrypt.hash('123456', 10),
          sector: 'Financeiro'
        },
        {
          name: 'Financeiro',
          email: 'financeiro@empresa.com',
          username: 'financeiro@empresa.com',
          role: 'financeiro',
          password: await bcrypt.hash('123456', 10),
          sector: 'Financeiro'
        },
        {
          name: 'Diretoria',
          email: 'diretoria@empresa.com',
          username: 'diretoria@empresa.com',
          role: 'diretoria',
          password: await bcrypt.hash('123456', 10),
          sector: 'Diretoria'
        }
      ];

      // Inserir usuários de teste
      for (const user of users) {
        try {
          await pool.query(`
            INSERT INTO users (name, email, username, role, password, sector, is_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [user.name, user.email, user.username, user.role, user.password, user.sector, user.is_admin || 0]);
        } catch (err) {
          console.log(`Usuário ${user.email} já existe ou erro:`, err.message);
        }
      }

      // Criar grupos de acesso padrão (apenas usuários internos)
      const defaultGroups = [
        {
          name: 'Operacional',
          description: 'Grupo para funcionários operacionais',
          permissions: JSON.stringify(['upload_document', 'view_own_documents', 'view_sector_documents'])
        },
        {
          name: 'Supervisores',
          description: 'Grupo para supervisores de setor',
          permissions: JSON.stringify(['review_documents', 'approve_documents', 'view_sector_documents', 'manage_sector_users'])
        },
        {
          name: 'Contabilidade',
          description: 'Grupo para área contábil',
          permissions: JSON.stringify(['review_documents', 'approve_documents', 'view_all_documents', 'financial_approval', 'audit_documents'])
        },
        {
          name: 'Financeiro',
          description: 'Grupo para área financeira',
          permissions: JSON.stringify(['review_documents', 'approve_documents', 'view_all_documents', 'payment_approval', 'budget_approval'])
        },
        {
          name: 'Diretoria',
          description: 'Grupo para diretoria executiva',
          permissions: JSON.stringify(['review_documents', 'approve_documents', 'view_all_documents', 'final_approval', 'admin_access', 'strategic_approval'])
        }
      ];

      for (const group of defaultGroups) {
        try {
          await pool.query(`
            INSERT INTO access_groups (name, description, permissions)
            VALUES ($1, $2, $3)
          `, [group.name, group.description, group.permissions]);
        } catch (err) {
          console.log(`Grupo ${group.name} já existe ou erro:`, err.message);
        }
      }

      // Criar setores padrão
      const defaultSectors = [
        {
          name: 'TECNOLOGIA DA INFORMAÇÃO',
          folder_path: 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\Contabilidade'
        },
        {
          name: 'RECURSOS HUMANOS',
          folder_path: 'Y:\\RECURSOS HUMANOS\\3. Sistemas\\Karla\\Contabilidade'
        },
        {
          name: 'FINANCEIRO',
          folder_path: 'Y:\\FINANCEIRO\\3. Sistemas\\Karla\\Contabilidade'
        },
        {
          name: 'COMERCIAL',
          folder_path: 'Y:\\COMERCIAL\\3. Sistemas\\Karla\\Contabilidade'
        },
        {
          name: 'OPERACIONAL',
          folder_path: 'Y:\\OPERACIONAL\\3. Sistemas\\Karla\\Contabilidade'
        }
      ];

      for (const sector of defaultSectors) {
        try {
          await pool.query(`
            INSERT INTO sectors (name, folder_path)
            VALUES ($1, $2)
          `, [sector.name, sector.folder_path]);
        } catch (err) {
          console.log(`Setor ${sector.name} já existe ou erro:`, err.message);
        }
      }

      console.log('✅ Usuários, grupos e setores criados com sucesso!');
    } else {
      console.log('✅ Banco de dados já inicializado com dados.');
    }

    return pool;
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    throw error;
  }
}

module.exports = { pool, initDatabase };