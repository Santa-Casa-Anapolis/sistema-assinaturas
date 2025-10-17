# 🔒 GUIA DE ISOLAMENTO - Sistema de Assinaturas

## 🎯 **OBJETIVO**

Este guia garante que o **Sistema de Assinaturas** seja instalado de forma **completamente isolada** no servidor, **sem interferir** com outros sistemas existentes.

## 🔧 **CONFIGURAÇÕES ISOLADAS**

### **📡 Portas Isoladas**

| Serviço | Porta Padrão | Porta Isolada | Motivo |
|---------|--------------|---------------|---------|
| **Frontend** | 3000 | **3001** | Evita conflito com outros React apps |
| **Backend** | 5000 | **5001** | Evita conflito com outros APIs |
| **PostgreSQL** | 5432 | **5433** | Evita conflito com outros bancos |
| **pgAdmin** | 8080 | **8081** | Evita conflito com outros painéis |
| **Webhook** | 3001 | **3002** | Evita conflito com outros webhooks |

### **📁 Diretórios Isolados**

```bash
# Sistema isolado em:
/opt/sistema-assinaturas/          # Código fonte
/opt/backups/sistema-assinaturas/  # Backups
/var/log/sistema-assinaturas/      # Logs
```

### **🐳 Docker Isolado**

```yaml
# Rede Docker isolada
networks:
  notasfiscais_network:
    driver: bridge
    name: sistema-assinaturas-net

# Volumes isolados
volumes:
  postgres_data:
    name: sistema-assinaturas-postgres
```

## 🚀 **INSTALAÇÃO ISOLADA**

### **1. Verificar Portas Livres**

```bash
# Verificar se as portas estão livres
netstat -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Se alguma porta estiver em uso, o script irá falhar
```

### **2. Executar Deploy Isolado**

```bash
# Usar o script isolado
chmod +x deploy-isolado.sh
./deploy-isolado.sh deploy
```

### **3. Verificar Isolamento**

```bash
# Verificar status
./deploy-isolado.sh status

# Verificar portas
netstat -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Verificar containers Docker
docker ps | grep notasfiscais
```

## 🔍 **VERIFICAÇÃO DE ISOLAMENTO**

### **✅ Checklist de Isolamento**

- [ ] **Portas isoladas**: 3001, 5001, 5433, 8081, 3002
- [ ] **Diretórios isolados**: `/opt/sistema-assinaturas/`
- [ ] **Docker isolado**: Rede própria `sistema-assinaturas-net`
- [ ] **PM2 isolado**: Processo `sistema-assinaturas`
- [ ] **Logs isolados**: `/var/log/sistema-assinaturas/`
- [ ] **Backups isolados**: `/opt/backups/sistema-assinaturas/`

### **🔍 Comandos de Verificação**

```bash
# Verificar processos PM2
pm2 list | grep sistema-assinaturas

# Verificar containers Docker
docker ps | grep notasfiscais

# Verificar portas em uso
ss -tuln | grep -E ":(3001|5001|5433|8081|3002) "

# Verificar rede Docker
docker network ls | grep sistema-assinaturas

# Verificar volumes Docker
docker volume ls | grep sistema-assinaturas
```

## 🛡️ **SEGURANÇA E ISOLAMENTO**

### **🔒 Isolamento de Rede**

```bash
# O sistema usa rede Docker isolada
docker network create sistema-assinaturas-net

# Containers só se comunicam entre si
docker-compose up -d
```

### **🔐 Isolamento de Dados**

```bash
# Banco de dados isolado
DB_NAME=notasfiscais_db
DB_USER=postgres
DB_PASSWORD=123456

# Uploads isolados
/opt/sistema-assinaturas/server/uploads/
```

### **📊 Isolamento de Logs**

```bash
# Logs isolados
/var/log/sistema-assinaturas/
/opt/sistema-assinaturas/deploy.log
```

## 🚨 **TROUBLESHOOTING**

### **Erro: Porta já em uso**

```bash
# Verificar qual processo está usando a porta
sudo lsof -i :3001
sudo lsof -i :5001
sudo lsof -i :5433

# Se for outro sistema, alterar porta no docker-compose.yml
```

### **Erro: Conflito de rede Docker**

```bash
# Verificar redes Docker
docker network ls

# Remover rede conflitante (se necessário)
docker network rm sistema-assinaturas-net

# Recriar rede
docker network create sistema-assinaturas-net
```

### **Erro: Conflito de volume Docker**

```bash
# Verificar volumes Docker
docker volume ls

# Remover volume conflitante (se necessário)
docker volume rm sistema-assinaturas-postgres

# Recriar volume
docker volume create sistema-assinaturas-postgres
```

## 📋 **COMANDOS DE GERENCIAMENTO**

### **🔄 Deploy e Rollback**

```bash
# Deploy isolado
./deploy-isolado.sh deploy

# Rollback isolado
./deploy-isolado.sh rollback

# Backup manual
./deploy-isolado.sh backup

# Status isolado
./deploy-isolado.sh status
```

### **🛑 Parar Sistema**

```bash
# Parar aplicação
pm2 stop sistema-assinaturas

# Parar banco de dados
cd /opt/sistema-assinaturas
docker-compose down

# Parar webhook
pkill -f webhook-deploy.js
```

### **🚀 Iniciar Sistema**

```bash
# Iniciar banco de dados
cd /opt/sistema-assinaturas
docker-compose up -d postgres

# Iniciar aplicação
pm2 start sistema-assinaturas

# Iniciar webhook
node webhook-deploy.js &
```

## 🔄 **ATUALIZAÇÃO ISOLADA**

### **1. Backup Automático**

```bash
# O script faz backup automático antes de cada deploy
/opt/backups/sistema-assinaturas/backup_YYYYMMDD_HHMMSS.tar.gz
```

### **2. Deploy Sem Interrupção**

```bash
# Deploy isolado não afeta outros sistemas
./deploy-isolado.sh deploy
```

### **3. Rollback Rápido**

```bash
# Rollback isolado em caso de problemas
./deploy-isolado.sh rollback
```

## 📊 **MONITORAMENTO ISOLADO**

### **📈 Métricas do Sistema**

```bash
# CPU e Memória
pm2 monit

# Logs da aplicação
pm2 logs sistema-assinaturas

# Logs do banco
docker-compose logs postgres

# Logs do webhook
tail -f deploy.log
```

### **🔍 Verificação de Saúde**

```bash
# Health check do backend
curl http://localhost:5001/api/health

# Health check do frontend
curl http://localhost:3001

# Health check do banco
docker exec notasfiscais_db pg_isready -U postgres
```

## 🎯 **VANTAGENS DO ISOLAMENTO**

### **✅ Para o Servidor:**
- Não interfere com outros sistemas
- Portas isoladas evitam conflitos
- Recursos isolados
- Fácil remoção se necessário

### **✅ Para o Sistema:**
- Ambiente controlado
- Configurações específicas
- Logs isolados
- Backup isolado

### **✅ Para Manutenção:**
- Deploy sem afetar outros sistemas
- Rollback rápido
- Monitoramento específico
- Troubleshooting isolado

## 🚀 **PRÓXIMOS PASSOS**

1. **Verificar portas livres** no servidor
2. **Executar deploy isolado**
3. **Verificar isolamento**
4. **Configurar monitoramento**
5. **Testar funcionalidades**

---

**🔒 Com este isolamento, o sistema funciona independentemente dos outros sistemas no servidor!**





