/**
 * Configuração de upload para o sistema de assinaturas
 * Padroniza caminhos e estrutura de pastas
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Diretório base para uploads
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads');

// Garantir que o diretório base existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('📁 Diretório de uploads criado:', UPLOAD_DIR);
}

/**
 * Storage para assinaturas - organiza por usuário
 */
const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anon';
    const dir = path.join(UPLOAD_DIR, 'signatures', String(userId));
    
    // Criar diretório se não existir
    fs.mkdirSync(dir, { recursive: true });
    console.log('📁 Multer signature destination:', dir);
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Manter extensão original
    const ext = path.extname(file.originalname || '');
    const filename = `signature${ext || '.png'}`;
    console.log('📁 Multer signature filename:', filename);
    cb(null, filename);
  }
});

/**
 * Storage para documentos - mantém estrutura atual
 */
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Multer document destination - Campo:', file.fieldname, 'Originalname:', file.originalname);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📁 Multer document filename:', filename);
    cb(null, filename);
  }
});

/**
 * Filtro para assinaturas - apenas imagens
 */
const signatureFileFilter = (req, file, cb) => {
  console.log('🔍 Multer signature fileFilter:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });
  
  // Aceitar apenas imagens
  const allowedMimes = [
    'image/png',
    'image/jpeg', 
    'image/jpg',
    'image/svg+xml',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    console.log('✅ Assinatura aceita');
    cb(null, true);
  } else {
    console.log('❌ Assinatura rejeitada - tipo não permitido:', file.mimetype);
    cb(new Error('A assinatura deve ser uma imagem (PNG, JPEG, SVG, WEBP). PDF e P7S não são aceitos.'), false);
  }
};

/**
 * Filtro para documentos - PDF e imagens
 */
const documentFileFilter = (req, file, cb) => {
  console.log('🔍 Multer document fileFilter:', {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    originalname: file.originalname
  });
  
  if (file.fieldname === 'document') {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('✅ Documento aceito');
      cb(null, true);
    } else {
      console.log('❌ Documento rejeitado - tipo não permitido:', file.mimetype);
      cb(new Error('Tipo de arquivo não permitido'), false);
    }
  } else if (file.fieldname === 'signature') {
    // Aceitar assinaturas também no filtro de documentos (compatibilidade)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      console.log('✅ Assinatura aceita no filtro de documentos');
      cb(null, true);
    } else {
      console.log('❌ Assinatura rejeitada - tipo não permitido:', file.mimetype);
      cb(new Error('Tipo de arquivo não permitido para assinatura'), false);
    }
  } else {
    console.log('❌ Campo não reconhecido:', file.fieldname);
    cb(new Error('Campo de arquivo não reconhecido'), false);
  }
};

// Configurações do multer
const signatureUpload = multer({
  storage: signatureStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB para assinaturas
  },
  fileFilter: signatureFileFilter
});

const documentUpload = multer({
  storage: documentStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB para documentos
  },
  fileFilter: documentFileFilter
});

/**
 * Gerar storage key relativo ao diretório base
 */
const getStorageKey = (filePath) => {
  const relativePath = path.relative(UPLOAD_DIR, filePath);
  return relativePath.replace(/\\/g, '/'); // Padronizar separadores
};

/**
 * Gerar URL pública para arquivo
 */
const getFileUrl = (storageKey) => {
  return `/uploads/${storageKey}`;
};

module.exports = {
  UPLOAD_DIR,
  signatureUpload,
  documentUpload,
  getStorageKey,
  getFileUrl
};
