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
      console.log(`📱 Frontend: http://localhost:3001`);
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
// Importar configuração AD
const { connectToAD, authenticateUser, disconnectFromAD } = require('./ad-config');

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
        // Autenticação local (padrão) - apenas username e senha
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

    const result = await pool.query('SELECT id, name, email, role, sector FROM users WHERE role = $1', [role]);
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
      `INSERT INTO documents (title, filename, original_filename, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [title, file.filename, file.originalname, req.user.id]
    );

    const documentId = result.rows[0].id;

    // Criar fluxo de assinaturas
    const signersArray = JSON.parse(signers);
    for (const [index, signer] of signersArray.entries()) {
      await pool.query(
        `INSERT INTO signature_flow (document_id, user_id, order_index) VALUES ($1, $2, $3)`,
        [documentId, signer.id, index + 1]
      );
    }

    // Enviar notificação para o primeiro signatário
    const firstSigner = signersArray[0];
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

    res.json(document);
  } catch (error) {
    console.error('Erro ao buscar documento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Download do documento
app.get('/api/documents/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);
    const document = result.rows[0];
    
    if (!document) {
      return res.status(404).json({ error: 'Documento não encontrado' });
    }

    const filePath = path.join(__dirname, 'uploads', document.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    await logAudit(req.user.id, 'DOCUMENT_DOWNLOAD', id, `Download do documento "${document.title}"`, req.ip);

    res.download(filePath, document.original_filename);
  } catch (error) {
    console.error('Erro no download:', error);
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
    // Buscar informações do documento e do supervisor que iniciou
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

    // Determinar o setor baseado no supervisor
    let sector = document.sector;
    if (!sector) {
      // Se não há setor definido, usar pasta padrão
      sector = 'SETOR GERAL';
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
     const { name, email, password, sector } = req.body;

     console.log('➕ Criando supervisor:', { name, email, sector });

     // Verificar se o usuário é admin ou tem permissão
     if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
       return res.status(403).json({ error: 'Acesso negado' });
     }

     // Verificar se o email já existe
     const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
     if (existingUser.rows.length > 0) {
       return res.status(400).json({ error: 'E-mail já cadastrado' });
     }

     // Gerar username baseado no nome
     const username = name.toLowerCase().replace(/\s+/g, '.');

     // Verificar se o username já existe
     const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
     if (existingUsername.rows.length > 0) {
       return res.status(400).json({ error: 'Nome de usuário já existe' });
     }

     // Criar usuário supervisor
     const bcrypt = require('bcryptjs');
     const hashedPassword = await bcrypt.hash(password || '123456', 10);

     const result = await pool.query(`
       INSERT INTO users (name, email, username, role, password, sector) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, name, email, username, role, sector
     `, [name, email, username, 'supervisor', hashedPassword, sector]);

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
    const { sector } = req.body;

    console.log('🔄 Atualizando supervisor:', { id, sector });

    // Verificar se o usuário é admin ou tem permissão
    if (req.user.role !== 'admin' && req.user.role !== 'diretoria') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

         const result = await pool.query(`
       UPDATE users SET sector = $1 
       WHERE id = $2 AND role = 'supervisor' 
       RETURNING id, name, email, username, role, sector
     `, [sector, id]);

    console.log('📊 Resultado da atualização:', result.rows[0]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supervisor não encontrado' });
    }

    await logAudit(req.user.id, 'SUPERVISOR_UPDATED', null, `Setor atualizado: ${result.rows[0].name} -> ${sector}`, req.ip);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar supervisor:', error);
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

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Assinaturas funcionando' });
});

// Iniciar servidor
startServer();
