# 🚀 GUIA COMPLETO: Git + Deploy Automático

## 📋 **VISÃO GERAL**

Este guia configura um fluxo completo de desenvolvimento com Git e deploy automático:

1. **Desenvolvimento Local** → 2. **Git Push** → 3. **Deploy Automático** → 4. **Sistema Atualizado**

## 🔧 **CONFIGURAÇÃO INICIAL**

### **1. Configurar Git Local**

```bash
# Inicializar repositório (já feito)
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "Initial commit: Sistema de Assinaturas"

# Adicionar repositório remoto (GitHub/GitLab)
git remote add origin https://github.com/seu-usuario/sistema-assinaturas.git

# Push inicial
git push -u origin main
```

### **2. Configurar Servidor**

```bash
# No servidor, instalar dependências do webhook
npm install express

# Tornar scripts executáveis
chmod +x deploy-git.sh
chmod +x webhook-deploy.js

# Iniciar webhook
node webhook-deploy.js
```

## 🔄 **FLUXO DE DESENVOLVIMENTO**

### **No Seu Computador:**

```bash
# 1. Desenvolver normalmente
cd "C:\Nota Fiscais\Nota Fiscais"
npm run dev

# 2. Fazer mudanças no código
# 3. Testar localmente
# 4. Commit das mudanças
git add .
git commit -m "Nova funcionalidade: [descrição]"

# 5. Push para o repositório
git push origin main
```

### **No Servidor (Automático):**

```bash
# O webhook recebe o push e executa automaticamente:
# 1. Para serviços
# 2. Puxa código atualizado
# 3. Instala dependências
# 4. Reinicia serviços
# 5. Verifica saúde do sistema
```

## 🛠️ **CONFIGURAÇÃO DETALHADA**

### **1. Configurar Webhook no GitHub**

1. Vá para o repositório no GitHub
2. Settings → Webhooks → Add webhook
3. Configure:
   - **Payload URL**: `http://seu-servidor:3001/webhook`
   - **Content type**: `application/json`
   - **Secret**: `sua-chave-secreta-webhook`
   - **Events**: `Just the push event`

### **2. Configurar Webhook no GitLab**

1. Vá para o projeto no GitLab
2. Settings → Webhooks
3. Configure:
   - **URL**: `http://seu-servidor:3001/webhook`
   - **Secret Token**: `sua-chave-secreta-webhook`
   - **Triggers**: `Push events`

### **3. Configurar Variáveis de Ambiente**

```bash
# No servidor, criar arquivo .env para webhook
echo "WEBHOOK_SECRET=sua-chave-secreta-webhook" > .env
```

## 📊 **MONITORAMENTO**

### **Verificar Status do Webhook:**
```bash
curl http://localhost:3001/status
```

### **Ver Logs do Deploy:**
```bash
curl http://localhost:3001/logs
```

### **Deploy Manual:**
```bash
curl -X POST http://localhost:3001/deploy \
  -H "Content-Type: application/json" \
  -d '{"branch": "main"}'
```

### **Verificar Status dos Serviços:**
```bash
# Status PM2
pm2 status

# Status Docker
docker-compose ps

# Logs da aplicação
pm2 logs sistema-assinaturas
```

## 🔒 **SEGURANÇA**

### **Proteção de Senhas:**
- ✅ Arquivo `.env` está no `.gitignore`
- ✅ Senhas não vão para o Git
- ✅ Cada ambiente tem suas próprias senhas

### **Webhook Seguro:**
- ✅ Verificação de assinatura
- ✅ Apenas branch main/master
- ✅ Logs de auditoria

## 🚨 **TROUBLESHOOTING**

### **Webhook não funciona:**
```bash
# Verificar se está rodando
ps aux | grep webhook

# Verificar logs
tail -f deploy.log

# Testar manualmente
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "head_commit": {"id": "test"}}'
```

### **Deploy falha:**
```bash
# Verificar logs do deploy
bash deploy-git.sh status

# Fazer rollback
bash deploy-git.sh rollback

# Verificar backup
ls -la /var/backups/sistema-assinaturas/
```

### **Serviços não iniciam:**
```bash
# Verificar Docker
docker-compose ps
docker-compose logs postgres

# Verificar PM2
pm2 status
pm2 logs sistema-assinaturas

# Reiniciar tudo
bash deploy-git.sh deploy
```

## 📈 **COMANDOS ÚTEIS**

### **Desenvolvimento Local:**
```bash
# Ver status do Git
git status

# Ver histórico
git log --oneline

# Ver diferenças
git diff

# Fazer backup local
git stash
```

### **No Servidor:**
```bash
# Deploy manual
bash deploy-git.sh deploy

# Rollback
bash deploy-git.sh rollback

# Backup manual
bash deploy-git.sh backup

# Status dos serviços
bash deploy-git.sh status
```

## 🔄 **FLUXO COMPLETO**

### **Cenário: Adicionar nova funcionalidade**

1. **Desenvolvimento:**
   ```bash
   # No seu PC
   git checkout -b feature/nova-funcionalidade
   # Desenvolver...
   git add .
   git commit -m "Adiciona nova funcionalidade"
   git push origin feature/nova-funcionalidade
   ```

2. **Merge:**
   ```bash
   # No GitHub/GitLab, fazer merge para main
   # Ou localmente:
   git checkout main
   git merge feature/nova-funcionalidade
   git push origin main
   ```

3. **Deploy Automático:**
   - Webhook detecta push na main
   - Executa deploy automaticamente
   - Sistema atualizado em produção

4. **Verificação:**
   ```bash
   # Verificar se funcionou
   curl http://localhost:5000/api/health
   curl http://localhost:3000
   ```

## 🎯 **VANTAGENS DESTE FLUXO**

### **✅ Para Desenvolvimento:**
- Desenvolve normalmente no seu PC
- Testa localmente antes de subir
- Histórico completo no Git
- Branches para features

### **✅ Para Produção:**
- Deploy automático e confiável
- Backup automático antes de cada deploy
- Rollback fácil se algo der errado
- Monitoramento e logs

### **✅ Para Equipe:**
- Código centralizado no Git
- Deploy padronizado
- Histórico de mudanças
- Colaboração facilitada

## 🚀 **PRÓXIMOS PASSOS**

1. **Configurar repositório remoto**
2. **Fazer primeiro push**
3. **Configurar webhook no servidor**
4. **Testar deploy automático**
5. **Configurar monitoramento**

---

**🎉 Com este fluxo, você tem um sistema profissional de desenvolvimento e deploy!**










