const { Pool } = require('pg');
require('dotenv').config();

// Configuração do pool de conexões PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nota_fiscais',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function addSectorColumn() {
  try {
    console.log('🔧 Adicionando coluna sector à tabela users...');
    
    // Adicionar coluna sector se não existir
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS sector VARCHAR(100)
    `);
    
    console.log('✅ Coluna sector adicionada com sucesso!');
    
    // Atualizar usuários existentes com setores
    const updateQueries = [
      {
        email: 'supervisor.setora@empresa.com',
        sector: 'SETOR CONTABILIDADE',
        name: 'Supervisor Contabilidade'
      },
      {
        email: 'supervisor.setorb@empresa.com', 
        sector: 'SETOR CENTRO DE IMAGEM',
        name: 'Supervisor Centro de Imagem'
      }
    ];
    
    for (const user of updateQueries) {
      await pool.query(`
        UPDATE users 
        SET sector = $1, name = $2 
        WHERE email = $3
      `, [user.sector, user.name, user.email]);
    }
    
    // Inserir novos supervisores se não existirem
    const newUsers = [
      {
        name: 'Supervisor Centro Médico',
        email: 'supervisor.medico@empresa.com',
        role: 'supervisor',
        password: '123456',
        sector: 'SETOR CENTRO MEDICO'
      }
    ];
    
    for (const user of newUsers) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      await pool.query(`
        INSERT INTO users (name, email, role, password, sector) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (email) DO NOTHING
      `, [user.name, user.email, user.role, hashedPassword, user.sector]);
    }
    
    console.log('✅ Usuários atualizados com setores!');
    console.log('📋 Setores configurados:');
    console.log('   - SETOR CONTABILIDADE');
    console.log('   - SETOR CENTRO DE IMAGEM');
    console.log('   - SETOR CENTRO MEDICO');
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna sector:', error);
  } finally {
    await pool.end();
  }
}

addSectorColumn();
