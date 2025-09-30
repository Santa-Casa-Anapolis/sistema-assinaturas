# 🐳 Configuração Docker - Sistema de Assinaturas

## 🎯 Sobre o Docker

O sistema agora suporta **PostgreSQL rodando em Docker**, oferecendo:
- ✅ Instalação simplificada
- ✅ Isolamento de ambiente
- ✅ Configuração automática
- ✅ pgAdmin incluído para gerenciamento

## 📋 Pré-requisitos

### 1. Instalar Docker

#### Windows
1. Baixe o Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Execute o instalador
3. Reinicie o computador
4. Inicie o Docker Desktop

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
# Faça logout e login novamente
```

#### macOS
1. Baixe o Docker Desktop: https://www.docker.com/products/docker-desktop/
2. Execute o instalador
3. Inicie o Docker Desktop

## 🚀 Execução Rápida

### Windows
```bash
# Iniciar PostgreSQL
.\docker-start.bat

# Parar containers
.\docker-stop.bat
```

### Linux/Mac
```bash
# Dar permissão de execução
chmod +x docker-start.sh docker-stop.sh

# Iniciar PostgreSQL
./docker-start.sh

# Parar containers
./docker-stop.sh
```

## 🔧 Configuração Manual

### 1. Iniciar PostgreSQL
```bash
docker-compose up -d postgres
```

### 2. Verificar Status
```bash
docker-compose ps
```

### 3. Ver Logs
```bash
docker-compose logs postgres
```

### 4. Parar Containers
```bash
docker-compose down
```

## 📊 Acesso ao Banco

### PostgreSQL
- **Host**: localhost
- **Porta**: 5432
- **Banco**: nota_fiscais
- **Usuário**: postgres
- **Senha**: postgres

### pgAdmin (Interface Web)
- **URL**: http://localhost:8080
- **Email**: admin@empresa.com
- **Senha**: admin123

## 🔍 Comandos Úteis

### Conectar ao PostgreSQL
```bash
# Via Docker
docker exec -it nota_fiscais_db psql -U postgres -d nota_fiscais

# Via cliente local
psql -h localhost -U postgres -d nota_fiscais
```

### Backup do Banco
```bash
# Backup
docker exec nota_fiscais_db pg_dump -U postgres nota_fiscais > backup.sql

# Restore
docker exec -i nota_fiscais_db psql -U postgres nota_fiscais < backup.sql
```

### Verificar Tabelas
```sql
\dt
```

### Verificar Usuários
```sql
SELECT * FROM users;
```

## 🛠️ Troubleshooting

### Erro: Docker não está rodando
```
Error: Cannot connect to the Docker daemon
```
**Solução**: Inicie o Docker Desktop

### Erro: Porta já em uso
```
Error: Ports are not available
```
**Solução**: Pare outros serviços na porta 5432 ou altere a porta no `docker-compose.yml`

### Erro: Permissão negada
```
Error: permission denied
```
**Solução**: No Linux, adicione seu usuário ao grupo docker

### Erro: Container não inicia
```bash
# Verificar logs
docker-compose logs postgres

# Reiniciar container
docker-compose restart postgres
```

## 📁 Estrutura dos Arquivos

```
nota-fiscais/
├── docker-compose.yml      # Configuração dos containers
├── init.sql               # Script de inicialização do banco
├── docker-start.bat       # Script de inicialização (Windows)
├── docker-start.sh        # Script de inicialização (Linux/Mac)
├── docker-stop.bat        # Script de parada (Windows)
├── docker-stop.sh         # Script de parada (Linux/Mac)
└── DOCKER_SETUP.md        # Esta documentação
```

## 🔄 Migração de Dados

### Do SQLite para PostgreSQL
1. **Backup do SQLite**
   ```bash
   sqlite3 database.sqlite .dump > backup.sqlite
   ```

2. **Converter dados** (se necessário)
   - Use ferramentas de conversão
   - Ou recrie os dados no novo sistema

3. **Iniciar PostgreSQL**
   ```bash
   ./docker-start.sh
   ```

4. **Restaurar dados**
   ```bash
   docker exec -i nota_fiscais_db psql -U postgres nota_fiscais < backup.sql
   ```

## 📈 Vantagens do Docker

### Facilidade
- Instalação automática
- Configuração pré-definida
- Sem conflitos de versão

### Isolamento
- Ambiente isolado
- Não afeta sistema local
- Fácil remoção

### Portabilidade
- Funciona em qualquer OS
- Configuração idêntica
- Fácil deploy

### Gerenciamento
- pgAdmin incluído
- Logs centralizados
- Backup simplificado

## 🔧 Configuração Avançada

### Alterar Senha do PostgreSQL
Edite o `docker-compose.yml`:
```yaml
environment:
  POSTGRES_PASSWORD: nova_senha
```

### Alterar Porta
Edite o `docker-compose.yml`:
```yaml
ports:
  - "5433:5432"  # Porta externa:interna
```

### Adicionar Extensões
Edite o `init.sql`:
```sql
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### Configurar Backup Automático
Crie um script de backup:
```bash
#!/bin/bash
docker exec nota_fiscais_db pg_dump -U postgres nota_fiscais > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 📞 Suporte

Para problemas específicos do Docker:
- Documentação Docker: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- PostgreSQL Docker: https://hub.docker.com/_/postgres

---

**O Docker simplifica muito a configuração do PostgreSQL!** 🚀
