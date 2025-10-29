/**
 * Rotas para gerenciamento de assinaturas - Versão Robusta
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { signatureUpload, UPLOAD_DIR } = require('../config/upload');
const { pool } = require('../database');
const authenticateToken = require('../middleware/auth');
const signaturesRepo = require('../repositories/signatures.repo');

const router = express.Router();

/**
 * Upload de assinatura para usuário (admin)
 * POST /api/signatures/:userId
 */
router.post('/:userId', authenticateToken, signatureUpload.single('signature'), async (req, res) => {
  try {
    const targetUserId = Number(req.params.userId);
    
    console.log('📤 Upload assinatura -> admin:', req.user, 'targetUserId:', targetUserId);
    
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'forbidden' });
    }
    
    if (!req.file) {
      return res.status(400).json({
        error: 'no_file',
        message: 'Nenhum arquivo de assinatura foi enviado.'
      });
    }

    // Verificar se o usuário existe
    const userResult = await pool.query('SELECT id, name FROM users WHERE id = $1', [targetUserId]);
    if (userResult.rows.length === 0) {
      // Remover arquivo se usuário não existir
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        error: 'user_not_found',
        message: 'Usuário não encontrado.'
      });
    }

    // Multer já salvou em /app/uploads/signatures/<targetUserId>/signature.png
    const originalName = req.file.originalname || 'signature.png';
    const relPath = `signatures/${targetUserId}/signature.png`;
    
    console.log('📁 Upload assinatura -> file:', relPath);

    // Usar repositório para upsert
    const signature = await signaturesRepo.upsertSignature(targetUserId, relPath, originalName);
    
    console.log('✅ Assinatura salva com sucesso:', {
      userId: targetUserId,
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
        path: relPath
      }
    });

  } catch (error) {
    console.error('❌ Erro no upload de assinatura:', error);
    
    // Remover arquivo em caso de erro
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('❌ Erro ao remover arquivo:', unlinkError);
      }
    }
    
    res.status(500).json({
      error: 'upload_error',
      message: 'Erro interno do servidor no upload de assinatura.'
    });
  }
});

/**
 * Obter arquivo de assinatura do usuário atual
 * GET /api/signatures/me/file
 */
router.get('/me/file', authenticateToken, async (req, res) => {
  try {
    console.log('📁 GET my signature -> req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = req.user.id;
    console.log('📁 Buscando assinatura para user_id:', userId);

    // Buscar assinatura usando repositório
    const sig = await signaturesRepo.findByUserId(userId);
    console.log('📁 GET my signature -> row:', sig);

    if (!sig || !sig.signature_file) {
      console.log('❌ Nenhuma assinatura encontrada no DB para user_id:', userId);
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Nenhuma assinatura encontrada para este usuário.'
      });
    }

    // Resolver caminho físico do arquivo
    const filePath = path.join(UPLOAD_DIR, sig.signature_file);
    console.log('📁 Caminho resolvido:', filePath);

    if (!fs.existsSync(filePath)) {
      console.log('❌ Arquivo não existe no FS (container reiniciou/arquivo apagou):', filePath);
      return res.status(410).json({
        error: 'signature_gone',
        message: 'Sua assinatura não está disponível. Reenvie uma nova assinatura.'
      });
    }

    console.log('✅ Arquivo encontrado no FS, enviando...');

    // Headers
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="${sig.original_filename || 'signature.png'}"`);
    res.setHeader('Cache-Control', 'no-store');

    // ETag opcional baseada em mtime + size
    try {
      const stats = await fs.promises.stat(filePath);
      const etag = `"sig-${stats.size}-${Math.trunc(stats.mtimeMs)}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Last-Modified', new Date(stats.mtimeMs).toUTCString());
      
      if (req.headers['if-none-match'] === etag) {
        console.log('📁 If-None-Match match, retornando 304');
        return res.status(304).end();
      }
    } catch (error) {
      console.warn('⚠️ Erro ao gerar ETag:', error.message);
    }

    // Enviar arquivo
    return res.sendFile(filePath);

  } catch (error) {
    console.error('❌ Erro ao servir arquivo de assinatura:', error);
    res.status(500).json({
      error: 'file_serve_error',
      message: 'Erro interno do servidor ao servir arquivo.'
    });
  }
});

/**
 * Obter informações da assinatura do usuário atual
 * GET /api/signatures/me
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    console.log('📁 GET my signature info -> req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = req.user.id;
    const sig = await signaturesRepo.findByUserId(userId);

    if (!sig) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Nenhuma assinatura encontrada para este usuário.'
      });
    }

    res.status(200).json({
      id: sig.id,
      userId: sig.user_id,
      filename: sig.signature_file,
      originalName: sig.original_filename,
      createdAt: sig.created_at,
      updatedAt: sig.updated_at
    });

  } catch (error) {
    console.error('❌ Erro ao buscar informações da assinatura:', error);
    res.status(500).json({
      error: 'database_error',
      message: 'Erro interno do servidor.'
    });
  }
});

/**
 * Deletar assinatura do usuário atual
 * DELETE /api/signatures/me
 */
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    console.log('🗑️ DELETE my signature -> req.user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const userId = req.user.id;
    const deletedSig = await signaturesRepo.deleteByUserId(userId);

    if (!deletedSig) {
      return res.status(404).json({
        error: 'signature_not_found',
        message: 'Nenhuma assinatura encontrada para este usuário.'
      });
    }

    // Tentar remover arquivo físico
    try {
      const filePath = path.join(UPLOAD_DIR, deletedSig.signature_file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('✅ Arquivo físico removido:', filePath);
      }
    } catch (fileError) {
      console.warn('⚠️ Erro ao remover arquivo físico:', fileError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Assinatura removida com sucesso.'
    });

  } catch (error) {
    console.error('❌ Erro ao deletar assinatura:', error);
    res.status(500).json({
      error: 'delete_error',
      message: 'Erro interno do servidor.'
    });
  }
});

module.exports = router;

