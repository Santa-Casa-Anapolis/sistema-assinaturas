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
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware de segurança
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requests por IP
});
app.use(limiter);

// Inicialização do banco PostgreSQL
async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Banco de dados inicializado com sucesso');
    
    // Iniciar servidor após inicializar o banco
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`📱 Frontend: http://localhost:3000`);
      console.log(`🔧 Backend: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Erro ao inicializar banco:', error);
    process.exit(1);
  }
}

// Configuração do upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Apenas PDF e DOCX são permitidos.'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Configuração do email (DESABILITADO - Modo sem email)
// const transporter = nodemailer.createTransporter({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER || 'seu-email@gmail.com',
//     pass: process.env.EMAIL_PASS || 'sua-senha-app'
//   }
// });

// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Log de auditoria
async function logAudit(userId, action, documentId, details, ipAddress) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, action, document_id, details, ip_address) VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, documentId, details, ipAddress]
    );
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
  }
}

// Rotas de autenticação

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const authMode = process.env.AUTH_MODE || 'local';

      let user = null;

      if (authMode === 'ad') {
        // Autenticação via Active Directory
        try {
          await connectToAD();
          const adUser = await authenticateUser(username, password);
          
          // Verificar se o usuário já existe no banco local
          const existingUser = await pool.query('SELECT * FROM users WHERE username = $1', [adUser.username]);
          
          if (existingUser.rows.length > 0) {
            // Atualizar apenas nome do usuário (role e setor ficam como estão)
            await pool.query(`
              UPDATE users 
              SET name = $1 
              WHERE username = $2
            `, [adUser.name, adUser.username]);
            
            user = { ...existingUser.rows[0], name: adUser.name };
          } else {
            // Usuário não existe - precisa ser criado pelo admin
            await disconnectFromAD();
            return res.status(401).json({ 
              error: 'Usuário não cadastrado no sistema. Entre em contato com o administrador.' 
            });
          }
          
          await disconnectFromAD();
        } catch (adError) {
          console.error('Erro na autenticação AD:', adError);
          return res.status(401).json({ error: 'Falha na autenticação com o Active Directory' });
        }
      } else {
        // Autenticação local (padrão) - login por nome de usuário
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        user = result.rows[0];

        if (!user) {
          return res.status(401).json({ error: 'Usuário não encontrado' });
        }

        // Verificar senha
        const bcrypt = require('bcryptjs');
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
          return res.status(401).json({ error: 'Senha incorreta' });
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

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        sector: user.sector
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter usuários por papel
app.get('/api/users/by-role/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query('SELECT id, name, email, role, sector, profile FROM users WHERE role = $1', [role]);
    const users = result.rows;
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Upload de documento
app.post('/api/documents/upload', authenticateToken, upload.single('document'), async (req, res) => {
  try {
    const { title, signers } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Inserir documento
    const result = await pool.query(
      `INSERT INTO documents (title, file_path, original_filename, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, file.filename, file.originalname, req.user.id]
    );

    const documentId = result.rows[0].id;

    // Criar fluxo de assinaturas baseado nos perfis
    const signersArray = JSON.parse(signers);
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
    const firstSigner = orderedSigners[0];
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [firstSigner.id]);
    const user = userResult.rows[0];
    if (user) {
      sendNotificationEmail(user.email, title, documentId);
    }

    await logAudit(req.user.id, 'DOCUMENT_UPLOAD', documentId, `Documento "${title}" enviado`, req.ip);

    res.json({
      message: 'Documento enviado com sucesso',
      documentId,
      filename: file.filename
    });
  } catch (error) {
    console.error('Erro no upload:', error);
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
  // Verificar autenticação via query parameter ou header
  const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sua-chave-secreta-muito-segura-aqui');
    req.user = decoded;
    
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    const document = result.rows[0];
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const filePath = path.join(__dirname, 'uploads', document.file_path || document.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Determinar o tipo de conteúdo
    const ext = path.extname(document.original_filename || document.filename).toLowerCase();
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

    // Configurar headers para visualização inline
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename || document.filename}"`);
    
    // Enviar arquivo
    res.sendFile(filePath);
  } catch (error) {
    console.error('Erro na visualização:', error);
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

     // Verificar se o usuário é admin ou tem permissão
     if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
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
    // Verificar se o usuário é admin
    if (req.user.role !== 'admin') {
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

// Middleware para verificar se é admin
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT is_admin FROM users WHERE id = ?', [userId]);
    
    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    
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
      SELECT u.*, g.name as group_name, g.id as group_id
      FROM users u
      LEFT JOIN user_groups ug ON u.id = ug.user_id
      LEFT JOIN access_groups g ON ug.group_id = g.id
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
    const existingUser = await pool.query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Usuário já existe' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Criar usuário
    const result = await pool.query(`
      INSERT INTO users (name, email, username, role, password, sector, profile, group_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    const existingUser = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar se email/username já existe em outro usuário
    const duplicateUser = await pool.query('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?', [email, username, userId]);
    if (duplicateUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email ou username já existe em outro usuário' });
    }
    
    // Atualizar usuário
    await pool.query(`
      UPDATE users 
      SET name = ?, email = ?, username = ?, role = ?, sector = ?, group_name = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
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
    const existingUser = await pool.query('SELECT id FROM users WHERE id = ?', [userId]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
    // Não permitir excluir o próprio usuário admin
    if (req.user.id === parseInt(userId)) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário' });
    }
    
    // Excluir usuário
    await pool.query('DELETE FROM users WHERE id = ?', [userId]);
    
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
    const existingGroup = await pool.query('SELECT id FROM access_groups WHERE name = ?', [name]);
    if (existingGroup.rows.length > 0) {
      return res.status(400).json({ error: 'Grupo já existe' });
    }
    
    // Criar grupo
    const result = await pool.query(`
      INSERT INTO access_groups (name, description, permissions)
      VALUES (?, ?, ?)
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
    await pool.query('DELETE FROM user_groups WHERE user_id = ?', [userId]);
    
    // Adicionar nova associação
    await pool.query(`
      INSERT INTO user_groups (user_id, group_id, assigned_by)
      VALUES (?, ?, ?)
    `, [userId, groupId, assignedBy]);
    
    res.json({ message: 'Usuário atribuído ao grupo com sucesso' });
  } catch (error) {
    console.error('Erro ao atribuir usuário ao grupo:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// ==================== ROTAS DE DOCUMENTOS ====================

// Buscar documentos do usuário
app.get('/api/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const userSector = req.user.sector;

    let query = `
      SELECT d.*, u.name as created_by_name, s.name as supervisor_name,
             COUNT(df.id) as files_count,
             STRING_AGG(df.original_filename, ', ') as file_names
      FROM documents d
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN users s ON d.supervisor_id = s.id
      LEFT JOIN document_files df ON d.id = df.document_id
    `;
    
    let params = [];

    // Filtrar por permissões do usuário
    if (userRole === 'supervisor') {
      query += ' WHERE d.sector = ?';
      params.push(userSector);
    } else if (['contabilidade', 'financeiro', 'diretoria'].includes(userRole)) {
      // Esses roles podem ver todos os documentos
      query += ' WHERE 1=1';
    } else {
      query += ' WHERE d.created_by = ?';
      params.push(userId);
    }

    query += ' GROUP BY d.id, u.name, s.name ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo documento
app.post('/api/documents', authenticateToken, upload.array('documents', 10), async (req, res) => {
  try {
    const { title, description, amount, sector } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Pelo menos um arquivo é obrigatório' });
    }

    // Apenas supervisores podem criar documentos
    if (userRole !== 'supervisor') {
      return res.status(403).json({ error: 'Apenas supervisores podem criar documentos' });
    }

    // Inserir documento principal
    const result = await pool.query(`
      INSERT INTO documents (title, description, created_by, supervisor_id, sector, amount, current_stage, status)
      VALUES ($1, $2, $3, $4, $5, $6, 'contabilidade', 'pending')
      RETURNING id
    `, [
      title,
      description,
      userId,
      userId,
      sector || req.user.sector,
      amount || 0
    ]);

    const documentId = result.rows[0].id;

    // Inserir arquivos associados
    for (const file of files) {
      await pool.query(`
        INSERT INTO document_files (document_id, filename, original_filename, file_path, file_size, mime_type)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        documentId,
        file.filename,
        file.originalname,
        file.path,
        file.size,
        file.mimetype
      ]);
    }

    res.json({ 
      message: 'Documento criado com sucesso',
      documentId: documentId,
      filesCount: files.length
    });
  } catch (error) {
    console.error('Erro ao criar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
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
    const docResult = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
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
      VALUES (?, ?, ?, ?, ?, ?)
    `, [documentId, userId, document.current_stage, action, comments, govSignatureId]);

    if (action === 'reject') {
      // Se rejeitado, volta para o supervisor
      await pool.query(`
        UPDATE documents 
        SET current_stage = 'rejected', status = 'rejected', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
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
            SET current_stage = ?, status = 'approved', final_approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [nextStage, documentId]);
        } else {
          // Outras etapas
          await pool.query(`
            UPDATE documents 
            SET current_stage = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
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
    const docResult = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
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
      SET payment_proof_path = ?, payment_date = ?, payment_status = 'completed', current_stage = 'completed', status = 'completed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.file.path, paymentDate, documentId]);

    // Registrar pagamento
    await pool.query(`
      INSERT INTO document_approvals (document_id, user_id, stage, action, comments)
      VALUES (?, ?, 'payment', 'completed', 'Pagamento processado com sucesso')
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
    const result = await pool.query('SELECT * FROM documents WHERE id = ?', [documentId]);
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

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Assinaturas funcionando' });
});

// Iniciar servidor
startServer();
