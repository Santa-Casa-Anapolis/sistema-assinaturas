# Atualização: Suporte a Múltiplos Arquivos por Documento

## 📋 Resumo das Alterações

Esta atualização implementa a funcionalidade de seleção múltipla de arquivos no sistema de upload de documentos.

## 🔧 Modificações Realizadas

### Frontend (React)
- **Arquivo**: `client/src/components/UploadDocument.js`
- **Mudanças**:
  - Alterado de `selectedFile` para `selectedFiles` (array)
  - Habilitado `multiple: true` no dropzone
  - Interface atualizada para mostrar lista de arquivos selecionados
  - Botão para adicionar mais arquivos após seleção inicial
  - Contador de arquivos selecionados
  - Remoção individual de arquivos

### Backend (Node.js)
- **Arquivo**: `server/index.js`
- **Mudanças**:
  - Endpoint `/api/documents` agora aceita `upload.array('documents', 10)`
  - Criação de documento principal na tabela `documents`
  - Inserção de arquivos na nova tabela `document_files`
  - Consultas atualizadas para incluir informações dos arquivos
  - Novo endpoint para download de arquivos específicos

### Banco de Dados
- **Novo arquivo**: `migration-multiple-files.sql`
- **Mudanças**:
  - Nova tabela `document_files` para armazenar múltiplos arquivos
  - Colunas adicionais na tabela `documents`
  - Migração de dados existentes
  - Índices para performance

## 🚀 Como Aplicar as Mudanças

### 1. Executar Migração do Banco
```bash
# Windows
run-migration.bat

# Linux/Mac
docker exec -i notafiscais-postgres-1 psql -U postgres -d notafiscais < migration-multiple-files.sql
```

### 2. Reiniciar o Sistema
```bash
# Parar containers
docker-compose down

# Iniciar novamente
docker-compose up -d
```

## 📊 Nova Estrutura do Banco

### Tabela `documents` (atualizada)
- Mantém informações principais do documento
- Adicionadas colunas: `description`, `amount`, `sector`, `current_stage`, `status`, `supervisor_id`

### Tabela `document_files` (nova)
- `id`: ID único do arquivo
- `document_id`: Referência ao documento
- `filename`: Nome do arquivo no servidor
- `original_filename`: Nome original do arquivo
- `file_path`: Caminho completo do arquivo
- `file_size`: Tamanho em bytes
- `mime_type`: Tipo MIME do arquivo

## 🎯 Funcionalidades Implementadas

### Upload Múltiplo
- ✅ Seleção de múltiplos arquivos via drag & drop
- ✅ Seleção de múltiplos arquivos via clique
- ✅ Adição de mais arquivos após seleção inicial
- ✅ Remoção individual de arquivos
- ✅ Validação de tipos de arquivo (PDF, DOCX)
- ✅ Limite de 10 arquivos por documento

### Interface Melhorada
- ✅ Lista visual de arquivos selecionados
- ✅ Contador de arquivos
- ✅ Informações de tamanho de cada arquivo
- ✅ Botões de remoção individual
- ✅ Opção de adicionar mais arquivos

### Backend Robusto
- ✅ Processamento de múltiplos arquivos
- ✅ Validação de permissões
- ✅ Logs de auditoria
- ✅ Endpoints para download específico
- ✅ Consultas otimizadas com JOINs

## 🔍 Endpoints Atualizados

### POST `/api/documents`
- Agora aceita múltiplos arquivos via `documents[]`
- Retorna `filesCount` na resposta

### GET `/api/documents`
- Inclui `files_count` e `file_names` na resposta

### GET `/api/documents/:id`
- Inclui array `files` com informações de todos os arquivos

### GET `/api/documents/:id/files/:fileId/download`
- Novo endpoint para download de arquivo específico

## ⚠️ Considerações Importantes

1. **Compatibilidade**: Documentos existentes continuam funcionando
2. **Performance**: Índices criados para otimizar consultas
3. **Limites**: Máximo de 10 arquivos por documento
4. **Validação**: Mantidos os tipos de arquivo permitidos (PDF, DOCX)
5. **Auditoria**: Logs mantidos para todos os downloads

## 🧪 Testando a Funcionalidade

1. Acesse o sistema como supervisor
2. Vá para "Enviar Documento"
3. Selecione múltiplos arquivos (PDF ou DOCX)
4. Preencha título e descrição
5. Envie o documento
6. Verifique se todos os arquivos foram processados

## 📝 Próximos Passos Sugeridos

- [ ] Implementar preview de arquivos
- [ ] Adicionar compressão de imagens
- [ ] Implementar progress bar para uploads grandes
- [ ] Adicionar validação de tamanho total
- [ ] Implementar upload em lote com ZIP
