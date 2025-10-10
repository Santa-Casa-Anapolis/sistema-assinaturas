# Correção do Erro ao Criar Documentos

## 🔴 Erro Original
```
error: column "filename" of relation "documents" does not exist
```

## 🔍 Diagnóstico

### Problema Identificado
O código em `server/index.js` linha 1840 estava tentando inserir dados na coluna `filename` da tabela `documents`, mas essa coluna **não existe** nessa tabela.

### Estrutura da Tabela `documents` (Correta)
```sql
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,           -- ✅ Existe
  original_filename VARCHAR(255) NOT NULL,    -- ✅ Existe
  -- filename NÃO EXISTE AQUI!                -- ❌ 
  file_size INTEGER,
  mime_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  current_stage VARCHAR(50) DEFAULT 'contabilidade',
  created_by INTEGER NOT NULL,
  supervisor_id INTEGER,
  sector VARCHAR(100),
  amount DECIMAL(10,2),
  ...
)
```

### Nota Importante
A coluna `filename` **existe** na tabela `document_files`, mas **não existe** na tabela `documents`.

## ✅ Correção Aplicada

### Código Anterior (ERRADO)
```javascript
// ❌ Linha 1840 - ANTES
const result = await pool.query(`
  INSERT INTO documents (title, description, file_path, original_filename, filename, created_by, supervisor_id, sector, amount, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
  RETURNING id
`, [
  title,
  description,
  files[0].path,
  files[0].originalname,
  files[0].filename, // ❌ Coluna não existe!
  userId,
  userId,
  sector || req.user.sector,
  amount || 0
]);
```

### Código Corrigido (CORRETO)
```javascript
// ✅ Linha 1840 - DEPOIS
const result = await pool.query(`
  INSERT INTO documents (title, description, file_path, original_filename, created_by, supervisor_id, sector, amount, status)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
  RETURNING id
`, [
  title,
  description,
  files[0].filename, // ✅ Salvar o filename do multer como file_path
  files[0].originalname,
  userId,
  userId,
  sector || req.user.sector,
  amount || 0
]);
```

### Mudanças Realizadas
1. ✅ Removida a coluna `filename` do INSERT (não existe na tabela)
2. ✅ Ajustado o número de valores de 9 para 8 no VALUES
3. ✅ Alterado `files[0].path` para `files[0].filename` no `file_path`
4. ✅ Mantido `files[0].originalname` no `original_filename`

## 📝 Commit
```
a46b968 - Fix: Corrigir erro SQL na criação de documentos - remover coluna filename inexistente
```

## 🚀 Deploy

**Próximos Passos:**
1. Jenkins fará pull do código atualizado
2. Rebuild das imagens Docker (frontend + backend)
3. Deploy no Docker Swarm

**Após o deploy:**
- Sistema deve criar documentos sem erros
- Upload de documentos funcionará corretamente
- Erro 500 ao enviar documentos será resolvido

## 📊 Outros Erros Relacionados

### Erro 413 - Request Entity Too Large
**Causa:** Arquivo de assinatura muito grande
**Solução:** Usar imagens menores (< 1MB, JPG/PNG, 800x400 pixels)

### Erro 404 - Assinatura não encontrada
**Causa:** Admin precisa fazer upload das assinaturas dos usuários
**Solução:** 
1. Login como admin
2. Ir ao Painel de Administração
3. Clicar no ícone de assinatura (escudo) ao lado de cada usuário
4. Fazer upload da assinatura

## ✅ Status Final

- ✅ Erro SQL corrigido
- ✅ Código commitado e enviado ao GitHub
- ⏳ Deploy em andamento via Jenkins
- ⏳ Teste de criação de documentos pendente

---

**Data:** 2025-10-10
**Arquivo Modificado:** server/index.js (linha 1840)
**Commit:** a46b968

