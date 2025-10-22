const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pool, initDatabase } = require('./database');
const { authenticateLDAP } = require('./ldap-auth');
const fileType = require('file-type');
const signatureRoutes = require('./routes/signatures');
require('dotenv').config();

// ==================== MAPEAMENTO DE GRUPOS AD ====================

/**
 * Mapeia grupos AD para roles do sistema
 */
function getUserRoleFromGroups(groups) {
  const groupNames = groups.map(g => g.toLowerCase());
  
  // Grupos de TI - Administradores
  if (groupNames.some(g => g.includes('sc_st_ti') || g.includes('domain admins') || g.includes('administrators'))) {
    return 'admin';
  }
  
  // Outros grupos específicos podem ter roles diferentes
  if (groupNames.some(g => g.includes('sc_gerencia') || g.includes('sc_diretoria'))) {
    return 'manager';
  }
  
  // Padrão para usuários comuns
  return 'user';
}

/**
 * Mapeia grupos AD para setores do sistema
 */
function getUserSectorFromGroups(groups) {
  const groupNames = groups.map(g => g.toLowerCase());
  
  // Mapeamento específico de grupos para setores
  if (groupNames.some(g => g.includes('sc_st_ti'))) {
    return 'TECNOLOGIA DA INFORMAÇÃO';
  }
  
  if (groupNames.some(g => g.includes('sc_rh') || g.includes('recursos humanos'))) {
    return 'RECURSOS HUMANOS';
  }
  
  if (groupNames.some(g => g.includes('sc_financeiro') || g.includes('financeiro'))) {
    return 'FINANCEIRO';
  }
  
  if (groupNames.some(g => g.includes('sc_gerencia') || g.includes('gerencia'))) {
    return 'GERÊNCIA';
  }
  
  if (groupNames.some(g => g.includes('sc_diretoria') || g.includes('diretoria'))) {
    return 'DIRETORIA';
  }
  
  // Padrão
  return 'GERAL';
}

/**
 * Mapeia grupos AD para permissões de admin
 */
function getUserAdminFromGroups(groups) {
  const groupNames = groups.map(g => g.toLowerCase());
  
  // Grupos que recebem permissões de admin
  const adminGroups = [
    'sc_st_ti',
    'domain admins', 
    'administrators',
    'sc_gerencia',
    'sc_diretoria'
  ];
  
  return adminGroups.some(adminGroup => 
    groupNames.some(groupName => groupName.includes(adminGroup))
  );
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de segurança
app.use(helmet());

// Configuração CORS mais específica
app.use(cors({
  origin: ['http://localhost:3000', 'http://172.16.0.219:3000', 'http://172.16.0.219'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());
app.use(express.static('uploads'));

// Configurar trust proxy para rate limiting
app.set('trust proxy', 1);

// Configuração do multer para upload de documentos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('📁 Multer destination - Campo:', file.fieldname, 'Originalname:', file.originalname);
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log('📁 Multer filename - Campo:', file.fieldname, 'Filename gerado:', filename);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Multer fileFilter - Campo:', file.fieldname, 'Mimetype:', file.mimetype, 'Originalname:', file.originalname);
    
    // Permitir apenas imagens para assinaturas
    if (file.fieldname === 'signature') {
      if (file.mimetype.startsWith('image/')) {
        console.log('✅ Assinatura aceita');
        cb(null, true);
      } else {
        console.log('❌ Assinatura rejeitada - não é imagem');
        cb(new Error('Apenas arquivos de imagem são permitidos para assinaturas'), false);
      }
    } else if (file.fieldname === 'document') {
      // Para documentos, permitir PDF e imagens
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedTypes.includes(file.mimetype)) {
        console.log('✅ Documento aceito');
        cb(null, true);
      } else {
        console.log('❌ Documento rejeitado - tipo não permitido:', file.mimetype);
        cb(new Error('Tipo de arquivo não permitido'), false);
      }
    } else if (file.fieldname === 'signedPdf') {
      // Para PDFs assinados, permitir apenas PDF
      if (file.mimetype === 'application/pdf') {
        console.log('✅ PDF assinado aceito');
        cb(null, true);
      } else {
        console.log('❌ PDF assinado rejeitado - não é PDF:', file.mimetype);
        cb(new Error('Apenas arquivos PDF são permitidos para PDFs assinados'), false);
      }
    } else {
      console.log('❌ Campo não reconhecido:', file.fieldname);
      cb(new Error('Campo de arquivo não reconhecido'), false);
    }
  }
});

// Configurar multer para aceitar campos adicionais
const uploadWithFields = multer({ 
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 Multer fileFilter - Campo:', file.fieldname, 'Mimetype:', file.mimetype, 'Originalname:', file.originalname);
    
    // Permitir apenas imagens para assinaturas
    if (file.fieldname === 'signature') {
      if (file.mimetype.startsWith('image/')) {
        console.log('✅ Assinatura aceita');
        cb(null, true);
      } else {
        console.log('❌ Assinatura rejeitada - não é imagem');
        cb(new Error('Apenas arquivos de imagem são permitidos para assinaturas'), false);
      }
    } else if (file.fieldname === 'document') {
      // Para documentos, permitir PDF e imagens
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedTypes.includes(file.mimetype)) {
        console.log('✅ Documento aceito');
        cb(null, true);
      } else {
        console.log('❌ Documento rejeitado - tipo não permitido:', file.mimetype);
        cb(new Error('Tipo de arquivo não permitido'), false);
      }
    } else if (file.fieldname === 'signedPdf') {
      // Para PDFs assinados, permitir apenas PDF
      if (file.mimetype === 'application/pdf') {
        console.log('✅ PDF assinado aceito');
        cb(null, true);
      } else {
        console.log('❌ PDF assinado rejeitado - não é PDF:', file.mimetype);
        cb(new Error('Apenas arquivos PDF são permitidos para PDFs assinados'), false);
      }
    } else {
      console.log('❌ Campo não reconhecido:', file.fieldname);
      cb(new Error('Campo de arquivo não reconhecido'), false);
    }
  }
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests por IP
});
app.use(limiter);

// Middleware de autenticação JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth middleware - Header:', authHeader);
  console.log('🔐 Auth middleware - Token:', token ? 'presente' : 'ausente');

  if (!token) {
    console.log('❌ Token ausente');
    return res.status(401).json({ error: 'Token de acesso requerido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      console.log('❌ Token inválido:', err.message);
      return res.status(403).json({ error: 'Token inválido' });
    }
    console.log('✅ Token válido para usuário:', user.username);
    req.user = user;
    next();
  });
};

// Inicialização do banco PostgreSQL
async function startServer() {
  try {
    console.log('🔧 === INICIANDO SERVIDOR ===');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🌐 Porta configurada:', PORT);
    console.log('🔧 Modo de autenticação:', process.env.AUTH_MODE || 'ad');
    console.log('📊 Configurações LDAP:', {
      url: process.env.LDAP_URL || 'ldap://santacasa.org:389',
      baseDN: process.env.LDAP_BASE_DN || 'DC=santacasa,DC=org',
      bindDN: process.env.LDAP_BIND_DN || 'CN=glpi,OU=USUARIOS,OU=SERVIDORES,DC=santacasa,DC=org'
    });
    
    console.log('📡 Conectando ao banco de dados...');
    await initDatabase();
    console.log('✅ Banco de dados inicializado com sucesso');
    
    console.log('🚀 Iniciando servidor HTTP...');
    const server = app.listen(PORT, () => {
      console.log('✅ Servidor HTTP iniciado com sucesso!');
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Frontend: http://localhost:3000`);
      console.log(`🔧 Backend: http://localhost:${PORT}`);
      console.log('🔧 === SERVIDOR PRONTO ===');
    });

    // Adicionar tratamento de erros do servidor
    server.on('error', (error) => {
      console.error('❌ Erro no servidor HTTP:', error);
      if (error.code === 'EADDRINUSE') {
        console.error('❌ Porta já está em uso. Tente parar outros serviços na porta', PORT);
      }
    });

    // Adicionar tratamento de conexões
    server.on('connection', (socket) => {
      console.log('🔌 Nova conexão:', socket.remoteAddress, ':', socket.remotePort);
    });

  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    console.error('❌ Stack trace:', error.stack);
    process.exit(1);
  }
}

// Configuração do upload

// Configuração do email (DESABILITADO - Modo sem email)
// const transporter = nodemailer.createTransporter({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER || 'seu-email@gmail.com',
//     pass: process.env.EMAIL_PASS || 'sua-senha-app'
//   }
// });


// Log de auditoria
async function logAudit(userId, action, documentId, details, ipAddress) {
  try {
    // Verificar se a coluna document_id existe
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log' AND column_name = 'document_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      // Coluna document_id existe, usar query completa
      await pool.query(
        `INSERT INTO audit_log (user_id, action, document_id, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, documentId, details, ipAddress]
      );
    } else {
      // Coluna document_id não existe, usar query sem ela
      await pool.query(
        `INSERT INTO audit_log (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
        [userId, action, details, ipAddress]
      );
    }
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

// Rotas de autenticação

// Rota para verificar se o token é válido
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    // Se chegou até aqui, o token é válido
    res.json({ 
      valid: true, 
      user: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Erro na verificação do token:', error);
    res.status(401).json({ valid: false, error: 'Token inválido' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('🔐 === TENTATIVA DE LOGIN ===');
    console.log('👤 Username:', username);
    console.log('🔑 Password presente:', password ? 'Sim' : 'Não');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('🔧 Auth Mode:', process.env.AUTH_MODE || 'local');
    
    const authMode = process.env.AUTH_MODE || 'local'; // Padrão para local

    console.log('🔍 === INÍCIO DO LOGIN ===');
    console.log('📝 Dados recebidos:', { username, passwordLength: password ? password.length : 'null', authMode });
    console.log('🌐 IP do cliente:', req.ip);
    console.log('📅 Timestamp:', new Date().toISOString());

    if (!username || !password) {
      console.log('❌ Dados incompletos fornecidos');
      return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    let user = null;

    // Primeiro, verificar o modo de autenticação do usuário no banco
    const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    let userAuthMode = 'ad'; // Padrão para AD
    
    if (userCheck.rows.length === 0) {
      console.log('🔍 Usuário não encontrado no banco, tentando autenticação AD...');
      console.log('🔧 Modo de autenticação: Active Directory (criação automática)');
    } else {
      userAuthMode = userCheck.rows[0].auth_mode || 'ad';
    }
    console.log(`🔍 Modo de autenticação do usuário: ${userAuthMode}`);
    
    if (userAuthMode === 'local') {
      // Autenticação local (usuários de teste)
      console.log(`🔐 Autenticação local para: ${username}`);
      
      user = userCheck.rows[0];
      
      // Verificar senha local
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        console.log('❌ Senha incorreta para usuário local');
        return res.status(401).json({ error: 'Senha incorreta' });
      }
      
      console.log('✅ Usuário de teste autenticado com sucesso:', user.name);
      
    } else if (userAuthMode === 'ad') {
      // Autenticação via Active Directory
      try {
        console.log(`🔐 Tentando autenticação LDAP para: ${username}`);
        console.log('🔧 Modo de autenticação: Active Directory');
        
        // Autenticar no AD
        const adUser = await authenticateLDAP(username, password);
        console.log('✅ Usuário autenticado no AD:', adUser.displayName);
        console.log('📊 Dados do AD recebidos:', {
          username: adUser.username,
          dn: adUser.dn,
          displayName: adUser.displayName,
          email: adUser.email,
          department: adUser.department,
          groups: adUser.groups || []
        });
        
        if (userCheck.rows.length === 0) {
          // Usuário não existe - criar automaticamente baseado nos grupos AD
          console.log('🆕 Criando usuário automaticamente baseado nos grupos AD...');
          
          // Mapear grupos AD para setores e permissões
          const userRole = getUserRoleFromGroups(adUser.groups || []);
          const userSector = getUserSectorFromGroups(adUser.groups || []);
          const isAdmin = getUserAdminFromGroups(adUser.groups || []);
          
          console.log('🎯 Configurações do usuário:', {
            role: userRole,
            sector: userSector,
            isAdmin: isAdmin
          });
          
          // Inserir novo usuário no banco
          const newUser = await pool.query(`
            INSERT INTO users (name, email, username, role, password, sector, auth_mode, is_admin)
            VALUES ($1, $2, $3, $4, '', $5, 'ad', $6)
            RETURNING *
          `, [
            adUser.displayName || adUser.username,
            adUser.email || `${username}@santacasa.org`,
            username,
            userRole,
            userSector,
            isAdmin ? 1 : 0
          ]);
          
          user = newUser.rows[0];
          console.log('✅ Novo usuário criado automaticamente:', user.name);
          
        } else {
          // Usuário já existe - atualizar informações do AD
          await pool.query(`
            UPDATE users 
            SET name = $1, email = $2, department = $3, title = $4
            WHERE username = $5
          `, [
            adUser.displayName || adUser.username,
            adUser.email || '',
            adUser.department || '',
            adUser.title || '',
            username
          ]);
          
          user = { 
            ...userCheck.rows[0], 
            name: adUser.displayName || adUser.username,
            email: adUser.email || userCheck.rows[0].email
          };
          
          console.log('✅ Usuário AD atualizado:', user.name);
        }
        
      } catch (adError) {
        console.error('❌ Erro na autenticação AD:', adError.message);
        console.error('❌ Stack trace do erro AD:', adError.stack);
        console.error('❌ Tipo do erro:', typeof adError);
        console.error('❌ Propriedades do erro:', Object.keys(adError));
        
        // Tratamento específico de erros LDAP
        if (adError.message.includes('Usuário não encontrado')) {
          console.log('🔍 Erro: Usuário não encontrado no AD');
          return res.status(401).json({ error: 'Usuário não encontrado no Active Directory' });
        } else if (adError.message.includes('Senha inválida') || adError.message.includes('credenciais incorretas')) {
          console.log('🔍 Erro: Senha incorreta');
          return res.status(401).json({ error: 'Senha incorreta' });
        } else if (adError.message.includes('conexão') || adError.message.includes('timeout')) {
          console.log('🔍 Erro: Problema de conexão');
          return res.status(503).json({ error: 'Serviço de autenticação temporariamente indisponível' });
        } else {
          console.log('🔍 Erro: Falha geral na autenticação AD');
          return res.status(401).json({ error: 'Falha na autenticação com o Active Directory' });
        }
      }
    }

    // Gerar token JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '24h' }
    );

    // Log de auditoria
    await logAudit(user.id, 'LOGIN', null, `Login realizado com sucesso (${authMode})`, req.ip);

    console.log('✅ Login bem-sucedido para:', user.name);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        sector: user.sector,
        department: user.department,
        title: user.title,
        is_admin: user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('❌ === ERRO NO LOGIN ===');
    console.error('❌ Timestamp:', new Date().toISOString());
    console.error('❌ URL:', req.url);
    console.error('❌ Método:', req.method);
    console.error('❌ IP:', req.ip);
    console.error('❌ User-Agent:', req.get('User-Agent'));
    console.error('❌ Body recebido:', req.body);
    console.error('❌ Erro:', error.message);
    console.error('❌ Stack trace:', error.stack);
    console.error('❌ =====================');
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter usuários por papel
app.get('/api/users/by-role/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query('SELECT id, name, email, username, role, sector, profile FROM users WHERE role = $1', [role]);
    const users = result.rows;
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de assinatura do usuário
app.post('/api/users/:id/signature', authenticateToken, upload.single('signature'), async (req, res) => {
  try {
    console.log('🔍 Upload de assinatura iniciado');
    console.log('📝 Headers recebidos:', req.headers);
    console.log('📝 Parâmetros recebidos:', req.params);
    console.log('📝 Body recebido:', req.body);
    console.log('📝 File recebido:', req.file ? {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      filename: req.file.filename
    } : 'Nenhum arquivo');
    console.log('📝 User autenticado:', req.user ? { id: req.user.id, role: req.user.role } : 'Usuário não autenticado');

    const userId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Arquivo de assinatura é obrigatório' });
    }

    // ============ VALIDAÇÃO ROBUSTA DE TIPO DE ARQUIVO ============
    try {
      console.log('🔍 Validando tipo de arquivo com file-type...');
      
      // Ler o buffer do arquivo para análise
      const fileBuffer = fs.readFileSync(file.path);
      const fileTypeResult = await fileType.fromBuffer(fileBuffer);
      
      console.log('📦 Detecção file-type:', {
        detected: fileTypeResult,
        reported: file.mimetype,
        originalname: file.originalname,
        size: file.size
      });
      
      // Determinar o MIME type correto
      const actualMime = fileTypeResult?.mime || file.mimetype;
      
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
          reportedMime: file.mimetype,
          detectedExt: fileTypeResult?.ext,
          originalname: file.originalname,
          size: file.size,
          userId
        });
        
        // Remover arquivo temporário
        fs.unlinkSync(file.path);
        
        return res.status(415).json({
          error: 'unsupported_media_type',
          message: 'Envie PNG, JPEG, WEBP ou SVG. PDF/p7s não são aceitos para a assinatura visual.',
          detected: {
            mime: actualMime,
            ext: fileTypeResult?.ext,
            originalMime: file.mimetype
          }
        });
      }
      
      console.log('✅ Tipo de arquivo validado:', actualMime);
      
    } catch (validationError) {
      console.error('❌ Erro na validação de arquivo:', validationError);
      
      // Remover arquivo temporário em caso de erro
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({
        error: 'validation_error',
        message: 'Erro ao validar o arquivo. Verifique se é uma imagem válida.'
      });
    }

    // Verificar se o usuário tem permissão (admin principal ou o próprio usuário)
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin && req.user.id != userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o usuário existe
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já existe assinatura para este usuário
    const existingSignature = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    
    if (existingSignature.rows.length > 0) {
      // Atualizar assinatura existente
      await pool.query(
        'UPDATE user_signatures SET signature_file = $1, original_filename = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [file.filename, file.originalname, userId]
      );
    } else {
      // Criar nova assinatura
      await pool.query(
        'INSERT INTO user_signatures (user_id, signature_file, original_filename) VALUES ($1, $2, $3)',
        [userId, file.filename, file.originalname]
      );
    }

    res.json({ 
      message: 'Assinatura salva com sucesso',
      signatureFile: file.filename,
      originalFilename: file.originalname
    });

  } catch (error) {
    console.error('Erro ao salvar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint específico para atualização de assinatura (usado pelo frontend para reenvio)
app.post('/api/signatures/:id/update', authenticateToken, upload.single('signature'), async (req, res) => {
  try {
    console.log('🔄 Atualização de assinatura iniciada');
    
    const userId = req.params.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'Arquivo de assinatura é obrigatório' });
    }

    // ============ VALIDAÇÃO ROBUSTA DE TIPO DE ARQUIVO ============
    try {
      console.log('🔍 Validando tipo de arquivo para atualização...');
      
      const fileBuffer = fs.readFileSync(file.path);
      const fileTypeResult = await fileType.fromBuffer(fileBuffer);
      
      console.log('📦 Detecção file-type (atualização):', {
        detected: fileTypeResult,
        reported: file.mimetype,
        originalname: file.originalname,
        size: file.size,
        userId
      });
      
      const actualMime = fileTypeResult?.mime || file.mimetype;
      
      const allowedMimes = [
        'image/png',
        'image/jpeg', 
        'image/webp',
        'image/svg+xml'
      ];
      
      if (!allowedMimes.includes(actualMime)) {
        console.error('❌ Tipo de arquivo não permitido (atualização):', {
          actualMime,
          reportedMime: file.mimetype,
          detectedExt: fileTypeResult?.ext,
          originalname: file.originalname,
          size: file.size,
          userId
        });
        
        fs.unlinkSync(file.path);
        
        return res.status(415).json({
          error: 'unsupported_media_type',
          message: 'Envie PNG, JPEG, WEBP ou SVG. PDF/p7s não são aceitos para a assinatura visual.',
          detected: {
            mime: actualMime,
            ext: fileTypeResult?.ext,
            originalMime: file.mimetype
          }
        });
      }
      
      console.log('✅ Tipo de arquivo validado para atualização:', actualMime);
      
    } catch (validationError) {
      console.error('❌ Erro na validação de arquivo (atualização):', validationError);
      
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      return res.status(400).json({
        error: 'validation_error',
        message: 'Erro ao validar o arquivo. Verifique se é uma imagem válida.'
      });
    }

    // Verificar se o usuário tem permissão
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin && req.user.id != userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se o usuário existe
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Remover assinatura anterior se existir
    const existingSignature = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    if (existingSignature.rows.length > 0) {
      const oldFilePath = path.join(__dirname, 'uploads', existingSignature.rows[0].signature_file);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    // Atualizar ou criar nova assinatura
    if (existingSignature.rows.length > 0) {
      await pool.query(
        'UPDATE user_signatures SET signature_file = $1, original_filename = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $3',
        [file.filename, file.originalname, userId]
      );
    } else {
      await pool.query(
        'INSERT INTO user_signatures (user_id, signature_file, original_filename) VALUES ($1, $2, $3)',
        [userId, file.filename, file.originalname]
      );
    }

    res.json({ 
      message: 'Assinatura atualizada com sucesso',
      signatureFile: file.filename,
      originalFilename: file.originalname,
      success: true
    });

  } catch (error) {
    console.error('Erro ao atualizar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter assinatura do usuário
app.get('/api/users/:id/signature', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar se o usuário tem permissão (admin principal ou o próprio usuário)
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin && req.user.id != userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const signature = result.rows[0];
    res.json({
      id: signature.id,
      userId: signature.user_id,
      signatureFile: signature.signature_file || signature.original_filename,
      originalFilename: signature.original_filename,
      createdAt: signature.created_at,
      updatedAt: signature.updated_at
    });

  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar assinatura do usuário
app.delete('/api/users/:id/signature', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar se o usuário tem permissão (admin principal ou o próprio usuário)
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin && req.user.id != userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se a assinatura existe
    const signatureResult = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    if (signatureResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const signature = signatureResult.rows[0];
    
    // Remover arquivo físico
    const filePath = path.join(__dirname, 'uploads', signature.signature_file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remover do banco de dados
    await pool.query('DELETE FROM user_signatures WHERE user_id = $1', [userId]);

    res.json({ message: 'Assinatura removida com sucesso' });

  } catch (error) {
    console.error('Erro ao remover assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Servir arquivo de assinatura do usuário
app.get('/api/users/:id/signature/file', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar se o usuário tem permissão (admin principal ou o próprio usuário)
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin && req.user.id != userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assinatura não encontrada' });
    }

    const signature = result.rows[0];
    let filename = signature.signature_file || signature.original_filename;
    let filePath = path.join(__dirname, 'uploads', filename);
    
    // Se arquivo não existe, tentar buscar por padrão
    if (!fs.existsSync(filePath)) {
      console.log('🔍 Arquivo de assinatura não encontrado, buscando alternativo...');
      const uploadsDir = path.join(__dirname, 'uploads');
      
      if (fs.existsSync(uploadsDir)) {
        const allFiles = fs.readdirSync(uploadsDir);
        console.log('📁 Arquivos na pasta uploads:', allFiles);
        
        // Buscar arquivo que contenha informações do usuário ou assinatura
        const alternativeFile = allFiles.find(file => {
          const fileLower = file.toLowerCase();
          const userId = req.params.id;
          
          return fileLower.includes('signature') ||
                 fileLower.includes('assinatura') ||
                 fileLower.includes(userId.toString()) ||
                 fileLower.includes('user') ||
                 fileLower.includes('sign');
        });
        
        if (alternativeFile) {
          filename = alternativeFile;
          filePath = path.join(uploadsDir, alternativeFile);
          console.log('✅ Arquivo de assinatura alternativo encontrado:', filename);
        }
      }
    }
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Arquivo de assinatura não encontrado:', filePath);
      return res.status(404).json({ error: 'Arquivo de assinatura não encontrado' });
    }

    // Enviar arquivo
    res.sendFile(filePath);

  } catch (error) {
    console.error('Erro ao servir arquivo de assinatura:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para excluir documento
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    console.log(`🗑️ Tentativa de exclusão do documento ${documentId} pelo usuário ${req.user.username}`);
    
    // Buscar documento
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }
    
    const document = docResult.rows[0];
    
    // Verificar permissões
    const canDelete = (
      document.created_by === userId || // Criador do documento
      userRole === 'admin' || // Admin pode excluir qualquer documento
      ['contabilidade', 'financeiro', 'diretoria'].includes(userRole) // Roles com permissão
    );
    
    if (!canDelete) {
      console.log(`❌ Usuário ${req.user.username} não tem permissão para excluir documento ${documentId}`);
      return res.status(403).json({ error: 'Acesso negado. Você só pode excluir seus próprios documentos.' });
    }
    
    // Excluir arquivo físico se existir
    if (document.file_path && fs.existsSync(document.file_path)) {
      try {
        fs.unlinkSync(document.file_path);
        console.log(`✅ Arquivo físico excluído: ${document.file_path}`);
      } catch (fileError) {
        console.error('⚠️ Erro ao excluir arquivo físico:', fileError);
        // Continua mesmo se não conseguir excluir o arquivo
      }
    }
    
    // Excluir arquivo assinado se existir
    if (document.signed_file_path && fs.existsSync(document.signed_file_path)) {
      try {
        fs.unlinkSync(document.signed_file_path);
        console.log(`✅ Arquivo assinado excluído: ${document.signed_file_path}`);
      } catch (fileError) {
        console.error('⚠️ Erro ao excluir arquivo assinado:', fileError);
        // Continua mesmo se não conseguir excluir o arquivo
      }
    }
    
    // Excluir do banco de dados
    await pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
    
    // Registrar na auditoria (comentado temporariamente para debug)
    try {
      await logAudit(userId, 'DOCUMENT_DELETED', documentId, `Documento excluído: ${document.title}`, req.ip);
    } catch (auditError) {
      console.error('⚠️ Erro na auditoria (continuando):', auditError);
    }
    
    console.log(`✅ Documento ${documentId} excluído com sucesso por ${req.user.username}`);
    
    res.json({ 
      message: 'Documento excluído com sucesso',
      documentId: documentId
    });
    
  } catch (error) {
    console.error('Erro ao excluir documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de documento
app.post('/api/documents/upload', authenticateToken, uploadWithFields.fields([
  { name: 'document', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('🔍 === ROTA /api/documents/upload CHAMADA ===');
    console.log('📝 Debug REQ.BODY:', req.body);
    console.log('📝 Debug REQ.FILES:', req.files);
    console.log('📝 Debug REQ.USER:', req.user);
    
    const { title, signers } = req.body;
    const file = req.files?.document?.[0] || req.files?.signature?.[0];

    console.log('📁 Debug ROTA UPLOAD - Dados do arquivo:', {
      filename: file?.filename,
      originalname: file?.originalname,
      path: file?.path,
      size: file?.size,
      fieldname: file?.fieldname
    });

    if (!file) {
      console.log('❌ Nenhum arquivo encontrado em req.files:', req.files);
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Verificar se o filename está definido
    if (!file.filename) {
      console.log('❌ Filename não definido, usando originalname:', file.originalname);
      file.filename = file.originalname;
    }

    // Debug: Verificar dados antes de inserir
    console.log('📝 Debug ANTES INSERT - Dados a serem salvos:', {
      title: title,
      file_path: file.filename,
      original_filename: file.originalname,
      created_by: req.user.id
    });

    // Inserir documento
    const result = await pool.query(
      `INSERT INTO documents (title, file_path, original_filename, created_by, sector, amount, description) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [title, file.filename, file.originalname, req.user.id, req.body.sector || req.user.sector, req.body.amount || null, req.body.description || null]
    );

    console.log('✅ Documento inserido com sucesso! ID:', result.rows[0].id);

    const documentId = result.rows[0].id;

    // Criar fluxo de assinaturas baseado nos perfis (apenas se signers estiver presente)
    console.log('📝 Debug SIGNERS - Raw signers:', signers);
    
    let signersArray = [];
    if (signers && signers.trim() !== '') {
      try {
        signersArray = JSON.parse(signers);
        console.log('📝 Debug SIGNERS - Parsed signers:', signersArray);
        
        const profileOrder = ['supervisor', 'contabilidade', 'financeiro', 'diretoria'];
        
        // Ordenar signatários por perfil
        const orderedSigners = signersArray.sort((a, b) => {
          const aIndex = profileOrder.indexOf(a.profile);
          const bIndex = profileOrder.indexOf(b.profile);
          return aIndex - bIndex;
        });

        for (const [index, signer] of orderedSigners.entries()) {
          await pool.query(
            `INSERT INTO signature_flow (document_id, user_id, order_index) VALUES ($1, $2, $3)`,
            [documentId, signer.id, index + 1]
          );
        }

        // Enviar notificação para o primeiro signatário (ordenado por perfil)
        if (orderedSigners.length > 0) {
          const firstSigner = orderedSigners[0];
          const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [firstSigner.id]);
          const user = userResult.rows[0];
          if (user) {
            sendNotificationEmail(user.email, title, documentId);
          }
        }
      } catch (parseError) {
        console.error('❌ Erro ao fazer parse dos signers:', parseError);
        console.log('📝 Debug SIGNERS - Raw signers que causou erro:', signers);
        return res.status(400).json({ error: 'Formato inválido dos signatários' });
      }
    } else {
      console.log('📝 Debug SIGNERS - Nenhum signer enviado, pulando criação do fluxo de assinaturas');
    }

    await logAudit(req.user.id, 'DOCUMENT_UPLOAD', documentId, `Documento "${title}" enviado`, req.ip);

    res.json({
      message: 'Documento enviado com sucesso',
      documentId,
      filename: file.filename
    });
  } catch (error) {
    console.error('❌ Erro no upload:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter documentos pendentes para assinatura
app.get('/api/documents/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, sf.order_index, sf.status as signature_status,
             u.name as supplier_name
      FROM documents d
      JOIN signature_flow sf ON d.id = sf.document_id
      JOIN users u ON d.created_by = u.id
      WHERE sf.user_id = $1 AND sf.status = 'pending'
      ORDER BY sf.order_index ASC
    `, [req.user.id]);
    const documents = result.rows;
    
    res.json(documents);
  } catch (error) {
    console.error('Erro ao buscar documentos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter documentos criados pelo usuário
app.get('/api/documents/my-documents', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, 
             COUNT(sf.id) as total_signers,
             COUNT(CASE WHEN sf.status = 'signed' THEN 1 END) as signed_count,
             u.name as supplier_name
      FROM documents d
      LEFT JOIN signature_flow sf ON d.id = sf.document_id
      JOIN users u ON d.created_by = u.id
      WHERE d.created_by = $1
      GROUP BY d.id, u.name
      ORDER BY d.created_at DESC
    `, [req.user.id]);
    const documents = result.rows;
    
    res.json(documents);
  } catch (error) {
    console.error('Erro ao buscar meus documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Assinar documento (simulação da integração GOV.BR)
app.post('/api/documents/:id/sign', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { govSignature } = req.body;

    // Verificar se é a vez do usuário assinar
    const signatureFlowResult = await pool.query(`
      SELECT sf.*, d.title, u.name as supplier_name
      FROM signature_flow sf
      JOIN documents d ON sf.document_id = d.id
      JOIN users u ON d.created_by = u.id
      WHERE sf.document_id = $1 AND sf.user_id = $2 AND sf.status = 'pending'
      ORDER BY sf.order_index ASC
      LIMIT 1
    `, [id, req.user.id]);
    const signatureFlow = signatureFlowResult.rows[0];

    if (!signatureFlow) {
      return res.status(400).json({ error: 'Documento não encontrado ou não autorizado para assinatura' });
    }

    // Simular assinatura GOV.BR
    const signatureData = {
      govSignature: govSignature || 'assinatura-gov-simulada',
      timestamp: new Date().toISOString(),
      user: req.user.id,
      ip: req.ip
    };

    // Atualizar status da assinatura
    await pool.query(
      `UPDATE signature_flow SET status = 'signed', signed_at = $1, signature_data = $2, ip_address = $3 WHERE id = $4`,
      [new Date().toISOString(), JSON.stringify(signatureData), req.ip, signatureFlow.id]
    );

    // Verificar se há próximo signatário
    const nextSignerResult = await pool.query(`
      SELECT sf.*, u.email, u.name
      FROM signature_flow sf
      JOIN users u ON sf.user_id = u.id
      WHERE sf.document_id = $1 AND sf.status = 'pending'
      ORDER BY sf.order_index ASC
      LIMIT 1
    `, [id]);
    const nextSigner = nextSignerResult.rows[0];

    if (nextSigner) {
      // Enviar notificação para próximo signatário
      sendNotificationEmail(nextSigner.email, signatureFlow.title, id);
    } else {
      // Documento completamente assinado
      await pool.query(`UPDATE documents SET status = 'completed' WHERE id = $1`, [id]);
      
      // Mover arquivo para pasta de recebidos
      await moveCompletedDocument(id);
    }

    await logAudit(req.user.id, 'DOCUMENT_SIGNED', id, `Documento "${signatureFlow.title}" assinado`, req.ip);

    res.json({ message: 'Documento assinado com sucesso' });
  } catch (error) {
    console.error('Erro ao assinar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar informações de um documento específico
app.get('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT d.*, u.name as supplier_name
      FROM documents d
      JOIN users u ON d.created_by = u.id
      WHERE d.id = $1
    `, [id]);
    const document = result.rows[0];
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    // Buscar arquivos do documento
    const filesResult = await pool.query(`
      SELECT id, original_filename, filename, file_size, mime_type, created_at
      FROM document_files
      WHERE document_id = $1
      ORDER BY created_at ASC
    `, [id]);

    document.files = filesResult.rows;
    
    res.json(document);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download do documento (primeiro arquivo)
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT df.*, d.title FROM document_files df
      JOIN documents d ON df.document_id = d.id
      WHERE df.document_id = $1
      ORDER BY df.created_at ASC
      LIMIT 1
    `, [id]);
    const file = result.rows[0];
    
    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const filePath = path.join(__dirname, 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no sistema de arquivos' });
    }

    await logAudit(req.user.id, 'DOCUMENT_DOWNLOAD', id, `Download do documento "${file.title}"`, req.ip);

    res.download(filePath, file.original_filename);
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download de arquivo específico
app.get('/api/documents/:id/files/:fileId/download', authenticateToken, async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const result = await pool.query(`
      SELECT df.*, d.title FROM document_files df
      JOIN documents d ON df.document_id = d.id
      WHERE df.document_id = $1 AND df.id = $2
    `, [id, fileId]);
    const file = result.rows[0];
    
    if (!file) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const filePath = path.join(__dirname, 'uploads', file.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado no sistema de arquivos' });
    }

    await logAudit(req.user.id, 'FILE_DOWNLOAD', id, `Download do arquivo "${file.original_filename}" do documento "${file.title}"`, req.ip);

    res.download(filePath, file.original_filename);
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Visualização do documento (abre no navegador)
app.get('/api/documents/:id/view', async (req, res) => {
  console.log('🔍 === VISUALIZAÇÃO DE DOCUMENTO ===');
  console.log('📅 Timestamp:', new Date().toISOString());
  console.log('🆔 Document ID:', req.params.id);
  
  // Verificar autenticação via query parameter ou header
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  console.log('🔑 Token presente:', token ? 'Sim' : 'Não');
  
  if (!token) {
    console.log('❌ Token ausente');
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    console.log('✅ Token válido para usuário:', decoded.username);
    
    const { id } = req.params;
    console.log('🔍 Buscando documento ID:', id);

    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    const document = result.rows[0];
    console.log('📄 Documento encontrado:', document ? 'Sim' : 'Não');
    
    if (!document) {
      console.log('❌ Documento não encontrado no banco');
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    console.log('📁 File path do documento:', document.file_path);
    console.log('📁 Original filename:', document.original_filename);
    
    // Verificar se há arquivo assinado primeiro
    let fileName = null;
    let filePath = null;
    
    // Primeiro, tentar arquivo assinado se existir
    if (document.signed_filename && fs.existsSync(path.join(__dirname, 'uploads', document.signed_filename))) {
      fileName = document.signed_filename;
      console.log('📁 Usando arquivo assinado:', fileName);
    }
    // Se não há arquivo assinado, usar o file_path
    else if (document.file_path && fs.existsSync(path.join(__dirname, 'uploads', document.file_path))) {
      fileName = document.file_path;
      console.log('📁 Usando arquivo original:', fileName);
    }
    // Fallback para original_filename
    else if (document.original_filename && fs.existsSync(path.join(__dirname, 'uploads', document.original_filename))) {
      fileName = document.original_filename;
      console.log('📁 Usando original_filename:', fileName);
    }
    // Buscar arquivo por padrão se nenhum dos anteriores funcionar
    else {
      console.log('🔍 Buscando arquivo por padrão...');
      const uploadsDir = path.join(__dirname, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const allFiles = fs.readdirSync(uploadsDir);
        console.log('📁 Todos os arquivos na pasta uploads:', allFiles);
        
        // Buscar arquivo que contenha o ID do documento ou nome similar
        const documentId = req.params.id;
        const alternativeFile = allFiles.find(file => {
          const fileLower = file.toLowerCase();
          const docTitleLower = document.title?.toLowerCase() || '';
          const docOriginalLower = document.original_filename?.toLowerCase() || '';
          
          return fileLower.includes(documentId.toString()) || 
                 fileLower.includes(docTitleLower.replace(/\s+/g, '')) ||
                 fileLower.includes(docOriginalLower.replace(/\s+/g, '')) ||
                 fileLower.includes('document') ||
                 fileLower.includes('pdf');
        });
        
        if (alternativeFile) {
          fileName = alternativeFile;
          console.log('✅ Arquivo alternativo encontrado:', fileName);
        }
      }
    }
    
    if (!fileName) {
      console.log('❌ Nenhum arquivo válido encontrado');
      return res.status(404).json({ error: 'Arquivo não encontrado no sistema' });
    }
    
    filePath = path.join(__dirname, 'uploads', fileName);
    console.log('📂 Caminho completo do arquivo:', filePath);
    
    // Listar alguns arquivos da pasta uploads para debug
    const uploadsDir = path.join(__dirname, 'uploads');
    const files = fs.readdirSync(uploadsDir);
    console.log('📁 Arquivos na pasta uploads (primeiros 5):', files.slice(0, 5));
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ Arquivo não encontrado no sistema de arquivos');
      
      // Tentar encontrar arquivo por padrão (buscar por ID do documento)
      const uploadsDir = path.join(__dirname, 'uploads');
      const allFiles = fs.readdirSync(uploadsDir);
      console.log('🔍 Buscando arquivo alternativo...');
      
      // Buscar arquivo que contenha o ID do documento
      const documentId = req.params.id;
      const alternativeFile = allFiles.find(file => 
        file.includes(documentId.toString()) || 
        file.includes(document.original_filename?.replace(/\s+/g, '')) ||
        file.includes(document.file_path?.replace(/\s+/g, ''))
      );
      
      if (alternativeFile) {
        console.log('✅ Arquivo alternativo encontrado:', alternativeFile);
        const alternativePath = path.join(uploadsDir, alternativeFile);
        
        // Determinar o tipo de conteúdo do arquivo alternativo
        const ext = path.extname(alternativeFile).toLowerCase();
        let contentType = 'application/octet-stream';
        
        if (ext === '.pdf') {
          contentType = 'application/pdf';
        } else if (ext === '.docx') {
          contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        } else if (ext === '.doc') {
          contentType = 'application/msword';
        } else if (ext === '.jpg' || ext === '.jpeg') {
          contentType = 'image/jpeg';
        } else if (ext === '.png') {
          contentType = 'image/png';
        }

        console.log('📄 Content-Type alternativo:', contentType);

        // Configurar headers para visualização inline
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="${alternativeFile}"`);
        
        console.log('📤 Enviando arquivo alternativo...');
        // Enviar arquivo alternativo
        res.sendFile(alternativePath, (err) => {
          if (err) {
            console.error('❌ Erro ao enviar arquivo alternativo:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Erro ao enviar arquivo' });
            }
          } else {
            console.log('✅ Arquivo alternativo enviado com sucesso');
          }
        });
        return;
      }
      
      console.log('❌ Nenhum arquivo alternativo encontrado');
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    console.log('✅ Arquivo encontrado no sistema de arquivos');

    // Determinar o tipo de conteúdo
    const ext = path.extname(document.original_filename || document.file_path).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.doc') {
      contentType = 'application/msword';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.png') {
      contentType = 'image/png';
    }

    console.log('📄 Extensão do arquivo:', ext);
    console.log('📄 Content-Type:', contentType);

    // Configurar headers para visualização inline
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename || document.file_path}"`);
    
    console.log('📤 Enviando arquivo...');
    // Enviar arquivo
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('❌ Erro ao enviar arquivo:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Erro ao enviar arquivo' });
        }
      } else {
        console.log('✅ Arquivo enviado com sucesso');
      }
    });
  } catch (error) {
    console.error('❌ Erro na visualização do documento:', error);
    console.error('❌ Document ID:', req.params.id);
    console.error('❌ Token:', token ? 'Presente' : 'Ausente');
    console.error('❌ User:', req.user);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Obter histórico de auditoria
app.get('/api/audit/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await pool.query(`
      SELECT al.*, u.name as user_name
      FROM audit_log al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.document_id = $1
      ORDER BY al.created_at DESC
    `, [documentId]);
    const logs = result.rows;
    
    res.json(logs);
  } catch (error) {
    console.error('Erro ao buscar auditoria:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para mover documento concluído para pasta de rede por setor, ano e mês
async function moveCompletedDocument(documentId) {
  try {
    // Buscar informações do documento e do usuário que criou
    const result = await pool.query(`
      SELECT d.*, u.sector 
      FROM documents d 
      JOIN users u ON d.created_by = u.id 
      WHERE d.id = $1
    `, [documentId]);
    const document = result.rows[0];
    
    if (!document) {
      console.error('❌ Documento não encontrado para mover:', documentId);
      return;
    }

    // Usar o setor do usuário que criou o documento
    let sector = document.sector;
    if (!sector) {
      // Se não há setor definido, usar pasta padrão
      sector = 'GERAL';
    }

    // Obter ano e mês atual
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = now.toLocaleString('pt-BR', { month: 'long' }).toUpperCase();

    // Caminho da pasta de rede com estrutura ano/mês
    const networkPath = 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\NOTASFISCAIS';
    const sectorPath = path.join(networkPath, sector);
    const yearPath = path.join(sectorPath, year);
    const monthPath = path.join(yearPath, month);

    // Criar estrutura de pastas se não existir
    const pathsToCreate = [sectorPath, yearPath, monthPath];
    
    for (const pathToCreate of pathsToCreate) {
      if (!fs.existsSync(pathToCreate)) {
        try {
          fs.mkdirSync(pathToCreate, { recursive: true });
          console.log(`✅ Pasta criada: ${pathToCreate}`);
        } catch (mkdirError) {
          console.error('❌ Erro ao criar pasta:', mkdirError);
          // Fallback para pasta local se rede não estiver disponível
          const localPath = path.join(__dirname, 'recebidos', sector, year, month);
          fs.mkdirSync(localPath, { recursive: true });
          console.log(`✅ Pasta local criada como fallback: ${localPath}`);
          break;
        }
      }
    }

    // Caminhos dos arquivos
    const sourcePath = path.join(__dirname, 'uploads', document.filename);
    let destPath;

    try {
      // Tentar usar pasta de rede
      destPath = path.join(monthPath, document.filename);
    } catch (error) {
      // Fallback para pasta local
      const localPath = path.join(__dirname, 'recebidos', sector, year, month);
      destPath = path.join(localPath, document.filename);
    }

    // Verificar se arquivo original existe
    if (!fs.existsSync(sourcePath)) {
      console.error('❌ Arquivo original não encontrado:', sourcePath);
      return;
    }

    // Mover arquivo
    fs.copyFileSync(sourcePath, destPath);
    console.log(`✅ Documento "${document.title}" movido para: ${destPath}`);
    console.log(`📁 Estrutura: ${sector} > ${year} > ${month}`);
    
    // Registrar na auditoria
    await logAudit(null, 'DOCUMENT_COMPLETED', documentId, `Documento movido para ${sector}/${year}/${month}: ${document.title}`, 'system');
    
  } catch (error) {
    console.error('❌ Erro ao mover documento para pasta de rede:', error);
  }
}

// Função para enviar notificação (MODO SEM EMAIL)
function sendNotificationEmail(email, documentTitle, documentId) {
  console.log('📧 NOTIFICAÇÃO SIMULADA:');
  console.log(`   Para: ${email}`);
  console.log(`   Documento: ${documentTitle}`);
  console.log(`   Link: http://localhost:3001/sign/${documentId}`);
  console.log(`   ⚠️  Em modo de desenvolvimento - emails desabilitados`);
  console.log('   ──────────────────────────────────────────────');
}

// Rotas de administração de supervisores
 app.post('/api/admin/supervisors', authenticateToken, async (req, res) => {
   try {
    const { name, username, email, password, sector, profile } = req.body;

    console.log('➕ Criando supervisor:', { name, username, email, sector });

     // Verificar se o usuário é admin principal ou diretoria
     const isAdmin = await isMainAdmin(req.user.id);
     if (!isAdmin && req.user.role !== 'diretoria') {
       return res.status(403).json({ error: 'Acesso negado' });
     }

    // Verificar se o email já existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'E-mail já cadastrado' });
    }

    // Verificar se o username já existe
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Nome de usuário já existe' });
    }

     // Criar usuário supervisor
     const bcrypt = require('bcryptjs');
     const hashedPassword = await bcrypt.hash(password || '123456', 10);

     const result = await pool.query(`
       INSERT INTO users (name, email, username, role, password, sector, profile) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, email, username, role, sector, profile
     `, [name, email, username, 'supervisor', hashedPassword, sector, profile || 'supervisor']);

     console.log('✅ Supervisor criado:', result.rows[0]);

     await logAudit(req.user.id, 'SUPERVISOR_CREATED', null, `Supervisor criado: ${name} (${sector})`, req.ip);

     res.json(result.rows[0]);
   } catch (error) {
     console.error('Erro ao criar supervisor:', error);
     res.status(500).json({ error: 'Erro interno do servidor' });
   }
 });

app.put('/api/admin/supervisors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, sector, profile } = req.body;

    console.log('🔄 Atualizando usuário:', { id, name, username, email, sector, profile });

    // Verificar se o usuário é admin ou tem permissão
    if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await pool.query(`
      UPDATE users SET name = $1, email = $2, username = $3, sector = $4, profile = $5 
      WHERE id = $6 
      RETURNING id, name, email, username, role, sector, profile
    `, [name, email, username, sector, profile, id]);

    console.log('📊 Resultado da atualização:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await logAudit(req.user.id, 'USER_UPDATED', null, `Usuário atualizado: ${name} (${email})`, req.ip);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para resetar senha
app.post('/api/admin/reset-password/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin ou tem permissão
    if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Hash da nova senha (123456)
    const newPassword = await bcrypt.hash('123456', 10);

    const result = await pool.query(`
      UPDATE users SET password = $1 
      WHERE id = $2 
      RETURNING id, name, email, username, role, sector, profile
    `, [newPassword, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    await logAudit(req.user.id, 'PASSWORD_RESET', null, `Senha resetada para: ${result.rows[0].name}`, req.ip);

    res.json({ message: 'Senha resetada com sucesso', user: result.rows[0] });
  } catch (error) {
    console.error('Erro ao resetar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/admin/supervisors/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário é admin ou tem permissão
    if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Primeiro, buscar o usuário para obter o username
    const userResult = await pool.query(`
      SELECT id, name, email, username, sector 
      FROM users 
      WHERE id = $1 AND role = 'supervisor'
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor não encontrado' });
    }

    const user = userResult.rows[0];

    // Registrar na tabela de usuários excluídos
    await pool.query(`
      INSERT INTO deleted_users (username) 
      VALUES ($1) 
      ON CONFLICT (username) DO NOTHING
    `, [user.username]);

    // Excluir o usuário
    const result = await pool.query(`
      DELETE FROM users 
      WHERE id = $1 AND role = 'supervisor' 
      RETURNING id, name, email, username, sector
    `, [id]);

    await logAudit(req.user.id, 'SUPERVISOR_DELETED', null, `Supervisor removido: ${user.name} (${user.username})`, req.ip);

    res.json({ message: 'Supervisor removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover supervisor:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar usuário por ID
app.get('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
         const result = await pool.query('SELECT id, name, email, username, role, sector FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para buscar usuários do AD (apenas admin)
app.get('/api/admin/ad-users', authenticateToken, async (req, res) => {
  try {
    // Verificar se o usuário é admin principal
    const isAdmin = await isMainAdmin(req.user.id);
    if (!isAdmin) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const authMode = process.env.AUTH_MODE || 'local';
    if (authMode !== 'ad') {
      return res.status(400).json({ error: 'Busca AD só disponível quando AUTH_MODE=ad' });
    }

    const { getAllADUsers, connectToAD, disconnectFromAD } = require('./ad-config');
    
    await connectToAD();
    const adUsers = await getAllADUsers();
    await disconnectFromAD();
    
    res.json({
      users: adUsers
    });
  } catch (error) {
    console.error('Erro ao buscar usuários do AD:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE ADMINISTRAÇÃO ====================

// Função auxiliar para verificar se é o admin principal
const isMainAdmin = async (userId) => {
  try {
    const result = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    return result.rows.length > 0 && result.rows[0].username === 'admin@santacasa.org';
  } catch (error) {
    console.error('Erro ao verificar admin principal:', error);
    return false;
  }
};

// Middleware para verificar se é admin (apenas admin@santacasa.org)
const requireAdmin = async (req, res, next) => {
  try {
    console.log('🔍 Verificando admin - User ID:', req.user.id);
    console.log('🔍 Verificando admin - User:', req.user);
    
    const isAdmin = await isMainAdmin(req.user.id);
    console.log('🔍 É admin principal?', isAdmin);
    
    if (!isAdmin) {
      console.log('❌ Acesso negado - não é admin principal');
      return res.status(403).json({ error: 'Acesso negado. Apenas o administrador principal pode gerenciar usuários.' });
    }
    
    console.log('✅ Acesso permitido - é admin principal');
    next();
  } catch (error) {
    console.error('Erro ao verificar permissões de admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Buscar todos os usuários (apenas admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.username, u.role, u.sector, u.profile, u.is_admin, u.created_at
      FROM users u
      ORDER BY u.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo usuário (apenas admin)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, username, role, password, sector, profile, group_name } = req.body;
    
    // Verificar se usuário já existe
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await pool.query(`
      INSERT INTO users (name, email, username, role, password, sector, profile, group_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [name, email, username, role, hashedPassword, sector, profile || 'supervisor', group_name]);
    
    res.json({ 
      message: 'Usuário criado com sucesso',
      userId: result.lastID 
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar usuário (apenas admin)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, email, username, role, sector, group_name } = req.body;
    
    // Verificar se usuário existe
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se email/username já existe em outro usuário
    const duplicateUser = await pool.query('SELECT id FROM users WHERE (email = $1 OR username = $2) AND id != $3', [email, username, userId]);
    if (duplicateUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email ou username já existe em outro usuário' });
    }
    
    // Atualizar usuário
    await pool.query(`
      UPDATE users 
      SET name = $1, email = $2, username = $3, role = $4, sector = $5, group_name = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `, [name, email, username, role, sector, group_name, userId]);
    
    res.json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Excluir usuário (apenas admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Verificar se usuário existe
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Não permitir excluir o próprio usuário admin
    if (req.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    }
    
    // Excluir usuário
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar todos os grupos (apenas admin)
app.get('/api/admin/groups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM access_groups ORDER BY name');
    
    // Parse das permissões JSON
    const groups = result.rows.map(group => ({
      ...group,
      permissions: JSON.parse(group.permissions || '[]')
    }));
    
    res.json(groups);
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo grupo (apenas admin)
app.post('/api/admin/groups', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, permissions } = req.body;
    
    // Verificar se grupo já existe
    const existingGroup = await pool.query('SELECT id FROM access_groups WHERE name = $1', [name]);
    if (existingGroup.rows.length > 0) {
      return res.status(400).json({ error: 'Grupo já existe' });
    }
    
    // Criar grupo
    const result = await pool.query(`
      INSERT INTO access_groups (name, description, permissions)
      VALUES ($1, $2, $3)
    `, [name, description, JSON.stringify(permissions)]);
    
    res.json({ 
      message: 'Grupo criado com sucesso',
      groupId: result.lastID 
    });
  } catch (error) {
    console.error('Erro ao criar grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atribuir usuário a grupo (apenas admin)
app.post('/api/admin/assign-group', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId, groupId } = req.body;
    const assignedBy = req.user.id;
    
    // Remover associações anteriores do usuário
    await pool.query('DELETE FROM user_groups WHERE user_id = $1', [userId]);
    
    // Adicionar nova associação
    await pool.query(`
      INSERT INTO user_groups (user_id, group_id, assigned_by)
      VALUES ($1, $2, $3)
    `, [userId, groupId, assignedBy]);
    
    res.json({ message: 'Usuário atribuído ao grupo com sucesso' });
  } catch (error) {
    console.error('Erro ao atribuir usuário ao grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE DOCUMENTOS ====================

// Buscar documentos pendentes de assinatura
app.get('/api/documents/pending', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userSector = req.user.sector;

    console.log('🔍 Buscando documentos pendentes para:', req.user.username, 'Role:', userRole, 'Setor:', userSector);

    let query = `
      SELECT d.*, u.name as supplier_name, u.sector as document_sector
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.status = 'pending'
    `;
    
    let params = [];

    // Filtrar por permissões do usuário
    if (userRole === 'supervisor') {
      // Supervisores veem documentos que criaram
      query += ' AND d.created_by = $1';
      params.push(userId);
    } else if (['contabilidade', 'financeiro', 'diretoria'].includes(userRole)) {
      // Outros roles podem ver todos os documentos pendentes
      query += ' AND 1=1';
    } else {
      // Outros usuários veem apenas seus próprios documentos
      query += ' AND d.created_by = $1';
      params.push(userId);
    }

    query += ' ORDER BY d.created_at DESC';

    console.log('📊 Query executando:', query);
    console.log('📊 Parâmetros:', params);

    const result = await pool.query(query, params);
    
    console.log(`✅ Encontrados ${result.rows.length} documentos pendentes`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar documentos pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar meus documentos
app.get('/api/documents/my-documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userSector = req.user.sector;

    console.log('🔍 Buscando meus documentos para:', req.user.username, 'Role:', userRole);

    const result = await pool.query(`
      SELECT d.*, 
             u.name as supplier_name,
             COUNT(sf.id) as total_signers,
             COUNT(CASE WHEN sf.status = 'signed' THEN 1 END) as signed_count
      FROM documents d
      LEFT JOIN signature_flow sf ON d.id = sf.document_id
      LEFT JOIN users u ON d.created_by = u.id
      WHERE d.created_by = $1
      GROUP BY d.id, u.name
      ORDER BY d.created_at DESC
    `, [userId]);
    
    console.log(`✅ Encontrados ${result.rows.length} meus documentos`);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar meus documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar documentos do usuário
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userSector = req.user.sector;

    let query = `
      SELECT d.*, u.name as created_by_name
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
    `;
    
    let params = [];

    // Filtrar por permissões do usuário
    if (userRole === 'supervisor') {
      query += ' WHERE d.sector = $1';
      params.push(userSector);
    } else if (['contabilidade', 'financeiro', 'diretoria'].includes(userRole)) {
      // Esses roles podem ver todos os documentos
      query += ' WHERE 1=1';
    } else {
      query += ' WHERE d.created_by = $1';
      params.push(userId);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Importar sistemas de documentos
const documentValidation = require('./document-validation-system');
const documentFlow = require('./document-flow-system');

// Upload temporário de documento (antes da assinatura)
app.post('/api/documents/temp-upload', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const { title, description, amount, sector, signatureMode, govSignature } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um arquivo é obrigatório' });
    }

    // Validar se todos os arquivos são PDFs válidos
    for (const file of files) {
      if (file.mimetype !== 'application/pdf') {
        return res.status(400).json({ 
          error: 'Apenas arquivos PDF são permitidos',
          message: `Arquivo "${file.originalname}" não é um PDF válido.`
        });
      }
      
      // Verificar cabeçalho PDF
      const filePath = file.path;
      const fileBuffer = fs.readFileSync(filePath);
      const header = fileBuffer.slice(0, 4).toString();
      
      if (header !== '%PDF') {
        return res.status(400).json({ 
          error: 'Arquivo PDF inválido',
          message: `Arquivo "${file.originalname}" não possui cabeçalho PDF válido.`
        });
      }
    }

    // Apenas supervisores podem criar documentos
    if (userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas supervisores podem criar documentos' });
    }

    // Validar se o usuário tem assinatura configurada
    const signatureResult = await pool.query('SELECT * FROM user_signatures WHERE user_id = $1', [userId]);
    if (signatureResult.rows.length === 0) {
      return res.status(400).json({ 
        error: 'Assinatura obrigatória', 
        message: 'Você deve configurar sua assinatura antes de enviar documentos. Acesse o perfil para fazer upload da sua assinatura.' 
      });
    }

    // Validar se o modo de assinatura foi selecionado
    if (!signatureMode || signatureMode === 'none') {
      return res.status(400).json({ 
        error: 'Modo de assinatura obrigatório', 
        message: 'Você deve selecionar um modo de assinatura antes de enviar o documento.' 
      });
    }

    // Validar assinatura textual se selecionada
    if (signatureMode === 'text' && (!govSignature || govSignature.trim() === '')) {
      return res.status(400).json({ 
        error: 'Assinatura textual obrigatória', 
        message: 'Você deve fornecer uma assinatura textual quando selecionar este modo.' 
      });
    }

    // Debug: Verificar dados dos arquivos
    console.log('📁 Debug - Dados dos arquivos:', {
      filesCount: files.length,
      firstFile: files[0] ? {
        filename: files[0].filename,
        originalname: files[0].originalname,
        path: files[0].path,
        size: files[0].size
      } : 'Nenhum arquivo'
    });

    // Salvar documentos temporariamente
    const tempIds = [];
    for (const file of files) {
      const tempId = await documentValidation.saveTempDocument(file, {
        title,
        description,
        amount: amount || 0,
        sector: sector || req.user.sector,
        signatureMode,
        govSignature,
        userId,
        userRole,
        originalFilename: file.originalname
      });
      tempIds.push(tempId);
    }

    console.log(`📄 Documentos salvos temporariamente: ${tempIds.join(', ')}`);

    res.json({ 
      message: 'Documentos salvos temporariamente. Complete a assinatura para salvar definitivamente.',
      tempIds: tempIds,
      filesCount: files.length,
      signatureMode: signatureMode,
      requiresSignature: true
    });
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Confirmar assinatura e salvar documento definitivamente
app.post('/api/documents/confirm-signature', authenticateToken, async (req, res) => {
  try {
    const { tempIds, signatureData } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!tempIds || !Array.isArray(tempIds) || tempIds.length === 0) {
      return res.status(400).json({ error: 'IDs temporários são obrigatórios' });
    }

    console.log(`🔐 Confirmando assinatura para documentos temporários: ${tempIds.join(', ')}`);

    // Validar assinatura para cada documento temporário
    const validatedDocs = [];
    for (const tempId of tempIds) {
      const validation = await documentValidation.validateDocumentSignature(tempId, userId);
      if (validation.valid) {
        validatedDocs.push({
          tempId,
          metadata: validation.metadata,
          tempPath: validation.tempPath
        });
      }
    }

    if (validatedDocs.length === 0) {
      return res.status(400).json({ error: 'Nenhum documento temporário válido encontrado' });
    }

    // Salvar documentos definitivamente no banco
    const documentIds = [];
    for (const doc of validatedDocs) {
      const { metadata } = doc;
      
      // Criar nome único para o arquivo final
      const timestamp = Date.now();
      const finalFilename = `doc_${timestamp}_${metadata.originalFilename}`;
      const finalPath = path.join(__dirname, 'uploads', finalFilename);
      
      // Mover arquivo para pasta inicial (pending)
      const pendingPath = path.join(__dirname, 'uploads', 'pending', finalFilename);
      await documentValidation.moveToFinalLocation(doc.tempId, pendingPath);
      
      // Inserir no banco de dados
    const result = await pool.query(`
        INSERT INTO documents (title, description, file_path, original_filename, created_by, supervisor_id, sector, amount, status, current_stage, signature_mode, gov_signature)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'pending', $9, $10)
      RETURNING id
    `, [
        metadata.title,
        metadata.description,
        finalFilename,
        metadata.originalFilename,
      userId,
      userId, // supervisor_id
        metadata.sector,
        metadata.amount,
        metadata.signatureMode,
        metadata.govSignature
    ]);

    const documentId = result.rows[0].id;
      documentIds.push(documentId);
      
      console.log(`✅ Documento ${documentId} salvo definitivamente`);
    }

    // Registrar na auditoria
    await logAudit(userId, 'DOCUMENT_SIGNED', documentIds.join(','), `Documentos assinados e salvos definitivamente`, req.ip);

    res.json({ 
      message: 'Documentos assinados e salvos com sucesso',
      documentIds: documentIds,
      filesCount: validatedDocs.length,
      signatureConfirmed: true
    });

  } catch (error) {
    console.error('❌ Erro ao confirmar assinatura:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Cancelar documentos temporários (limpar se não assinados)
app.post('/api/documents/cancel-temp', authenticateToken, async (req, res) => {
  try {
    const { tempIds } = req.body;
    const userId = req.user.id;

    if (!tempIds || !Array.isArray(tempIds) || tempIds.length === 0) {
      return res.status(400).json({ error: 'IDs temporários são obrigatórios' });
    }

    console.log(`🗑️ Cancelando documentos temporários: ${tempIds.join(', ')}`);

    // Limpar documentos temporários
    for (const tempId of tempIds) {
      await documentValidation.cleanupTempDocument(tempId);
    }

    res.json({ 
      message: 'Documentos temporários cancelados com sucesso',
      tempIds: tempIds
    });

  } catch (error) {
    console.error('❌ Erro ao cancelar documentos temporários:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Aprovar/Reprovar documento
app.post('/api/documents/:id/approve', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;
    const { action, comments, govSignatureId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Buscar documento
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const document = docResult.rows[0];

    // Verificar se o usuário pode aprovar neste estágio
    const canApprove = (
      (document.current_stage === 'contabilidade' && userRole === 'contabilidade') ||
      (document.current_stage === 'financeiro' && userRole === 'financeiro') ||
      (document.current_stage === 'diretoria' && userRole === 'diretoria')
    );

    if (!canApprove) {
      return res.status(403).json({ error: 'Usuário não pode aprovar neste estágio' });
    }

    // Registrar aprovação
    await pool.query(`
      INSERT INTO document_approvals (document_id, user_id, stage, action, comments, gov_signature_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [documentId, userId, document.current_stage, action, comments, govSignatureId]);

    if (action === 'reject') {
      // Se rejeitado, volta para o supervisor
      await pool.query(`
        UPDATE documents 
        SET current_stage = 'rejected', status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [documentId]);
    } else {
      // Se aprovado, avança para o próximo estágio
      let nextStage = '';
      if (document.current_stage === 'contabilidade') {
        nextStage = 'financeiro';
      } else if (document.current_stage === 'financeiro') {
        nextStage = 'diretoria';
      } else if (document.current_stage === 'diretoria') {
        nextStage = 'payment';
      }
      
      // Atualizar o documento com a próxima etapa
      if (nextStage) {
        if (nextStage === 'payment') {
          // Diretoria aprovou - documento vai para pagamento
          await pool.query(`
            UPDATE documents 
            SET current_stage = $1, status = 'approved', final_approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [nextStage, documentId]);
        } else {
          // Outras etapas
          await pool.query(`
            UPDATE documents 
            SET current_stage = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [nextStage, documentId]);
        }
      }
    }

    res.json({ message: 'Documento processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Processar pagamento
app.post('/api/documents/:id/payment', authenticateToken, upload.single('paymentProof'), async (req, res) => {
  try {
    const documentId = req.params.id;
    const { paymentDate } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'financeiro') {
      return res.status(403).json({ error: 'Apenas usuários do financeiro podem processar pagamentos' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Comprovante de pagamento é obrigatório' });
    }

    // Buscar documento
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const document = docResult.rows[0];

    if (document.current_stage !== 'payment') {
      return res.status(400).json({ error: 'Documento não está aguardando pagamento' });
    }

    // Atualizar documento com pagamento
    await pool.query(`
      UPDATE documents 
      SET payment_proof_path = $1, payment_date = $2, payment_status = 'completed', current_stage = 'completed', status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [req.file.path, paymentDate, documentId]);

    // Registrar pagamento
    await pool.query(`
      INSERT INTO document_approvals (document_id, user_id, stage, action, comments)
      VALUES ($1, $2, 'payment', 'completed', 'Pagamento processado com sucesso')
    `, [documentId, userId]);

    // Mover arquivos para pasta de rede
    await moveDocumentToNetworkFolder(document);

    res.json({ message: 'Pagamento processado com sucesso' });
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download de documento
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    const userSector = req.user.sector;

    // Buscar documento
    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const document = result.rows[0];

    // Verificar permissões
    const canView = (
      document.created_by === userId || // Criador do documento
      (userRole === 'supervisor' && document.sector === userSector) || // Supervisor do setor
      ['contabilidade', 'financeiro', 'diretoria'].includes(userRole) // Outros roles com permissão
    );

    if (!canView) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Verificar se arquivo existe
    const fs = require('fs');
    if (!fs.existsSync(document.file_path)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Enviar arquivo
    res.download(document.file_path, document.original_filename);
  } catch (error) {
    console.error('Erro ao baixar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Função para mover documento para pasta de rede
async function moveDocumentToNetworkFolder(document) {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    
    // Caminho da pasta do setor
    const sectorFolder = `Y:\\${document.sector}\\3. Sistemas\\Karla\\Contabilidade`;
    const yearFolder = path.join(sectorFolder, currentYear.toString());
    const monthFolder = path.join(yearFolder, currentMonth);
    
    // Criar pastas se não existirem
    if (!fs.existsSync(sectorFolder)) {
      fs.mkdirSync(sectorFolder, { recursive: true });
    }
    if (!fs.existsSync(yearFolder)) {
      fs.mkdirSync(yearFolder, { recursive: true });
    }
    if (!fs.existsSync(monthFolder)) {
      fs.mkdirSync(monthFolder, { recursive: true });
    }
    
    // Nome do arquivo final
    const finalFileName = `${document.id}_${document.original_filename}`;
    const finalPath = path.join(monthFolder, finalFileName);
    
    // Copiar arquivo
    fs.copyFileSync(document.file_path, finalPath);
    
    // Se há comprovante de pagamento, copiar também
    if (document.payment_proof_path) {
      const paymentFileName = `${document.id}_comprovante_${path.basename(document.payment_proof_path)}`;
      const paymentFinalPath = path.join(monthFolder, paymentFileName);
      fs.copyFileSync(document.payment_proof_path, paymentFinalPath);
    }
    
    console.log(`✅ Documento ${document.id} movido para pasta de rede: ${monthFolder}`);
  } catch (error) {
    console.error('Erro ao mover documento para pasta de rede:', error);
  }
}

// Rota para upload de PDF assinado
app.post('/api/documents/:id/upload-signed', authenticateToken, upload.single('signedPdf'), async (req, res) => {
  try {
    const documentId = req.params.id;
    const userId = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({ error: 'PDF assinado é obrigatório' });
    }

    // Buscar documento original
    const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const document = docResult.rows[0];

    // Verificar se o usuário pode assinar este documento
    const canSign = (
      document.created_by === userId || // Criador do documento
      ['contabilidade', 'financeiro', 'diretoria'].includes(req.user.role) // Roles com permissão
    );

    if (!canSign) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Criar nome único para o arquivo assinado
    const timestamp = Date.now();
    const signedFilename = `signed_${timestamp}_${req.file.originalname}`;
    const signedPath = path.join(__dirname, 'uploads', signedFilename);

    console.log(`📁 Salvando PDF assinado: ${signedFilename}`);
    console.log(`📁 Caminho original: ${req.file.path}`);
    console.log(`📁 Caminho destino: ${signedPath}`);

    // Verificar se o diretório de uploads existe
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Criando diretório uploads...');
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Mover arquivo para o local correto
    try {
    fs.renameSync(req.file.path, signedPath);
      console.log('✅ Arquivo movido com sucesso');
    } catch (moveError) {
      console.error('❌ Erro ao mover arquivo:', moveError);
      throw new Error(`Erro ao mover arquivo: ${moveError.message}`);
    }

    // Atualizar documento com o arquivo assinado
    console.log('💾 Atualizando banco de dados...');
    
    try {
    // Check if columns exist before updating
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'documents' AND column_name IN ('signed_file_path', 'signed_filename', 'signed_at')
    `);
    
    const hasSignedColumns = columnCheck.rows.length > 0;
      console.log(`📊 Colunas de assinatura encontradas: ${hasSignedColumns}`);
    
    if (hasSignedColumns) {
      await pool.query(`
        UPDATE documents 
        SET signed_file_path = $1, signed_filename = $2, signed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [signedPath, signedFilename, documentId]);
        console.log('✅ Documento atualizado com colunas de assinatura');
    } else {
      // Fallback: update with basic columns
      await pool.query(`
        UPDATE documents 
        SET file_path = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [signedPath, documentId]);
        console.log('✅ Documento atualizado com colunas básicas');
      }
    } catch (dbError) {
      console.error('❌ Erro ao atualizar banco de dados:', dbError);
      throw new Error(`Erro ao atualizar banco de dados: ${dbError.message}`);
    }

    // Registrar na auditoria
    await logAudit(userId, 'DOCUMENT_SIGNED', documentId, `Documento assinado: ${document.title}`, req.ip);

    console.log(`✅ PDF assinado salvo: ${signedFilename}`);

    res.json({ 
      message: 'PDF assinado salvo com sucesso',
      signedFilename: signedFilename
    });

  } catch (error) {
    console.error('❌ Erro ao salvar PDF assinado:', error);
    console.error('❌ Stack trace:', error.stack);
    
    // Limpar arquivo temporário se existir
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Arquivo temporário removido');
      } catch (cleanupError) {
        console.error('❌ Erro ao limpar arquivo temporário:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Assinaturas funcionando' });
});

// Rotas de assinatura
app.use('/api/signatures', signatureRoutes);

// Middleware de tratamento de erros do multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    console.error('❌ Erro do multer:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Tamanho máximo permitido: 10MB' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Muitos arquivos enviados' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Campo de arquivo inesperado: ' + error.field });
    }
    return res.status(400).json({ error: 'Erro no upload do arquivo: ' + error.message });
  }
  
  if (error.message === 'Tipo de arquivo não permitido') {
    return res.status(400).json({ error: 'Tipo de arquivo não permitido. Apenas PDF e imagens são aceitos.' });
  }
  
  if (error.message === 'Apenas arquivos de imagem são permitidos para assinaturas') {
    return res.status(400).json({ error: 'Apenas arquivos de imagem são permitidos para assinaturas' });
  }
  
  console.error('❌ Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
startServer();
