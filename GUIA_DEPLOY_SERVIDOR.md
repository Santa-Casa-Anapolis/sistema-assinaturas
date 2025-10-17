# 🚀 GUIA COMPLETO DE DEPLOY NO SERVIDOR

## 📋 **OPÇÕES DE DEPLOY**

### **🎯 OPÇÃO 1: Deploy Automatizado (Recomendada)**

#### **Linux/Ubuntu:**
```bash
# 1. Upload do arquivo para o servidor
scp sistema-assinaturas-completo.zip usuario@servidor:/home/usuario/

# 2. No servidor, executar o script automatizado
chmod +x deploy-servidor.sh
./deploy-servidor.sh
```

#### **Windows Server:**
```cmd
# 1. Copiar arquivos para o servidor
# 2. Executar o script automatizado
deploy-servidor.bat
```

### **🔧 OPÇÃO 2: Deploy Manual**

#### **1. Preparar o Servidor**
```bash
# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### **2. Extrair e Configurar**
```bash
# Extrair arquivos
unzip sistema-assinaturas-completo.zip
cd temp-sistema

# Instalar dependências
npm run install-all

# Iniciar PostgreSQL
docker-compose up -d postgres

# Aguardar inicialização
sleep 10

# Configurar .env
cp server/.env.example server/.env
# Editar as configurações conforme necessário
```

#### **3. Executar o Sistema**
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 🐳 **CONFIGURAÇÃO DOCKER**

### **Iniciar Apenas PostgreSQL:**
```bash
docker-compose up -d postgres
```

### **Iniciar PostgreSQL + pgAdmin:**
```bash
docker-compose up -d
```

### **Verificar Status:**
```bash
docker-compose ps
```

### **Ver Logs:**
```bash
docker-compose logs postgres
```

### **Parar Serviços:**
```bash
docker-compose down
```

## 🔧 **CONFIGURAÇÃO DO .ENV**

Crie o arquivo `server/.env` com as seguintes configurações:

```env
# Configurações do servidor
PORT=5000
JWT_SECRET=sua-chave-secreta-super-segura

# Configurações do PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=notasfiscais_db
DB_USER=postgres
DB_PASSWORD=123456

# Configurações de e-mail (opcional)
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-app-gmail
```

## 🌐 **ACESSO AO SISTEMA**

Após o deploy, o sistema estará disponível em:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **pgAdmin**: http://localhost:8080

### **Usuários de Teste:**
| Papel | E-mail | Senha |
|-------|--------|-------|
| Fornecedor | fornecedor@empresa.com | 123456 |
| Supervisor Setor A | supervisor.setora@empresa.com | 123456 |
| Supervisor Setor B | supervisor.setorb@empresa.com | 123456 |
| Contabilidade | contabilidade@empresa.com | 123456 |
| Financeiro | financeiro@empresa.com | 123456 |
| Diretoria | diretoria@empresa.com | 123456 |

## 🔒 **CONFIGURAÇÃO DE PRODUÇÃO**

### **1. Configurar Proxy Reverso (Nginx)**
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### **2. Configurar SSL (Let's Encrypt)**
```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seu-dominio.com
```

### **3. Configurar PM2 (Process Manager)**
```bash
# Instalar PM2
npm install -g pm2

# Configurar PM2
pm2 start server/index.js --name "sistema-assinaturas"
pm2 startup
pm2 save
```

## 📊 **MONITORAMENTO**

### **Verificar Status dos Serviços:**
```bash
# Docker
docker-compose ps

# PM2
pm2 status

# Logs
pm2 logs sistema-assinaturas
docker-compose logs postgres
```

### **Backup do Banco:**
```bash
# Backup
docker exec notasfiscais_db pg_dump -U postgres notasfiscais_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker exec -i notasfiscais_db psql -U postgres notasfiscais_db < backup.sql
```

## 🛠️ **TROUBLESHOOTING**

### **Erro: Porta já em uso**
```bash
# Verificar processos na porta
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5000

# Matar processo
sudo kill -9 PID_DO_PROCESSO
```

### **Erro: Docker não inicia**
```bash
# Reiniciar Docker
sudo systemctl restart docker

# Verificar logs
sudo journalctl -u docker.service
```

### **Erro: Banco não conecta**
```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Ver logs do PostgreSQL
docker-compose logs postgres

# Testar conexão
docker exec -it notasfiscais_db psql -U postgres -d notasfiscais_db
```

### **Erro: Dependências não instalam**
```bash
# Limpar cache do npm
npm cache clean --force

# Deletar node_modules e reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 🔄 **ATUALIZAÇÃO DO SISTEMA**

### **1. Backup dos Dados**
```bash
# Backup do banco
docker exec notasfiscais_db pg_dump -U postgres notasfiscais_db > backup_antes_atualizacao.sql

# Backup dos uploads
tar -czf uploads_backup.tar.gz server/uploads/
```

### **2. Atualizar Código**
```bash
# Parar sistema
pm2 stop sistema-assinaturas
docker-compose down

# Extrair nova versão
unzip sistema-assinaturas-nova-versao.zip
cd temp-sistema

# Instalar dependências
npm run install-all

# Iniciar sistema
docker-compose up -d postgres
npm run dev
```

## 📞 **SUPORTE**

Para problemas específicos:
- Verificar logs: `docker-compose logs postgres`
- Verificar status: `docker-compose ps`
- Testar conexão: `curl http://localhost:5000/api/health`

---

**🎉 Com este guia, você consegue fazer o deploy completo do sistema no servidor!**






