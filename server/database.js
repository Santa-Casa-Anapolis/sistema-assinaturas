const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notasfiscais_db',
  password: process.env.DB_PASSWORD || '123456',
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

    // Adicionar coluna profile se não existir
    try {
      await pool.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile VARCHAR(50) DEFAULT 'supervisor'
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

    // Criar tabela de arquivos de documentos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS document_files (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        filename VARCHAR(255) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id)
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

    // Criar tabela de fluxo de assinaturas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signature_flow (
        id SERIAL PRIMARY KEY,
        document_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        signed_at TIMESTAMP,
        signature_data TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Criar tabela de auditoria
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id INTEGER,
        document_id INTEGER,
        details TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Criar tabela de usuários deletados
    await pool.query(`
      CREATE TABLE IF NOT EXISTS deleted_users (
        id SERIAL PRIMARY KEY,
        original_id INTEGER,
        name VARCHAR(255),
        email VARCHAR(255),
        username VARCHAR(255),
        role VARCHAR(50),
        sector VARCHAR(100),
        deleted_by INTEGER,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        FOREIGN KEY (deleted_by) REFERENCES users (id)
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
          email: 'admin@santacasa.org',
          username: 'admin@santacasa.org',
          role: 'admin',
          password: await bcrypt.hash('123456', 10),
          sector: 'ADMINISTRAÇÃO',
          profile: 'admin',
          is_admin: 1
        },
        {
          name: 'Supervisor Setor A',
          email: 'supervisor@santacasa.org',
          username: 'supervisor@santacasa.org',
          role: 'supervisor',
          password: await bcrypt.hash('123456', 10),
          sector: 'TECNOLOGIA DA INFORMAÇÃO',
          profile: 'supervisor'
        },
        {
          name: 'Contabilidade',
          email: 'contabilidade@santacasa.org',
          username: 'contabilidade@santacasa.org',
          role: 'contabilidade',
          password: await bcrypt.hash('123456', 10),
          sector: 'CONTABILIDADE',
          profile: 'contabilidade'
        },
        {
          name: 'Financeiro',
          email: 'financeiro@santacasa.org',
          username: 'financeiro@santacasa.org',
          role: 'financeiro',
          password: await bcrypt.hash('123456', 10),
          sector: 'FINANCEIRO',
          profile: 'financeiro'
        },
        {
          name: 'Diretoria',
          email: 'diretoria@santacasa.org',
          username: 'diretoria@santacasa.org',
          role: 'diretoria',
          password: await bcrypt.hash('123456', 10),
          sector: 'DIRETORIA',
          profile: 'diretoria'
        }
      ];

      // Inserir usuários de teste
      for (const user of users) {
        try {
          await pool.query(`
            INSERT INTO users (name, email, username, role, password, sector, profile, is_admin)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          `, [user.name, user.email, user.username, user.role, user.password, user.sector, user.profile, user.is_admin || 0]);
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
        name: 'CONTABILIDADE',
        folder_path: 'Y:\\CONTABILIDADE\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'FINANCEIRO',
        folder_path: 'Y:\\FINANCEIRO\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'DIRETORIA',
        folder_path: 'Y:\\DIRETORIA\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'RECURSOS HUMANOS',
        folder_path: 'Y:\\RECURSOS HUMANOS\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'DEPARTAMENTO PESSOAL',
        folder_path: 'Y:\\DEPARTAMENTO PESSOAL\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'FARMÁCIA',
        folder_path: 'Y:\\FARMÁCIA\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'CENTRAL DE IMAGEM',
        folder_path: 'Y:\\CENTRAL DE IMAGEM\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'LABORATÓRIO',
        folder_path: 'Y:\\LABORATÓRIO\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'CENTRO MÉDICO',
        folder_path: 'Y:\\CENTRO MÉDICO\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'COMPRAS',
        folder_path: 'Y:\\COMPRAS\\3. Sistemas\\Karla\\Contabilidade'
      },
      {
        name: 'MANUTENÇÃO',
        folder_path: 'Y:\\MANUTENÇÃO\\3. Sistemas\\Karla\\Contabilidade'
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