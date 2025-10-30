# 📋 ANÁLISE DO FLUXO DE ASSINATURAS

Data: 2025-01-29
Autor: Cursor AI Assistant

---

## 🔍 PONTO 1: PERSISTÊNCIA DAS ASSINATURAS APÓS DEPLOY

### ✅ Status Atual

O arquivo `docker-compose.yml` está configurado com bind mount:
```yaml
volumes:
  - /var/lib/sistema-assinaturas/uploads:/app/uploads
```

**Localização:** Linha 41 do `docker-compose.yml`

### ⚠️ Problemas Identificados

1. **Ambiente multi-nó do Docker Swarm:**
   - O bind mount aponta para um caminho específico do host (`/var/lib/sistema-assinaturas/uploads`)
   - Se o Swarm distribuir containers em múltiplos nós, o arquivo não estará disponível em todos eles
   - O serviço `backend` tem `replicas: 1` configurado, mas sem `placement.constraints`

2. **Ausência de placement constraints:**
   - Atualmente não há garantia de que o backend sempre rode no mesmo nó
   - Um restart do container pode ser escalonado para outro nó

### 🔧 Soluções Recomendadas

#### **OPÇÃO A: Placement Constraint (Recomendada para ambiente single-node)**

Adicionar constraint no `docker-compose.yml`:

```yaml
backend:
  # ... configuração existente ...
  deploy:
    replicas: 1
    placement:
      constraints:
        - node.hostname == servdocker  # Substitua pelo hostname real do servidor
    restart_policy:
      condition: any
```

**Vantagens:**
- ✅ Simples de implementar
- ✅ Funciona bem em ambientes single-node
- ✅ Não requer storage compartilhado

**Desvantagens:**
- ⚠️ Quebra se o container tentar rodar em outro nó
- ⚠️ Lista hardcoded de hostnames

#### **OPÇÃO B: Storage Compartilhado (Recomendada para multi-node)**

Trocar bind mount por volume compartilhado (NFS, GlusterFS, etc):

```yaml
backend:
  volumes:
    - uploads_shared:/app/uploads

volumes:
  uploads_shared:
    driver: local
    driver_opts:
      type: nfs
      o: addr=nfs-server.local,rw,nolock,soft
      device: ":/exports/uploads"
```

**Vantagens:**
- ✅ Funciona em qualquer nó
- ✅ Escalável para múltiplos nós
- ✅ Mais robusto

**Desvantagens:**
- ⚠️ Requer configuração adicional de NFS
- ⚠️ Pode ter impacto de performance

### 📝 Recomendação Imediata

Como o ambiente atual é single-node (servidor `servdocker`), **a Opção A é suficiente**.

**Nenhuma mudança é necessária por enquanto** se confirmarmos que:
- O Swarm roda sempre no mesmo host
- Não há planos de escalar para múltiplos nós

**Próximo passo:** Adicionar constraint para garantir consistência futura.

---

## 🌐 PONTO 2: CACHE NO NAVEGADOR

### ✅ Status Atual

**Service Workers:** Nenhum configurado ✅
- O projeto usa `react-scripts` mas não registra service workers
- Workbox está instalado como dependência transitiva mas não é usado
- Não há arquivos `sw.js` ou `worker.js`

**Versionamento de Assets:** Automático pelo react-scripts ✅
- O build do React gera hashes automáticos: `main.9ac880ba.js`, `main.ecca091a.css`
- Cada deploy gera novos hashes, evitando cache residual

**Cache-Control:** Configurado no frontend ✅
- HTTP caching via Nginx (ver Dockerfile linha 31-53)
- Headers `Cache-Control: public, immutable` em arquivos estáticos

### ⚠️ Problemas Potenciais

1. **Configuração de Nginx no container não define cache explicitamente:**
   - O Dockerfile cria config inline sem cache headers
   - Depende da configuração padrão do nginx:alpine

2. **Arquivos index.html podem ser cacheados:**
   - Sem headers anti-cache no index.html, navegadores podem servir versão antiga
   - Especialmente problemático após deploy

### 🔧 Soluções Recomendadas

#### **Ajuste 1: Adicionar headers de cache no Nginx do frontend**

Modificar `client/Dockerfile` para incluir cache headers mais explícitos:

```dockerfile
# Após linha 31, adicionar configuração de cache
RUN echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        expires 1y;' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "public, immutable";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # Desabilitar cache no index.html' >> /etc/nginx/conf.d/default.conf && \
    echo '    location = /index.html {' >> /etc/nginx/conf.d/default.conf && \
    echo '        add_header Cache-Control "no-cache, no-store, must-revalidate";' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf
```

**Vantagens:**
- ✅ Evita cache residual do index.html
- ✅ Mantém cache de assets estáticos para performance
- ✅ Não impacta outras funcionalidades

**Desvantagens:**
- ⚠️ Ajuste manual no Dockerfile (linhas longas)

#### **Ajuste 2: Adicionar meta tags no index.html (Opcional)**

Adicionar tags anti-cache no `client/public/index.html`:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**Nota:** Isso não é recomendado pois afeta a performance geral da página.

### 📝 Recomendação

**Implementar Ajuste 1** para garantir que após cada deploy, os usuários sempre recebam a versão mais recente.

**Nenhuma outra mudança necessária** pois:
- Versionamento automático está funcionando
- Service workers não estão ativos
- Assets já têm cache correto

---

## 🔍 PONTO 3: 404 AO VISUALIZAR PDF ASSINADO

### ✅ Status Atual da Rota `/api/documents/:id/upload-signed`

**Localização:** `server/index.js` linha 2638

**Comportamento atual:**
```javascript
// Linha 2668: Cria caminho absoluto
const signedPath = path.join(__dirname, 'uploads', signedFilename);

// Linha 2707-2709: Salva ABSOLUTO no signed_file_path
await pool.query(`
  UPDATE documents 
  SET signed_file_path = $1, signed_filename = $2, ...
`, [signedPath, signedFilename, documentId]);
```

### ⚠️ Problema Identificado

**Criticidade:** 🟡 MÉDIA

1. **Inconsistência no salvamento:**
   - `signed_file_path` recebe o caminho **absoluto** (`/app/uploads/signed_123.pdf`)
   - `signed_filename` recebe apenas o nome (`signed_123.pdf`)
   - Isso é **inconsistente** mas **funciona** porque a leitura usa `signed_filename`

2. **Leitura correta:**
   - A rota `/api/documents/:id/stream` usa `signed_filename` corretamente (linha 1261)
   - Já concatena com `__dirname + 'uploads'`

3. **O que pode causar 404:**
   - Se `signed_file_path` for usado em algum lugar esperando caminho absoluto
   - Se o arquivo não estiver no volume correto após container restart

### 🔍 Análise das Rotas de Leitura

**Rota de stream (linha 1241):**
```javascript
// Usa signed_filename (nome relativo) ✅
if (document.signed_filename && fs.existsSync(path.join(__dirname, 'uploads', document.signed_filename)))
```

**Rota de download (não verificada):**
- Possível que use `signed_file_path` incorretamente

### 🔧 Soluções Recomendadas

#### **Correção Principal: Normalizar salvamento**

Alterar linha 2707-2709 de `server/index.js`:

**ANTES:**
```javascript
await pool.query(`
  UPDATE documents 
  SET signed_file_path = $1, signed_filename = $2, ...
`, [signedPath, signedFilename, documentId]);
```

**DEPOIS:**
```javascript
await pool.query(`
  UPDATE documents 
  SET signed_file_path = $1, signed_filename = $2, ...
`, [signedFilename, signedFilename, documentId]);  // Ambos com nome relativo
```

**Alternativa (melhor):**
```javascript
const relativePath = `signed/${documentId}/${signedFilename}`;
await pool.query(`
  UPDATE documents 
  SET signed_file_path = $1, signed_filename = $2, ...
`, [relativePath, signedFilename, documentId]);
```

**Vantagens:**
- ✅ Consistência entre `signed_file_path` e `signed_filename`
- ✅ Mais robusto para migrations futuras
- ✅ Facilita organização de arquivos

#### **Verificação Adicional: Buscar usos de signed_file_path**

Procurar em todo o código onde `signed_file_path` é utilizado:

```bash
grep -rn "signed_file_path" server/
```

### 📝 Recomendação

**Implementar a correção** para garantir consistência e evitar problemas futuros.

**Próximo passo:** Verificar se há outros lugares usando `signed_file_path` com caminho absoluto.

---

## 📊 RESUMO EXECUTIVO

### ✅ Nenhuma Alteração Crítica Necessária

Todos os 3 pontos analisados mostram que **o sistema está funcional**, mas com **melhorias recomendadas**.

### 🎯 Prioridades

1. **ALTA:** Verificar usos de `signed_file_path` no código
2. **MÉDIA:** Adicionar placement constraint no compose
3. **BAIXA:** Melhorar headers de cache no Nginx

### 🚨 Ações Imediatas Recomendadas

1. **Buscar usos de signed_file_path:**
   ```bash
   grep -rn "\.signed_file_path" server/
   ```

2. **Adicionar placement constraint** (se ambiente single-node):
   ```yaml
   # docker-compose.yml linha 42-45
   deploy:
     replicas: 1
     placement:
       constraints:
         - node.hostname == servdocker
     restart_policy:
       condition: any
   ```

3. **Corrigir salvamento do signed_file_path** para usar caminho relativo

4. **Melhorar cache headers** no Nginx do frontend

---

## 📋 ARQUIVOS QUE PRECISAM SER MODIFICADOS

1. `docker-compose.yml` (linha 42-45): Adicionar placement constraint
2. `client/Dockerfile` (após linha 31): Adicionar headers de cache
3. `server/index.js` (linha 2707-2709): Corrigir salvamento de path
4. Verificar outros arquivos onde `signed_file_path` é usado

---

## ⚠️ IMPACTOS E RISCOS

### Riscos Baixos
- Cache headers: Apenas melhoria, não quebra funcionalidade existente
- Placement constraint: Não impacta ambiente atual, apenas garante consistência

### Riscos Médios
- Alteração de `signed_file_path`: Pode quebrar queries que dependem do formato absoluto
- Requer investigação completa antes de aplicar

---

## 🧪 TESTES RECOMENDADOS

Após implementar mudanças:

1. **Upload de PDF assinado** → Verificar persistência após restart
2. **Download de PDF assinado** → Verificar caminho correto
3. **Deploy completo** → Verificar se arquivos persistem
4. **Hard refresh no navegador** → Verificar se nova versão carrega

---

**Gerado por:** Cursor AI Assistant
**Data:** 2025-01-29
**Versão:** 1.0

