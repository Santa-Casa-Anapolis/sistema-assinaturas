/**
 * Script Node.js para criar arquivos de assinatura físicos após deploy
 * Este script cria imagens PNG válidas para os usuários de teste
 * Execute após executar o SQL setup-test-users.sql
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

// PNG mínimo válido (1x1 pixel transparente)
const MINIMAL_PNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
  0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
  0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54,
  0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01,
  0x0D, 0x0A, 0x2D, 0xB4,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44,
  0xAE, 0x42, 0x60, 0x82
]);

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'notasfiscais_db',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5433,
});

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'server', 'uploads');

async function setupSignatures() {
  try {
    console.log('🖊️ Configurando assinaturas de teste...\n');

    // Buscar usuários de teste que têm assinatura no banco
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.name,
        us.signature_file
      FROM users u
      INNER JOIN user_signatures us ON u.id = us.user_id
      WHERE u.username LIKE '%.teste'
      ORDER BY u.role
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhum usuário de teste com assinatura encontrado.');
      console.log('   Execute primeiro o script SQL: scripts/setup-test-users.sql\n');
      process.exit(0);
    }

    console.log(`✅ Encontrados ${result.rows.length} usuários com assinatura\n`);

    // Criar arquivos físicos
    for (const user of result.rows) {
      const signaturePath = path.join(UPLOAD_DIR, user.signature_file);
      const signatureDir = path.dirname(signaturePath);

      // Criar diretório se não existir
      if (!fs.existsSync(signatureDir)) {
        fs.mkdirSync(signatureDir, { recursive: true });
        console.log(`📁 Diretório criado: ${signatureDir}`);
      }

      // Criar arquivo PNG se não existir
      if (!fs.existsSync(signaturePath)) {
        fs.writeFileSync(signaturePath, MINIMAL_PNG);
        console.log(`✅ ${user.name} (${user.username}): ${signaturePath}`);
      } else {
        console.log(`⏭️  ${user.name} (${user.username}): Arquivo já existe`);
      }
    }

    console.log('\n🎉 Assinaturas configuradas com sucesso!');
    console.log('💡 Nota: Estas são imagens mínimas (1x1 pixel).');
    console.log('   Para usar assinaturas reais, substitua os arquivos por imagens PNG/JPEG reais.\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupSignatures();
}

module.exports = { setupSignatures };

