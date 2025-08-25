# 🐘 Configuração PostgreSQL - Sistema de Assinaturas

## 🎯 Sobre o PostgreSQL

O sistema foi migrado para usar **PostgreSQL** em vez do SQLite, oferecendo:
- ✅ Melhor performance para múltiplos usuários
- ✅ Suporte a transações ACID
- ✅ Escalabilidade para produção
- ✅ Recursos avançados de banco de dados

## 📋 Pré-requisitos

### 1. Instalar PostgreSQL

#### Windows
1. Baixe o PostgreSQL: https://www.postgresql.org/download/windows/
2. Execute o instalador
3. Configure senha do usuário `postgres`
4. Mantenha a porta padrão (5432)

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### macOS
```bash
brew install postgresql
brew services start postgresql
```

### 2. Criar Banco de Dados

```bash
# Conectar como usuário postgres
sudo -u postgres psql

# Criar banco de dados
CREATE DATABASE nota_fiscais;

# Verificar se foi criado
\l

# Sair
\q
```

## 🔧 Configuração do Sistema

### 1. Variáveis de Ambiente

O arquivo `server/.env` deve conter:

```env
# Configurações do Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nota_fiscais
DB_USER=postgres
DB_PASSWORD=sua_senha_postgres
```

### 2. Instalar Dependências

```bash
cd server
npm install
```

## 🚀 Execução

### 1. Iniciar PostgreSQL
```bash
# Windows (se instalado como serviço)
# Inicia automaticamente

# Linux
sudo systemctl start postgresql

# macOS
brew services start postgresql
```

### 2. Executar Sistema
```bash
# Windows
.\start.bat

# Linux/Mac
./start.sh
```

## 📊 Estrutura do Banco

### Tabelas Criadas Automaticamente

#### `users`
- `id` (SERIAL PRIMARY KEY)
- `name` (VARCHAR(255))
- `email` (VARCHAR(255) UNIQUE)
- `role` (VARCHAR(100))
- `password` (VARCHAR(255))
- `gov_id` (VARCHAR(255))
- `created_at` (TIMESTAMP)

#### `documents`
- `id` (SERIAL PRIMARY KEY)
- `title` (VARCHAR(255))
- `filename` (VARCHAR(255))
- `original_filename` (VARCHAR(255))
- `status` (VARCHAR(50))
- `created_by` (INTEGER REFERENCES users(id))
- `created_at` (TIMESTAMP)

#### `signature_flow`
- `id` (SERIAL PRIMARY KEY)
- `document_id` (INTEGER REFERENCES documents(id))
- `user_id` (INTEGER REFERENCES users(id))
- `order_index` (INTEGER)
- `status` (VARCHAR(50))
- `signed_at` (TIMESTAMP)
- `signature_data` (TEXT)
- `ip_address` (VARCHAR(45))
- `created_at` (TIMESTAMP)

#### `audit_log`
- `id` (SERIAL PRIMARY KEY)
- `user_id` (INTEGER REFERENCES users(id))
- `action` (VARCHAR(100))
- `document_id` (INTEGER REFERENCES documents(id))
- `details` (TEXT)
- `ip_address` (VARCHAR(45))
- `created_at` (TIMESTAMP)

## 🔍 Comandos Úteis

### Conectar ao Banco
```bash
psql -h localhost -U postgres -d nota_fiscais
```

### Verificar Tabelas
```sql
\dt
```

### Verificar Usuários
```sql
SELECT * FROM users;
```

### Verificar Documentos
```sql
SELECT * FROM documents;
```

### Backup do Banco
```bash
pg_dump -h localhost -U postgres nota_fiscais > backup.sql
```

### Restaurar Backup
```bash
psql -h localhost -U postgres nota_fiscais < backup.sql
```

## 🛠️ Troubleshooting

### Erro de Conexão
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solução**: Verificar se PostgreSQL está rodando

### Erro de Autenticação
```
Error: password authentication failed
```
**Solução**: Verificar senha no arquivo `.env`

### Erro de Banco Não Encontrado
```
Error: database "nota_fiscais" does not exist
```
**Solução**: Criar banco de dados

### Erro de Permissão
```
Error: permission denied for table
```
**Solução**: Verificar permissões do usuário

## 📈 Vantagens do PostgreSQL

### Performance
- Índices avançados
- Otimização de queries
- Pool de conexões

### Confiabilidade
- Transações ACID
- Backup automático
- Recuperação de falhas

### Escalabilidade
- Suporte a múltiplos usuários
- Particionamento
- Replicação

### Recursos Avançados
- JSON/JSONB
- Full-text search
- Triggers e procedures

## 🔄 Migração do SQLite

Se você estava usando SQLite anteriormente:

1. **Backup dos dados** (se necessário)
2. **Instalar PostgreSQL**
3. **Configurar variáveis de ambiente**
4. **Executar sistema** (tabelas são criadas automaticamente)
5. **Usuários padrão** são criados automaticamente

## 📞 Suporte

Para problemas específicos do PostgreSQL:
- Documentação oficial: https://www.postgresql.org/docs/
- Stack Overflow: https://stackoverflow.com/questions/tagged/postgresql

---

**O PostgreSQL oferece uma base sólida para o sistema de assinaturas!** 🚀
