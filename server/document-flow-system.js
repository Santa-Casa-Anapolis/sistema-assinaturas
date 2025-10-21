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

    // Pasta final de rede
    this.finalNetworkPath = 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\Contabilidade';
    
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

    // Criar pasta final de rede se não existir
    if (!fs.existsSync(this.finalNetworkPath)) {
      try {
        fs.mkdirSync(this.finalNetworkPath, { recursive: true });
        console.log(`📁 Pasta final criada: ${this.finalNetworkPath}`);
      } catch (error) {
        console.warn(`⚠️ Não foi possível criar pasta de rede: ${error.message}`);
        console.warn(`⚠️ Verifique se o caminho ${this.finalNetworkPath} está acessível`);
      }
    }
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

      // Verificar se arquivo existe na pasta atual
      const currentFullPath = path.join(this.folders[currentStage], currentFilePath);
      if (!fs.existsSync(currentFullPath)) {
        // Tentar na pasta uploads principal
        const mainPath = path.join(__dirname, 'uploads', currentFilePath);
        if (fs.existsSync(mainPath)) {
          // Mover para pasta correta
          const targetPath = path.join(this.folders[currentStage], currentFilePath);
          fs.copyFileSync(mainPath, targetPath);
          console.log(`📄 Arquivo movido para pasta ${currentStage}`);
        } else {
          throw new Error(`Arquivo não encontrado: ${currentFilePath}`);
        }
      }

      // Criar novo nome de arquivo com timestamp e etapa
      const timestamp = Date.now();
      const fileExtension = path.extname(currentFilePath);
      const baseName = path.basename(currentFilePath, fileExtension);
      const newFileName = `${baseName}_${newStage}_${timestamp}${fileExtension}`;

      // Caminhos origem e destino
      const sourcePath = path.join(this.folders[currentStage], currentFilePath);
      const targetPath = path.join(this.folders[newStage], newFileName);

      // Mover arquivo
      fs.copyFileSync(sourcePath, targetPath);

      // Atualizar banco de dados
      await pool.query(`
        UPDATE documents 
        SET file_path = $1, current_stage = $2, status = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [newFileName, newStage, `${newStage}_approved`, documentId]);

      // Registrar aprovação
      await pool.query(`
        INSERT INTO document_approvals (document_id, user_id, stage, action, comments, created_at)
        VALUES ($1, $2, $3, 'approved', $4, CURRENT_TIMESTAMP)
      `, [documentId, userId, newStage, comments]);

      // Remover arquivo da pasta anterior (após confirmar que foi copiado)
      if (fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
      }

      console.log(`✅ Documento ${documentId} movido para ${newStage}: ${newFileName}`);

      return {
        success: true,
        newFilePath: newFileName,
        newStage: newStage,
        message: `Documento movido para etapa ${newStage}`
      };

    } catch (error) {
      console.error(`❌ Erro ao mover documento ${documentId}:`, error);
      throw error;
    }
  }

  // Mover para pasta final de rede (após todas as aprovações)
  async moveToFinalNetworkLocation(documentId) {
    try {
      console.log(`🌐 Movendo documento ${documentId} para pasta de rede final`);

      const pool = require('./index').pool;
      const docResult = await pool.query('SELECT * FROM documents WHERE id = $1', [documentId]);
      
      if (docResult.rows.length === 0) {
        throw new Error('Documento não encontrado');
      }

      const document = docResult.rows[0];
      const currentFilePath = document.file_path;

      // Caminho atual do arquivo
      const currentFullPath = path.join(this.folders.completed, currentFilePath);
      
      if (!fs.existsSync(currentFullPath)) {
        throw new Error(`Arquivo não encontrado: ${currentFullPath}`);
      }

      // Nome final do arquivo na pasta de rede
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const fileExtension = path.extname(currentFilePath);
      const baseName = path.basename(currentFilePath, fileExtension);
      const finalFileName = `${baseName}_FINAL_${timestamp}${fileExtension}`;

      // Caminho final na pasta de rede
      const finalNetworkPath = path.join(this.finalNetworkPath, finalFileName);

      // Copiar arquivo para pasta de rede
      fs.copyFileSync(currentFullPath, finalNetworkPath);

      // Atualizar banco com caminho final
      await pool.query(`
        UPDATE documents 
        SET 
          final_network_path = $1,
          final_network_filename = $2,
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [finalNetworkPath, finalFileName, documentId]);

      // Registrar conclusão
      await pool.query(`
        INSERT INTO document_approvals (document_id, user_id, stage, action, comments, created_at)
        VALUES ($1, $2, 'final', 'completed', 'Documento enviado para pasta de rede final', CURRENT_TIMESTAMP)
      `, [documentId, document.created_by]);

      console.log(`✅ Documento ${documentId} enviado para pasta de rede: ${finalNetworkPath}`);

      return {
        success: true,
        finalPath: finalNetworkPath,
        finalFilename: finalFileName,
        message: 'Documento enviado para pasta de rede final'
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
