-- Migration para suportar múltiplos arquivos por documento
-- Execute este script no banco de dados existente

-- Criar nova tabela para arquivos
CREATE TABLE IF NOT EXISTS document_files (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar colunas necessárias na tabela documents se não existirem
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50) DEFAULT 'contabilidade',
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS supervisor_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS final_approval_date TIMESTAMP;

-- Migrar dados existentes da tabela documents para document_files
INSERT INTO document_files (document_id, filename, original_filename, file_path, file_size, mime_type)
SELECT 
    id as document_id,
    filename,
    original_filename,
    COALESCE(file_path, '/uploads/' || filename) as file_path,
    COALESCE(file_size, 0) as file_size,
    COALESCE(mime_type, 'application/pdf') as mime_type
FROM documents 
WHERE filename IS NOT NULL;

-- Criar índices para a nova tabela
CREATE INDEX IF NOT EXISTS idx_document_files_document_id ON document_files(document_id);
CREATE INDEX IF NOT EXISTS idx_document_files_created_at ON document_files(created_at);

-- Comentário na nova tabela
COMMENT ON TABLE document_files IS 'Arquivos associados aos documentos';

-- Log da migração
INSERT INTO audit_log (user_id, action, details, ip_address) 
VALUES (NULL, 'MIGRATION', 'Migração para múltiplos arquivos por documento concluída', 'migration-script');
