# 🚀 MANUAL COMPLETO - Deploy Sistema de Assinaturas via GitHub

## 📋 **VISÃO GERAL**

Este manual guia você através do processo completo de deploy do Sistema de Assinaturas usando GitHub + Deploy automático, garantindo **isolamento total** e **segurança máxima**.

---

## 🔧 **PARTE 1: PREPARAÇÃO NO SEU PC**

### **1.1 Verificar Arquivos**
```bash
# Verificar se está no diretório correto
cd "C:\Nota Fiscais\temp-sistema"

# Verificar se o Git está configurado
git status
```

### **1.2 Verificar Proteção de Senhas**
```bash
# Verificar se .env está no .gitignore
cat .gitignore | grep -E "\.env|uploads"

# Deve aparecer:
# .env
# server/uploads/
```

---

## 🏥 **PARTE 2: CRIAR REPOSITÓRIO NO GITHUB**

### **2.1 Acessar Organização**
1. **Acesse:** https://github.com/Santa-Casa-Anapolis
2. **Faça login** na sua conta
3. **Clique:** "New repository"

### **2.2 Configurar Repositório**
- **Repository name:** `sistema-assinaturas`
- **Description:** `Sistema de Assinaturas Digitais para Notas Fiscais - Santa Casa Anápolis`
- **Visibility:** ✅ **Private** (CRÍTICO!)
- **NÃO marque:** Add README, .gitignore, license
- **Clique:** "Create repository"

### **2.3 Copiar URL do Repositório**
Anote a URL que aparece: `https://github.com/Santa-Casa-Anapolis/sistema-assinaturas.git`

---

## 💻 **PARTE 3: ENVIAR CÓDIGO PARA GITHUB**

### **3.1 Conectar Repositório Remoto**
```bash
# No seu PC, no diretório temp-sistema
git remote add origin https://github.com/Santa-Casa-Anapolis/sistema-assinaturas.git
```

### **3.2 Fazer Push**
```bash
# Enviar código para o GitHub
git push -u origin main
```

### **3.3 Autenticação (se necessário)**
Se pedir credenciais:
- **Username:** Seu usuário do GitHub
- **Password:** Use **Personal Access Token**

**Para criar token:**
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Selecione: `repo` (acesso completo)
4. Copie o token e use como senha

### **3.4 Verificar Upload**
Acesse: https://github.com/Santa-Casa-Anapolis/sistema-assinaturas
**Deve aparecer todos os arquivos do sistema!**

---

## 🖥️ **PARTE 4: CONFIGURAR SERVIDOR**

### **4.1 Conectar ao Servidor**
```bash
# Conectar via SSH
ssh usuario@ip-do-servidor

# Ou acessar terminal do servidor diretamente
```

### **4.2 Verificar Pré-requisitos**
```bash
# Verificar Node.js
node --version

# Verificar Docker
docker --version

# Verificar Git
git --version
```

### **4.3 Instalar Dependências (se necessário)**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm docker.io docker-compose git

# CentOS/RHEL
sudo yum install -y nodejs npm docker docker-compose git
```

---

## 🚀 **PARTE 5: DEPLOY NO SERVIDOR**

### **5.1 Clonar Repositório**
```bash
# Criar diretório para o sistema
sudo mkdir -p /opt/sistema-assinaturas
sudo chown -R $USER:$USER /opt/sistema-assinaturas

# Clonar repositório
cd /opt
git clone https://github.com/Santa-Casa-Anapolis/sistema-assinaturas.git
cd sistema-assinaturas
```

### **5.2 Verificar Portas Livres**
```bash
# Verificar se as portas estão livres
netstat -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Se alguma porta estiver em uso, o deploy falhará
```

### **5.3 Executar Deploy Isolado**
```bash
# Tornar script executável
chmod +x deploy-isolado.sh

# Executar deploy
./deploy-isolado.sh deploy
```

### **5.4 Configurar Senhas**
```bash
# Editar arquivo de configuração
nano server/.env

# Configurar com senhas reais:
# DB_PASSWORD=sua-senha-segura-do-banco
# JWT_SECRET=sua-chave-jwt-super-secreta
# LDAP_BIND_PASSWORD=sua-senha-ldap-real
```

---

## 🔄 **PARTE 6: CONFIGURAR DEPLOY AUTOMÁTICO**

### **6.1 Instalar Webhook**
```bash
# Instalar dependências do webhook
npm install express

# Iniciar webhook
node webhook-deploy.js &
```

### **6.2 Configurar Webhook no GitHub**
1. **Acesse:** https://github.com/Santa-Casa-Anapolis/sistema-assinaturas/settings/hooks
2. **Clique:** "Add webhook"
3. **Configure:**
   - **Payload URL:** `http://seu-servidor:3002/webhook`
   - **Content type:** `application/json`
   - **Secret:** `sua-chave-secreta-webhook`
   - **Events:** "Just the push event"
4. **Clique:** "Add webhook"

### **6.3 Testar Deploy Automático**
```bash
# No seu PC, fazer uma mudança pequena
echo "# Teste" >> README.md
git add README.md
git commit -m "Teste deploy automático"
git push origin main

# Verificar se o servidor atualizou automaticamente
```

---

## 🔍 **PARTE 7: VERIFICAÇÃO E TESTES**

### **7.1 Verificar Status dos Serviços**
```bash
# Status do sistema
./deploy-isolado.sh status

# Status PM2
pm2 status

# Status Docker
docker-compose ps
```

### **7.2 Testar Acesso**
```bash
# Testar backend
curl http://localhost:5001/api/health

# Testar frontend
curl http://localhost:3001

# Testar pgAdmin
curl http://localhost:8081
```

### **7.3 Acessar Sistema**
- **Frontend:** http://seu-servidor:3001
- **Backend:** http://seu-servidor:5001
- **pgAdmin:** http://seu-servidor:8081

### **7.4 Usuários de Teste**
| Papel | E-mail | Senha |
|-------|--------|-------|
| Fornecedor | fornecedor@empresa.com | 123456 |
| Supervisor | supervisor.setora@empresa.com | 123456 |
| Contabilidade | contabilidade@empresa.com | 123456 |
| Financeiro | financeiro@empresa.com | 123456 |
| Diretoria | diretoria@empresa.com | 123456 |

---

## 🛡️ **PARTE 8: SEGURANÇA E ISOLAMENTO**

### **8.1 Verificar Isolamento**
```bash
# Verificar portas isoladas
netstat -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Verificar rede Docker isolada
docker network ls | grep sistema-assinaturas

# Verificar volumes isolados
docker volume ls | grep sistema-assinaturas
```

### **8.2 Verificar Proteção de Senhas**
```bash
# Verificar se .env não está no Git
git status | grep .env

# Deve estar vazio (arquivo ignorado)
```

### **8.3 Backup Automático**
```bash
# Verificar backups
ls -la /opt/backups/sistema-assinaturas/

# Backup manual
./deploy-isolado.sh backup
```

---

## 🚨 **PARTE 9: TROUBLESHOOTING**

### **9.1 Problemas Comuns**

#### **Erro: Porta já em uso**
```bash
# Verificar qual processo está usando
sudo lsof -i :3001
sudo lsof -i :5001

# Matar processo se necessário
sudo kill -9 PID_DO_PROCESSO
```

#### **Erro: Docker não inicia**
```bash
# Reiniciar Docker
sudo systemctl restart docker

# Verificar logs
sudo journalctl -u docker.service
```

#### **Erro: Banco não conecta**
```bash
# Verificar PostgreSQL
docker-compose ps
docker-compose logs postgres

# Testar conexão
docker exec -it notasfiscais_db psql -U postgres -d notasfiscais_db
```

#### **Erro: Webhook não funciona**
```bash
# Verificar se está rodando
ps aux | grep webhook

# Verificar logs
tail -f deploy.log

# Testar manualmente
curl -X POST http://localhost:3002/webhook \
  -H "Content-Type: application/json" \
  -d '{"ref": "refs/heads/main", "head_commit": {"id": "test"}}'
```

### **9.2 Comandos de Recuperação**

#### **Rollback Rápido**
```bash
# Voltar para versão anterior
./deploy-isolado.sh rollback
```

#### **Reiniciar Sistema**
```bash
# Parar tudo
pm2 stop sistema-assinaturas
docker-compose down

# Iniciar novamente
./deploy-isolado.sh deploy
```

#### **Logs de Debug**
```bash
# Logs da aplicação
pm2 logs sistema-assinaturas

# Logs do banco
docker-compose logs postgres

# Logs do webhook
tail -f deploy.log
```

---

## 📊 **PARTE 10: MONITORAMENTO**

### **10.1 Comandos de Monitoramento**
```bash
# Status geral
./deploy-isolado.sh status

# Monitoramento em tempo real
pm2 monit

# Logs em tempo real
pm2 logs sistema-assinaturas --lines 100
```

### **10.2 Verificação de Saúde**
```bash
# Health check automático
curl -f http://localhost:5001/api/health && echo "Backend OK" || echo "Backend ERRO"
curl -f http://localhost:3001 && echo "Frontend OK" || echo "Frontend ERRO"
```

### **10.3 Backup Automático**
```bash
# Agendar backup diário (crontab)
crontab -e

# Adicionar linha:
0 2 * * * /opt/sistema-assinaturas/deploy-isolado.sh backup
```

---

## 🎯 **PARTE 11: FLUXO DE DESENVOLVIMENTO**

### **11.1 Desenvolvimento Local**
```bash
# No seu PC
cd "C:\Nota Fiscais\Nota Fiscais"
npm run dev

# Fazer mudanças no código
# Testar localmente
```

### **11.2 Deploy para Produção**
```bash
# Commit das mudanças
git add .
git commit -m "Nova funcionalidade: [descrição]"

# Push (deploy automático)
git push origin main
```

### **11.3 Verificar Deploy**
```bash
# No servidor, verificar se atualizou
cd /opt/sistema-assinaturas
git log --oneline -5

# Verificar se serviços reiniciaram
pm2 status
```

---

## ✅ **CHECKLIST FINAL**

### **Antes de Considerar Concluído:**
- [ ] Repositório criado no GitHub (PRIVADO)
- [ ] Código enviado para GitHub
- [ ] Servidor configurado
- [ ] Deploy isolado executado
- [ ] Senhas configuradas no servidor
- [ ] Webhook configurado
- [ ] Deploy automático testado
- [ ] Sistema acessível via browser
- [ ] Usuários de teste funcionando
- [ ] Backup automático funcionando
- [ ] Monitoramento configurado

---

## 📞 **SUPORTE**

### **Em Caso de Problemas:**
1. **Verificar logs:** `pm2 logs sistema-assinaturas`
2. **Verificar status:** `./deploy-isolado.sh status`
3. **Rollback:** `./deploy-isolado.sh rollback`
4. **Reiniciar:** `./deploy-isolado.sh deploy`

### **Comandos de Emergência:**
```bash
# Parar tudo
pm2 stop sistema-assinaturas
docker-compose down

# Verificar portas
netstat -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Verificar processos
ps aux | grep -E "(node|docker|postgres)"
```

---

**🎉 Com este manual, você tem um sistema profissional de deploy automático e isolado!**

**Desenvolvido para Santa Casa de Anápolis** 🏥
