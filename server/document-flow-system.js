/**
 * Sistema de Fluxo de Documentos
 * Move automaticamente documentos através das etapas de aprovação
 * Arquivo final vai para: Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade
 */

const fs = require('fs');
const path = require('path');

class DocumentFlowSystem {
  constructor() {
    // Estrutura de pastas por status
    this.folders = {
      pending: path.join(__dirname, 'uploads', 'pending'),
      contabilidade: path.join(__dirname, 'uploads', 'contabilidade'),
      financeiro: path.join(__dirname, 'uploads', 'financeiro'),
      diretoria: path.join(__dirname, 'uploads', 'diretoria'),
      payment: path.join(__dirname, 'uploads', 'payment'),
      completed: path.join(__dirname, 'uploads', 'completed')
    };

    // Pasta base de rede
    this.baseNetworkPath = 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla';
    
    // Mapeamento de setores para pastas
    this.sectorFolders = {
      'TECNOLOGIA DA INFORMAÇÃO': 'TI',
      'RECURSOS HUMANOS': 'RH',
      'FINANCEIRO': 'Financeiro',
      'GERÊNCIA': 'Gerencia',
      'DIRETORIA': 'Diretoria',
      'GERAL': 'Geral',
      'CONTABILIDADE': 'Contabilidade'
    };
    
    // Criar todas as pastas se não existirem
    this.createFolders();
  }

  // Criar estrutura de pastas
  createFolders() {
    Object.values(this.folders).forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`📁 Pasta criada: ${folder}`);
      }
    });

    // Criar pastas por setor na rede
    Object.values(this.sectorFolders).forEach(folderName => {
      const sectorPath = path.join(this.baseNetworkPath, folderName);
      if (!fs.existsSync(sectorPath)) {
        try {
          fs.mkdirSync(sectorPath, { recursive: true });
          console.log(`📁 Pasta de setor criada: ${sectorPath}`);
        } catch (error) {
          console.warn(`⚠️ Não foi possível criar pasta de setor ${folderName}: ${error.message}`);
        }
      }
    });
  }

  // Mover documento para próxima etapa
  async moveDocumentToStage(documentId, currentStage, newStage, userId, comments = '') {
    try {
      console.log(`🔄 Movendo documento ${documentId} de ${currentStage} para ${newStage}`);

      // Buscar documento no banco
      const pool = require('./index').pool;
      const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
      
      if (docResult.rows.length === 0) {
        throw new Error('Documento não encontrado');
      }

      const document = docResult.rows[0];
      const currentFilePath = document.file_path;

      // Determinar pasta de origem baseada no estágio atual
      let sourceFolder;
      if (currentStage === 'pending') {
        sourceFolder = this.folders.pending;
      } else {
        sourceFolder = this.folders[currentStage] || this.folders.pending;
      }

      // Verificar se arquivo existe na pasta atual
      const currentFullPath = path.join(sourceFolder, currentFilePath);
      if (!fs.existsSync(currentFullPath)) {
        // Tentar na pasta uploads principal
        const mainPath = path.join(__dirname, 'uploads', currentFilePath);
        if (fs.existsSync(mainPath)) {
          // Mover para pasta correta primeiro
          const targetPath = path.join(sourceFolder, currentFilePath);
          fs.copyFileSync(mainPath, targetPath);
          console.log(`📄 Arquivo movido para pasta ${currentStage}`);
        } else {
          throw new Error(`Arquivo não encontrado: ${currentFilePath} em ${currentFullPath}`);
        }
      }

      // Criar novo nome de arquivo com timestamp e etapa
      const timestamp = Date.now();
      const fileExtension = path.extname(currentFilePath);
      const baseName = path.basename(currentFilePath, fileExtension);
      const newFileName = `${baseName}_${newStage}_${timestamp}${fileExtension}`;

      // Caminhos origem e destino
      const sourcePath = path.join(sourceFolder, currentFilePath);
      const targetPath = path.join(this.folders[newStage], newFileName);

      // Mover arquivo
      fs.copyFileSync(sourcePath, targetPath);

      // Determinar status baseado no novo estágio
      let newStatus;
      if (newStage === 'contabilidade') {
        newStatus = 'contabilidade_pending';
      } else if (newStage === 'payment') {
        newStatus = 'approved';
      } else if (newStage === 'completed') {
        newStatus = 'completed';
      } else {
        newStatus = `${newStage}_approved`;
      }

      // Atualizar banco de dados
      await pool.query(`
        UPDATE documents 
        SET file_path = $1, current_stage = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newFileName, newStage, newStatus, documentId]);

      // Registrar aprovação apenas se não for movimento inicial (pending -> contabilidade)
      if (currentStage !== 'pending') {
        await pool.query(`
          INSERT INTO document_approvals (document_id, user_id, stage, action, comments, created_at)
          VALUES ($1, $2, $3, 'approved', $4, CURRENT_TIMESTAMP)
        `, [documentId, userId, newStage, comments]);
      }

      // Remover arquivo da pasta anterior (após confirmar que foi copiado)
      if (fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }

      console.log(`✅ Documento ${documentId} movido para ${newStage}: ${newFileName}`);

      return {
        success: true,
        newFilePath: newFileName,
        newStage: newStage,
        newStatus: newStatus,
        message: `Documento movido para etapa ${newStage}`
      };

    } catch (error) {
      console.error(`❌ Erro ao mover documento ${documentId}:`, error);
      throw error;
    }
  }

  // Mover para pasta final de rede baseada no setor (após todas as aprovações)
  async moveToFinalNetworkLocation(documentId) {
    try {
      console.log(`🌐 Movendo documento ${documentId} para pasta de rede final`);

      const pool = require('./index').pool;
      const docResult = await pool.query(`
        SELECT d.*, u.sector as user_sector, u.name as user_name
        FROM documents d
        JOIN users u ON d.created_by = u.id
        WHERE d.id = $1
      `, [documentId]);
      
      if (docResult.rows.length === 0) {
        throw new Error('Documento não encontrado');
      }

      const document = docResult.rows[0];
      const currentFilePath = document.file_path;

      // Se o documento está em payment, mover para completed primeiro
      let currentFullPath = path.join(this.folders.payment, currentFilePath);
      if (fs.existsSync(currentFullPath)) {
        // Mover de payment para completed
        const completedPath = path.join(this.folders.completed, currentFilePath);
        fs.copyFileSync(currentFullPath, completedPath);
        fs.unlinkSync(currentFullPath);
        console.log(`📄 Arquivo movido de payment para completed`);
        currentFullPath = completedPath;
      } else {
        // Tentar encontrar em completed
        currentFullPath = path.join(this.folders.completed, currentFilePath);
        if (!fs.existsSync(currentFullPath)) {
          throw new Error(`Arquivo não encontrado: ${currentFilePath} em payment ou completed`);
        }
      }

      // Determinar pasta de destino baseada no setor do usuário
      const userSector = document.user_sector || document.sector || 'GERAL';
      const sectorFolder = this.sectorFolders[userSector] || this.sectorFolders['GERAL'];
      const finalSectorPath = path.join(this.baseNetworkPath, sectorFolder);

      // Criar pasta do setor se não existir
      if (!fs.existsSync(finalSectorPath)) {
        try {
          fs.mkdirSync(finalSectorPath, { recursive: true });
          console.log(`📁 Pasta de setor criada: ${finalSectorPath}`);
        } catch (error) {
          console.warn(`⚠️ Não foi possível criar pasta de setor: ${error.message}`);
          // Usar pasta geral como fallback
          const generalPath = path.join(this.baseNetworkPath, this.sectorFolders['GERAL']);
          fs.mkdirSync(generalPath, { recursive: true });
        }
      }

      // Nome final do arquivo na pasta de rede
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileExtension = path.extname(currentFilePath);
      const baseName = path.basename(currentFilePath, fileExtension);
      const finalFileName = `${baseName}_${sectorFolder}_FINAL_${timestamp}${fileExtension}`;

      // Caminho final na pasta de rede do setor
      const finalNetworkPath = path.join(finalSectorPath, finalFileName);

      // Copiar arquivo para pasta de rede do setor
      fs.copyFileSync(currentFullPath, finalNetworkPath);

      // Atualizar banco com caminho final
      await pool.query(`
        UPDATE documents 
        SET 
          file_path = $1,
          current_stage = 'completed',
          final_network_path = $2,
          final_network_filename = $3,
          final_network_sector = $4,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [currentFilePath, finalNetworkPath, finalFileName, sectorFolder, documentId]);

      // Registrar conclusão
      await pool.query(`
        INSERT INTO document_approvals (document_id, user_id, stage, action, comments, created_at)
        VALUES ($1, $2, 'final', 'completed', 'Documento enviado para pasta de rede do setor: ${sectorFolder}', CURRENT_TIMESTAMP)
      `, [documentId, document.created_by]);

      console.log(`✅ Documento ${documentId} enviado para pasta de rede do setor ${sectorFolder}: ${finalNetworkPath}`);

      return {
        success: true,
        finalPath: finalNetworkPath,
        finalFilename: finalFileName,
        sectorFolder: sectorFolder,
        userSector: userSector,
        message: `Documento enviado para pasta de rede do setor: ${sectorFolder}`
      };

    } catch (error) {
      console.error(`❌ Erro ao enviar documento ${documentId} para pasta de rede:`, error);
      throw error;
    }
  }

  // Obter próximo estágio baseado no estágio atual
  getNextStage(currentStage) {
    const stageFlow = {
      'pending': 'contabilidade',
      'contabilidade': 'financeiro',
      'financeiro': 'diretoria',
      'diretoria': 'payment',
      'payment': 'completed'
    };
    
    return stageFlow[currentStage] || null;
  }

  // Verificar se documento pode ser movido para próximo estágio
  canMoveToNextStage(documentId, currentStage, userId) {
    // Implementar lógica de validação se necessário
    return true;
  }

  // Obter status de um documento
  async getDocumentStatus(documentId) {
    try {
      const pool = require('./index').pool;
      const result = await pool.query(`
        SELECT d.*, u.name as created_by_name
        FROM documents d
        JOIN users u ON d.created_by = u.id
        WHERE d.id = $1
      `, [documentId]);

      if (result.rows.length === 0) {
        return null;
      }

      const document = result.rows[0];
      
      return {
        id: document.id,
        title: document.title,
        currentStage: document.current_stage,
        status: document.status,
        filePath: document.file_path,
        finalNetworkPath: document.final_network_path,
        createdBy: document.created_by_name,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
        completedAt: document.completed_at
      };

    } catch (error) {
      console.error(`❌ Erro ao obter status do documento ${documentId}:`, error);
      throw error;
    }
  }

  // Listar documentos por estágio
  async getDocumentsByStage(stage) {
    try {
      const pool = require('./index').pool;
      const result = await pool.query(`
        SELECT d.*, u.name as created_by_name
        FROM documents d
        JOIN users u ON d.created_by = u.id
        WHERE d.current_stage = $1
        ORDER BY d.updated_at DESC
      `, [stage]);

      return result.rows;

    } catch (error) {
      console.error(`❌ Erro ao listar documentos do estágio ${stage}:`, error);
      throw error;
    }
  }
}

// Instância singleton
const documentFlow = new DocumentFlowSystem();

module.exports = documentFlow;
