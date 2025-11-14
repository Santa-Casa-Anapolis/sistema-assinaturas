# 📋 Guia: Configuração de Usuários de Teste no Deploy

Este guia explica como configurar os usuários de teste e suas assinaturas após o deploy.

---

## 🎯 Objetivo

Criar automaticamente os usuários de teste e suas assinaturas em todos os ambientes (desenvolvimento, Jenkins, produção).

---

## 📁 Arquivos Criados

1. **`scripts/setup-test-users.sql`** - Script SQL para criar usuários e assinaturas no banco
2. **`scripts/setup-test-signatures.js`** - Script Node.js para criar arquivos físicos de assinatura
3. **`scripts/setup-test-data.sh`** - Script bash para automatizar tudo (Linux/Mac)
4. **`scripts/setup-test-data.bat`** - Script batch para automatizar tudo (Windows)

---

## 🚀 Como Usar

### Opção 1: Automático (Recomendado)

#### Linux/Mac:
```bash
chmod +x scripts/setup-test-data.sh
./scripts/setup-test-data.sh
```

#### Windows:
```cmd
scripts\setup-test-data.bat
```

### Opção 2: Manual

#### Passo 1: Executar SQL
```bash
# Linux/Mac
psql -h localhost -p 5433 -U postgres -d notasfiscais_db -f scripts/setup-test-users.sql

# Windows (PowerShell)
$env:PGPASSWORD="postgres"; psql -h localhost -p 5433 -U postgres -d notasfiscais_db -f scripts\setup-test-users.sql
```

#### Passo 2: Criar arquivos físicos
```bash
node scripts/setup-test-signatures.js
```

---

## 🔧 Integração com Jenkins

Adicione ao seu `Jenkinsfile` ou pipeline:

```groovy
stage('Setup Test Data') {
    steps {
        script {
            // Executar SQL
            sh '''
                PGPASSWORD="${DB_PASSWORD}" psql \
                    -h "${DB_HOST}" \
                    -p "${DB_PORT}" \
                    -U "${DB_USER}" \
                    -d "${DB_NAME}" \
                    -f scripts/setup-test-users.sql
            '''
            
            // Criar arquivos de assinatura
            sh 'node scripts/setup-test-signatures.js'
        }
    }
}
```

Ou adicione como etapa pós-deploy:

```groovy
post {
    success {
        sh './scripts/setup-test-data.sh'
    }
}
```

---

## 🐳 Integração com Docker

Se usar Docker, adicione ao `docker-compose.yml`:

```yaml
services:
  setup-test-data:
    image: postgres:15
    volumes:
      - ./scripts:/scripts
    environment:
      PGPASSWORD: ${DB_PASSWORD}
    command: >
      sh -c "
        psql -h db -U postgres -d notasfiscais_db -f /scripts/setup-test-users.sql &&
        node /scripts/setup-test-signatures.js
      "
    depends_on:
      - db
```

---

## 📊 Usuários Criados

| Username | Senha | Role | Setor |
|----------|-------|------|-------|
| `supervisor.teste` | `123456` | supervisor | TECNOLOGIA DA INFORMAÇÃO |
| `contabilidade.teste` | `123456` | contabilidade | CONTABILIDADE |
| `financeiro.teste` | `123456` | financeiro | FINANCEIRO |
| `diretoria.teste` | `123456` | diretoria | DIRETORIA |

---

## ✅ Verificação

Após executar os scripts, verifique:

```sql
-- Verificar usuários
SELECT id, username, name, role, auth_mode
FROM users
WHERE username LIKE '%.teste'
ORDER BY role;

-- Verificar assinaturas
SELECT 
  u.username,
  u.name,
  CASE WHEN us.id IS NOT NULL THEN '✅' ELSE '❌' END as tem_assinatura,
  us.signature_file
FROM users u
LEFT JOIN user_signatures us ON u.id = us.user_id
WHERE u.username LIKE '%.teste'
ORDER BY u.role;
```

---

## 🔄 Idempotência

Os scripts são **idempotentes**, ou seja:
- ✅ Podem ser executados múltiplas vezes sem problemas
- ✅ Usam `ON CONFLICT` para atualizar se já existir
- ✅ Não duplicam dados

---

## ⚠️ Importante

1. **Senhas**: Todos os usuários de teste têm senha `123456` (hash bcrypt)
2. **Auth Mode**: Todos configurados com `auth_mode = 'local'`
3. **Assinaturas**: Arquivos PNG mínimos (1x1 pixel) são criados como placeholder
4. **Produção**: Considere remover ou desabilitar usuários de teste em produção

---

## 🛡️ Segurança

Para produção, considere:

1. **Desabilitar usuários de teste**:
```sql
UPDATE users 
SET auth_mode = 'disabled' 
WHERE username LIKE '%.teste';
```

2. **Ou remover completamente**:
```sql
DELETE FROM user_signatures WHERE user_id IN (
  SELECT id FROM users WHERE username LIKE '%.teste'
);
DELETE FROM users WHERE username LIKE '%.teste';
```

---

## 📝 Notas

- Os scripts criam usuários e assinaturas automaticamente
- Os arquivos de assinatura são criados em `server/uploads/signatures/{userId}/signature.png`
- Para usar assinaturas reais, substitua os arquivos PNG por imagens reais

---

**Versão:** 1.0  
**Data:** Janeiro 2025

