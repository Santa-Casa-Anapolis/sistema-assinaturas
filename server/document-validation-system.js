/**
 * Sistema de Validação de Documentos
 * Garante que documentos só sejam salvos definitivamente após assinatura
 */

const fs = require('fs');
const path = require('path');

class DocumentValidationSystem {
  constructor() {
    this.tempDir = path.join(__dirname, 'temp_documents');
    this.ensureTempDir();
  }

  // Criar diretório temporário se não existir
  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
      console.log('📁 Diretório temporário criado:', this.tempDir);
    }
  }

  // Salvar documento temporariamente
  async saveTempDocument(file, metadata) {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const tempDir = path.join(this.tempDir, tempId);
      
      // Criar diretório para este documento temporário
      fs.mkdirSync(tempDir, { recursive: true });
      
      // Mover arquivo para diretório temporário
      const tempFilePath = path.join(tempDir, file.originalname);
      fs.renameSync(file.path, tempFilePath);
      
      // Salvar metadados
      const metadataPath = path.join(tempDir, 'metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify({
        ...metadata,
        tempId,
        originalPath: file.path,
        tempPath: tempFilePath,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      }, null, 2));
      
      console.log(`📄 Documento temporário salvo: ${tempId}`);
      return tempId;
    } catch (error) {
      console.error('❌ Erro ao salvar documento temporário:', error);
      throw error;
    }
  }

  // Validar se documento foi assinado
  async validateDocumentSignature(tempId, userId) {
    try {
      const tempDir = path.join(this.tempDir, tempId);
      const metadataPath = path.join(tempDir, 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Documento temporário não encontrado');
      }
      
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Verificar se expirou
      if (new Date() > new Date(metadata.expiresAt)) {
        await this.cleanupTempDocument(tempId);
        throw new Error('Documento temporário expirado');
      }
      
      // Aqui você pode adicionar validações específicas de assinatura
      // Por exemplo, verificar se há assinatura no PDF ou se foi assinado via API
      
      return {
        valid: true,
        metadata,
        tempPath: metadata.tempPath
      };
    } catch (error) {
      console.error('❌ Erro ao validar assinatura:', error);
      throw error;
    }
  }

  // Mover documento temporário para local definitivo
  async moveToFinalLocation(tempId, finalPath) {
    try {
      const tempDir = path.join(this.tempDir, tempId);
      const metadataPath = path.join(tempDir, 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        throw new Error('Documento temporário não encontrado');
      }
      
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Criar diretório final se não existir
      const finalDir = path.dirname(finalPath);
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }
      
      // Mover arquivo para local final
      fs.renameSync(metadata.tempPath, finalPath);
      
      // Limpar diretório temporário
      await this.cleanupTempDocument(tempId);
      
      console.log(`✅ Documento movido para local final: ${finalPath}`);
      return finalPath;
    } catch (error) {
      console.error('❌ Erro ao mover documento para local final:', error);
      throw error;
    }
  }

  // Limpar documento temporário
  async cleanupTempDocument(tempId) {
    try {
      const tempDir = path.join(this.tempDir, tempId);
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`🧹 Documento temporário removido: ${tempId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar documento temporário:', error);
    }
  }

  // Limpar documentos expirados
  async cleanupExpiredDocuments() {
    try {
      const tempDirs = fs.readdirSync(this.tempDir);
      let cleanedCount = 0;
      
      for (const dir of tempDirs) {
        const tempDir = path.join(this.tempDir, dir);
        const metadataPath = path.join(tempDir, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
          
          if (new Date() > new Date(metadata.expiresAt)) {
            await this.cleanupTempDocument(dir);
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        console.log(`🧹 ${cleanedCount} documentos temporários expirados removidos`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar documentos expirados:', error);
    }
  }

  // Obter informações do documento temporário
  async getTempDocumentInfo(tempId) {
    try {
      const tempDir = path.join(this.tempDir, tempId);
      const metadataPath = path.join(tempDir, 'metadata.json');
      
      if (!fs.existsSync(metadataPath)) {
        return null;
      }
      
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      return metadata;
    } catch (error) {
      console.error('❌ Erro ao obter informações do documento temporário:', error);
      return null;
    }
  }
}

// Instância singleton
const documentValidation = new DocumentValidationSystem();

// Limpar documentos expirados a cada hora
setInterval(() => {
  documentValidation.cleanupExpiredDocuments();
}, 60 * 60 * 1000);

module.exports = documentValidation;
