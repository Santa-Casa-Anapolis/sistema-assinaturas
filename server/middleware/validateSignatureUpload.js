/**
 * Middleware para validação de upload de assinatura
 * Bloqueia PDF/P7S e permite apenas imagens
 */

const multer = require('multer');
const fileType = require('file-type');
const path = require('path');

// Configuração do multer para assinaturas
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/signatures'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `signature-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const signatureUpload = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Validando arquivo de assinatura:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Tipos permitidos para assinatura
    const allowedMimes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml'
    ];

    // Tipos bloqueados
    const blockedMimes = [
      'application/pdf',
      'application/pkcs7-signature'
    ];

    // Verificar se é um tipo bloqueado
    if (blockedMimes.includes(file.mimetype)) {
      const error = new Error(`Arquivo inválido: ${file.mimetype} detectado. Envie apenas PNG, JPEG, WEBP ou SVG.`);
      error.code = 'INVALID_FILE_TYPE';
      return cb(error, false);
    }

    // Verificar se é um tipo permitido
    if (!allowedMimes.includes(file.mimetype)) {
      const error = new Error(`Tipo de arquivo não suportado: ${file.mimetype}. Envie apenas PNG, JPEG, WEBP ou SVG.`);
      error.code = 'UNSUPPORTED_FILE_TYPE';
      return cb(error, false);
    }

    cb(null, true);
  }
});

/**
 * Middleware de validação robusta usando file-type
 */
const validateSignatureFile = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'no_file',
      message: 'Nenhum arquivo de assinatura foi enviado.'
    });
  }

  try {
    console.log('🔍 Validando tipo real do arquivo...');
    
    // Ler o buffer do arquivo para análise
    const fs = require('fs');
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileTypeResult = await fileType.fromBuffer(fileBuffer);
    
    console.log('📦 Detecção file-type:', {
      detected: fileTypeResult,
      reported: req.file.mimetype,
      originalname: req.file.originalname,
      size: req.file.size
    });
    
    // Determinar o MIME type correto
    const actualMime = fileTypeResult?.mime || req.file.mimetype;
    
    // Tipos permitidos para assinatura visual
    const allowedMimes = [
      'image/png',
      'image/jpeg', 
      'image/webp',
      'image/svg+xml'
    ];
    
    // Verificar se é um tipo permitido
    if (!allowedMimes.includes(actualMime)) {
      console.error('❌ Tipo de arquivo não permitido:', {
        actualMime,
        reportedMime: req.file.mimetype,
        detectedExt: fileTypeResult?.ext,
        originalname: req.file.originalname,
        size: req.file.size
      });
      
      // Remover arquivo temporário
      fs.unlinkSync(req.file.path);
      
      return res.status(415).json({
        error: 'unsupported_media_type',
        message: 'Arquivo inválido. Envie apenas PNG, JPEG, WEBP ou SVG (não PDF ou .p7s).',
        detected: {
          mime: actualMime,
          ext: fileTypeResult?.ext,
          originalMime: req.file.mimetype
        }
      });
    }

    console.log('✅ Arquivo de assinatura válido:', actualMime);
    next();

  } catch (error) {
    console.error('❌ Erro na validação do arquivo:', error);
    
    // Remover arquivo temporário em caso de erro
    try {
      const fs = require('fs');
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('Erro ao limpar arquivo temporário:', cleanupError);
    }
    
    return res.status(500).json({
      error: 'validation_error',
      message: 'Erro ao validar arquivo de assinatura.'
    });
  }
};

module.exports = {
  signatureUpload,
  validateSignatureFile
};
