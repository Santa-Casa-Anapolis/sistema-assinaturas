/**
 * Rotas para gerenciamento de assinaturas
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { signatureUpload, getStorageKey, getFileUrl, UPLOAD_DIR } = require('../config/upload');
const { pool } = require('../database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

/**
 * Criar pasta de assinaturas se não existir
 */
const ensureSignaturesDirectory = () => {
  const signaturesDir = path.join(__dirname, '../uploads/signatures');
  if (!fs.existsSync(signaturesDir)) {
    fs.mkdirSync(signaturesDir, { recursive: true });
    console.log('📁 Pasta de assinaturas criada:', signaturesDir);
  }
};

// Garantir que a pasta existe
ensureSignaturesDirectory();

/**
 * Upload de assinatura para usuário
 * POST /api/signatures/:userId
 */
router.post('/:userId', authenticateToken, signatureUpload.single('signature'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📤 Upload de assinatura para usuário:', userId);
    
    if (!req.file) {
      return res.status(400).json({
        error: 'no_file',
        message: 'Nenhum arquivo de assinatura foi enviado.'
      });
    }

    // Verificar se o usuário existe
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      // Remover arquivo se usuário não existir
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Usuário não encontrado.'
      });
    }

    // Gerar storage key e file URL
    const storageKey = getStorageKey(req.file.path);
    const fileUrl = getFileUrl(storageKey);
    
    console.log('📁 Storage key:', storageKey);
    console.log('🔗 File URL:', fileUrl);

    // Salvar informações da assinatura no banco (usando user_signatures)
    const signatureResult = await pool.query(
      `INSERT INTO user_signatures (user_id, signature_file, original_filename, storage_key, file_url, mimetype, size, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         signature_file = EXCLUDED.signature_file,
         original_filename = EXCLUDED.original_filename,
         storage_key = EXCLUDED.storage_key,
         file_url = EXCLUDED.file_url,
         mimetype = EXCLUDED.mimetype,
         size = EXCLUDED.size,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        req.file.filename,
        req.file.originalname,
        storageKey,
        fileUrl,
        req.file.mimetype,
        req.file.size
      ]
    );

    const signature = signatureResult.rows[0];
    
    console.log('✅ Assinatura salva com sucesso:', {
      userId,
      filename: signature.signature_file,
      originalName: signature.original_filename
    });

    res.status(200).json({
      success: true,
      message: 'Assinatura enviada com sucesso!',
      signature: {
        id: signature.id,
        filename: signature.signature_file,
        originalName: signature.original_filename,
        storageKey: signature.storage_key,
        fileUrl: signature.file_url,
        mimetype: signature.mimetype,
        size: signature.size,
        createdAt: signature.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload de assinatura:', error);
    
    // Remover arquivo em caso de erro
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivo:', cleanupError);
    }
    
    res.status(500).json({
      error: 'upload_error',
      message: 'Erro interno do servidor ao processar assinatura.'
    });
  }
});

/**
 * Obter assinatura do usuário atual
 * GET /api/signatures/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('🔍 Buscando assinatura do usuário atual:', userId);
    
    const result = await pool.query(
      'SELECT * FROM user_signatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Assinatura não encontrada para este usuário.'
      });
    }

    const signature = result.rows[0];
    
    res.status(200).json({
      success: true,
      signature: {
        id: signature.id,
        filename: signature.filename,
        originalName: signature.original_name,
        mimetype: signature.mimetype,
        size: signature.size,
        createdAt: signature.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar assinatura:', error);
    res.status(500).json({
      error: 'database_error',
      message: 'Erro interno do servidor.'
    });
  }
});

/**
 * Obter arquivo de assinatura do usuário atual
 * GET /api/signatures/me/file
 */
router.get('/me/file', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('📁 Servindo arquivo de assinatura para usuário atual:', userId);
    
    const result = await pool.query(
      'SELECT * FROM user_signatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Nenhuma assinatura ativa encontrada para este usuário.'
      });
    }

    const signature = result.rows[0];
    
    // Tentar diferentes caminhos para encontrar o arquivo
    let filePath = null;
    const triedPaths = [];

    // 1. Tentar storage_key primeiro (caminho novo)
    if (signature.storage_key) {
      filePath = path.join(UPLOAD_DIR, signature.storage_key);
      triedPaths.push(filePath);
      console.log('📁 Tentando storage_key:', filePath);
      
      if (fs.existsSync(filePath)) {
        console.log('✅ Arquivo encontrado via storage_key');
      } else {
        filePath = null;
      }
    }

    // 2. Se não encontrou, tentar caminho novo padrão
    if (!filePath) {
      const newPath = path.join(UPLOAD_DIR, 'signatures', String(userId), 'signature.png');
      triedPaths.push(newPath);
      console.log('📁 Tentando caminho novo padrão:', newPath);
      
      if (fs.existsSync(newPath)) {
        filePath = newPath;
        console.log('✅ Arquivo encontrado no caminho novo padrão');
      }
    }

    // 3. Se ainda não encontrou, tentar signature_file (caminho antigo)
    if (!filePath && signature.signature_file) {
      const oldPath = path.join(UPLOAD_DIR, signature.signature_file);
      triedPaths.push(oldPath);
      console.log('📁 Tentando signature_file (caminho antigo):', oldPath);
      
      if (fs.existsSync(oldPath)) {
        filePath = oldPath;
        console.log('✅ Arquivo encontrado no caminho antigo');
      }
    }

    // 4. Se ainda não encontrou, tentar com diferentes extensões
    if (!filePath) {
      const extensions = ['.png', '.jpg', '.jpeg', '.svg'];
      for (const ext of extensions) {
        const altPath = path.join(UPLOAD_DIR, 'signatures', String(userId), `signature${ext}`);
        triedPaths.push(altPath);
        console.log('📁 Tentando com extensão', ext, ':', altPath);
        
        if (fs.existsSync(altPath)) {
          filePath = altPath;
          console.log('✅ Arquivo encontrado com extensão', ext);
          break;
        }
      }
    }

    // Se não encontrou em nenhum lugar
    if (!filePath) {
      console.log('❌ Arquivo não encontrado em nenhum caminho testado');
      return res.status(404).json({
        error: 'file_not_found',
        message: 'Arquivo de assinatura não encontrado no sistema de arquivos.',
        debug: {
          tried_paths: triedPaths,
          signature_data: {
            signature_file: signature.signature_file,
            storage_key: signature.storage_key,
            user_id: userId
          }
        }
      });
    }

    console.log('📂 Caminho final do arquivo:', filePath);

    // Determinar Content-Type correto
    const contentType = signature.mimetype || 'image/png';
    
    console.log('📤 Enviando arquivo de assinatura:', {
      filename: signature.signature_file,
      contentType,
      size: signature.size,
      filePath: filePath
    });

    // Definir headers corretos
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${signature.original_filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

    // Enviar arquivo
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('❌ Erro ao servir arquivo de assinatura:', error);
    res.status(500).json({
      error: 'file_serve_error',
      message: 'Erro interno do servidor ao servir arquivo.'
    });
  }
});

/**
 * Obter assinatura do usuário
 * GET /api/signatures/:userId
 */
router.get('/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔍 Buscando assinatura do usuário:', userId);
    
    const result = await pool.query(
      'SELECT * FROM signatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Assinatura não encontrada para este usuário.'
      });
    }

    const signature = result.rows[0];
    
    res.status(200).json({
      success: true,
      signature: {
        id: signature.id,
        filename: signature.filename,
        originalName: signature.original_name,
        mimetype: signature.mimetype,
        size: signature.size,
        createdAt: signature.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar assinatura:', error);
    res.status(500).json({
      error: 'database_error',
      message: 'Erro interno do servidor.'
    });
  }
});

/**
 * Servir arquivo de assinatura com Content-Type correto
 * GET /api/signatures/:userId/file
 */
router.get('/:userId/file', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📁 Servindo arquivo de assinatura para usuário:', userId);
    
    const result = await pool.query(
      'SELECT * FROM signatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Arquivo de assinatura não encontrado.'
      });
    }

    const signature = result.rows[0];
    const filePath = path.join(__dirname, '..', 'uploads', signature.signature_file);

    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'file_not_found',
        message: 'Arquivo de assinatura não encontrado no sistema de arquivos.'
      });
    }

    // Determinar Content-Type correto
    const contentType = signature.mimetype || 'image/png';
    
    console.log('📤 Enviando arquivo de assinatura:', {
      filename: signature.filename,
      contentType,
      size: signature.size
    });

    // Definir headers corretos
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${signature.original_name}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

    // Enviar arquivo
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('❌ Erro ao servir arquivo de assinatura:', error);
    res.status(500).json({
      error: 'file_serve_error',
      message: 'Erro interno do servidor ao servir arquivo.'
    });
  }
});

/**
 * Atualizar assinatura do usuário
 * PUT /api/signatures/:userId
 */
router.put('/:userId', authenticateToken, signatureUpload.single('signature'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🔄 Atualizando assinatura do usuário:', userId);
    
    if (!req.file) {
      return res.status(400).json({
        error: 'no_file',
        message: 'Nenhum arquivo de assinatura foi enviado.'
      });
    }

    // Buscar assinatura atual
    const currentResult = await pool.query(
      'SELECT * FROM signatures WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );

    // Remover arquivo antigo se existir
    if (currentResult.rows.length > 0) {
      const currentSignature = currentResult.rows[0];
      try {
        if (fs.existsSync(currentSignature.file_path)) {
          fs.unlinkSync(currentSignature.file_path);
          console.log('🗑️ Arquivo antigo removido:', currentSignature.file_path);
        }
      } catch (cleanupError) {
        console.warn('⚠️ Erro ao remover arquivo antigo:', cleanupError.message);
      }
    }

    // Atualizar no banco
    const signatureResult = await pool.query(
      `INSERT INTO signatures (user_id, filename, original_name, mimetype, size, file_path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         filename = EXCLUDED.filename,
         original_name = EXCLUDED.original_name,
         mimetype = EXCLUDED.mimetype,
         size = EXCLUDED.size,
         file_path = EXCLUDED.file_path,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        req.file.path
      ]
    );

    const signature = signatureResult.rows[0];
    
    console.log('✅ Assinatura atualizada com sucesso:', {
      userId,
      filename: signature.filename,
      size: signature.size
    });

    res.status(200).json({
      success: true,
      message: 'Assinatura atualizada com sucesso!',
      signature: {
        id: signature.id,
        filename: signature.filename,
        originalName: signature.original_name,
        mimetype: signature.mimetype,
        size: signature.size,
        updatedAt: signature.updated_at || signature.created_at
      }
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar assinatura:', error);
    
    // Remover arquivo em caso de erro
    try {
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivo:', cleanupError);
    }
    
    res.status(500).json({
      error: 'update_error',
      message: 'Erro interno do servidor ao atualizar assinatura.'
    });
  }
});

module.exports = router;
