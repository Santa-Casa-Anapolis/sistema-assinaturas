# 📋 RESUMO DAS CORREÇÕES - FLUXO DE ASSINATURAS

## 🎯 OBJETIVO

Garantir que as assinaturas sejam persistentes após deploy, melhorar o cache do navegador e corrigir problemas de 404 ao visualizar PDFs assinados.

## ✅ ANÁLISE DOS 3 PONTOS

### 1. ✅ Persistência de Assinaturas - CORRETO

**Status:** ✅ JÁ CONFIGURADO CORRETAMENTE

- **Bind mount:** `/var/lib/sistema-assinaturas/uploads:/app/uploads` (docker-compose.yml, linha 41)
- **Placement constraint:** `node.hostname == servdocker` (docker-compose.yml, linhas 44-46)
- **Cenários:**
  - **Deploy:** Arquivos persistem no host
  - **Reinício de container:** Dados preservados
  - **Multi-nó:** Constraint mantém execução no mesmo nó

**⚠️ AÇÃO NECESSÁRIA NO SERVIDOR:**

Antes do deploy, criar o diretório com permissões corretas:

```bash
sudo mkdir -p /var/lib/sistema-assinaturas/uploads
sudo chown -R 1000:1000 /var/lib/sistema-assinaturas/uploads  # UID do container
sudo chmod -R 755 /var/lib/sistema-assinaturas/uploads
```

### 2. ✅ Cache do Navegador - JÁ OTIMIZADO

**Status:** ✅ JÁ CONFIGURADO CORRETAMENTE

- **Assets estáticos:** Cache de 1 ano (Dockerfile, linha 49)
- **index.html:** Sem cache (Dockerfile, linhas 54-57)
- **React Scripts:** Gera hashes automáticos nos arquivos (main.abc123.js)
- **Service Workers:** ❌ Não existem no projeto

**⚠️ RECOMENDAÇÃO ADICIONAL (OPCIONAL):**

Se quiser forçar rebuild após deploy, adicionar versionamento por data no `client/package.json`:

```json
{
  "name": "nota-fiscais-client",
  "version": "1.0.0",
  "description": "Sistema de Assinaturas - Build $(date +%Y%m%d)"
}
```

Mas **NÃO é necessário** - o hash dos arquivos já resolve o problema.

### 3. 🔧 Problema de 404 em PDF Assinado - CORRIGIDO

**Status:** ✅ CORRIGIDO

**Problema identificado:** 
O código usava `path.join(__dirname, 'uploads')` em 24 locais diferentes, ignorando a variável de ambiente `UPLOAD_DIR`. Em containers Docker, `__dirname` aponta para `/app`, mas os arquivos devem ser salvos em `/app/uploads` conforme definido no `docker-compose.yml`.

**Correções aplicadas:**
- ✅ Substituídas **todas as 24 ocorrências** de `path.join(__dirname, 'uploads')` por `path.join(UPLOAD_DIR)`
- ✅ Rotas afetadas:
  - Upload de PDF assinado (`/api/documents/:id/upload-signed`)
  - Download de documentos (`/api/documents/:id/download`)
  - Download de arquivos (`/api/documents/:id/files/:fileId/download`)
  - Visualização de documentos (`/api/documents/:id/view`)
  - Exclusão de assinaturas (`/api/users/:id/signature`)
  - Exclusão de documentos (`/api/documents/:id`)
  - Upload de assinaturas (`/api/signatures/:id/update`)
  - Criação de documentos definitivos

**Arquivo modificado:**
- `server/index.js` - 24 substituições

## 📝 IMPACTO DAS MUDANÇAS

### ✅ Benefícios

1. **Persistência garantida:** Arquivos são salvos no volume montado do host
2. **Consistência:** Todos os caminhos agora usam `UPLOAD_DIR`
3. **Compatibilidade Docker:** Funciona corretamente em containers
4. **Manutenibilidade:** Mudanças futuras em `UPLOAD_DIR` afetam todo o código

### ⚠️ Pontos de Atenção

1. **Migração de arquivos existentes:** Se houver arquivos no volume antigo, podem precisar ser movidos manualmente
2. **Permissões:** Diretório no servidor deve ter permissões corretas (veja ação necessária acima)
3. **Logs:** O código gera logs detalhados para debug

## 🚀 PRÓXIMOS PASSOS

### 1. Deploy Imediato

```bash
# No servidor, criar diretório ANTES do deploy
sudo mkdir -p /var/lib/sistema-assinaturas/uploads
sudo chown -R 1000:1000 /var/lib/sistema-assinaturas/uploads
sudo chmod -R 755 /var/lib/sistema-assinaturas/uploads

# Depois fazer commit e push (já foi feito)
git add .
git commit -m "fix: corrigir caminhos de uploads para usar UPLOAD_DIR em todas as rotas"
git push origin master

# Jenkins irá fazer deploy automático, ou executar manualmente:
docker service update --force sistema-assinaturas_backend
```

### 2. Testes Pós-Deploy

1. ✅ Upload de documento assinado
2. ✅ Visualização do PDF assinado (deve funcionar agora)
3. ✅ Download do PDF assinado
4. ✅ Upload de nova assinatura
5. ✅ Verificar logs do backend para confirmar caminhos corretos

### 3. Limpeza (Opcional)

Após confirmar que está funcionando, pode mover arquivos antigos:

```bash
# No servidor
sudo ls -la /var/lib/docker/volumes/
# Identificar volume antigo se existir
# Copiar arquivos se necessário
```

## 📊 VERIFICAÇÃO DE SUCESSO

Após o deploy, verificar logs:

```bash
docker logs sistema-assinaturas_backend 2>&1 | grep "Salvando PDF assinado"
```

Deve mostrar:
```
📁 Salvando PDF assinado: signed_1234567890_documento.pdf
📁 Caminho destino: /app/uploads/signed_1234567890_documento.pdf
✅ Arquivo movido com sucesso
```

## 🔍 ARQUIVOS MODIFICADOS

1. ✅ `server/index.js` - 24 correções de caminhos
2. ✅ `docker-compose.yml` - Bind mount e constraint já estavam corretos
3. ✅ `client/Dockerfile` - Cache já estava configurado corretamente

## ⚠️ ROLLBACK (SE NECESSÁRIO)

Se algo der errado:

```bash
# No servidor
git pull origin master
git reset --hard COMMIT_ANTERIOR
docker service update --force sistema-assinaturas_backend
```

## 📞 SUPORTE

Para problemas:
1. Verificar logs do backend
2. Verificar permissões do diretório
3. Verificar se o bind mount está correto: `docker inspect sistema-assinaturas_backend | grep Mounts`

