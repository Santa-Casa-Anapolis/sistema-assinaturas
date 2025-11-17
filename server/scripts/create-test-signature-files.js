/**
 * Script para criar arquivos placeholder de assinatura para usuários de teste
 * Este script garante que os arquivos físicos existam mesmo após reinicializações
 */

const fs = require('fs');
const path = require('path');

// Resolver caminho do UPLOAD_DIR corretamente
// __dirname aponta para server/scripts, então subimos 2 níveis para chegar em server
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads');

/**
 * Criar arquivo placeholder de assinatura
 * Gera uma imagem PNG simples com texto
 */
function createSignaturePlaceholder(userId, userName) {
  const signaturesDir = path.join(UPLOAD_DIR, 'signatures', String(userId));
  const signaturePath = path.join(signaturesDir, 'signature.png');

  // Criar diretório se não existir
  if (!fs.existsSync(signaturesDir)) {
    fs.mkdirSync(signaturesDir, { recursive: true });
    console.log(`📁 Diretório criado: ${signaturesDir}`);
  }

  // Se o arquivo já existe, não sobrescrever
  if (fs.existsSync(signaturePath)) {
    console.log(`✅ Arquivo de assinatura já existe: ${signaturePath}`);
    return signaturePath;
  }

  // Criar uma imagem PNG simples (1x1 pixel transparente)
  // Em produção, você pode usar uma biblioteca como 'canvas' ou 'sharp' para criar uma imagem real
  // Por enquanto, criamos um arquivo placeholder mínimo
  
  // PNG mínimo válido (1x1 pixel transparente)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
    0x49, 0x48, 0x44, 0x52, // IHDR
    0x00, 0x00, 0x00, 0x01, // width: 1
    0x00, 0x00, 0x00, 0x01, // height: 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, compression, filter, interlace
    0x1F, 0x15, 0xC4, 0x89, // CRC
    0x00, 0x00, 0x00, 0x0A, // IDAT chunk length
    0x49, 0x44, 0x41, 0x54, // IDAT
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, // compressed data
    0x0D, 0x0A, 0x2D, 0xB4, // CRC
    0x00, 0x00, 0x00, 0x00, // IEND chunk length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);

  try {
    fs.writeFileSync(signaturePath, pngBuffer);
    console.log(`✅ Arquivo de assinatura criado: ${signaturePath}`);
    return signaturePath;
  } catch (error) {
    console.error(`❌ Erro ao criar arquivo de assinatura para ${userName}:`, error.message);
    return null;
  }
}

/**
 * Criar arquivos de assinatura para todos os usuários de teste
 */
async function createTestSignatureFiles(pool) {
  try {
    console.log('🖊️ Criando arquivos de assinatura para usuários de teste...');

    // Buscar usuários de teste
    const result = await pool.query(`
      SELECT u.id, u.username, u.name, us.signature_file
      FROM users u
      LEFT JOIN user_signatures us ON u.id = us.user_id
      WHERE u.username LIKE '%.teste'
      ORDER BY u.role
    `);

    if (result.rows.length === 0) {
      console.log('⚠️ Nenhum usuário de teste encontrado');
      return;
    }

    console.log(`📋 Encontrados ${result.rows.length} usuários de teste`);

    for (const user of result.rows) {
      if (user.signature_file) {
        // Criar arquivo baseado no caminho do banco
        const signaturePath = path.join(UPLOAD_DIR, user.signature_file);
        const signatureDir = path.dirname(signaturePath);

        // Criar diretório se não existir
        if (!fs.existsSync(signatureDir)) {
          fs.mkdirSync(signatureDir, { recursive: true });
          console.log(`📁 Diretório criado: ${signatureDir}`);
        }

        // Criar arquivo se não existir
        if (!fs.existsSync(signaturePath)) {
          createSignaturePlaceholder(user.id, user.name);
        } else {
          console.log(`✅ Arquivo já existe: ${signaturePath}`);
        }
      } else {
        console.log(`⚠️ Usuário ${user.username} não tem assinatura no banco`);
      }
    }

    console.log('✅ Arquivos de assinatura verificados/criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar arquivos de assinatura:', error);
  }
}

module.exports = {
  createSignaturePlaceholder,
  createTestSignatureFiles
};

