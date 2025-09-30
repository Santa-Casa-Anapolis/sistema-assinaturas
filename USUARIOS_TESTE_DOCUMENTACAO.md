# 👥 USUÁRIOS DE TESTE - SISTEMA DE ASSINATURAS

## 📋 **RESUMO EXECUTIVO**

Este documento contém informações completas sobre os usuários de teste criados para validar os fluxos do sistema de assinaturas digitais. Estes usuários **NÃO autenticam via Active Directory** e são utilizados exclusivamente para testes de desenvolvimento.

---

## 🔐 **CREDENCIAIS DE ACESSO**

### **1. SUPERVISOR DE TESTE**
- **Username:** `supervisor.teste`
- **Senha:** `123456`
- **Nome:** Supervisor Teste
- **Email:** supervisor.teste@santacasa.org
- **Papel:** supervisor
- **Departamento:** Supervisão
- **Cargo:** Supervisor de Área
- **Modo de Auth:** local

### **2. CONTABILIDADE DE TESTE**
- **Username:** `contabilidade.teste`
- **Senha:** `123456`
- **Nome:** Contabilidade Teste
- **Email:** contabilidade.teste@santacasa.org
- **Papel:** contabilidade
- **Departamento:** Contabilidade
- **Cargo:** Analista Contábil
- **Modo de Auth:** local

### **3. FINANCEIRO DE TESTE**
- **Username:** `financeiro.teste`
- **Senha:** `123456`
- **Nome:** Financeiro Teste
- **Email:** financeiro.teste@santacasa.org
- **Papel:** financeiro
- **Departamento:** Financeiro
- **Cargo:** Analista Financeiro
- **Modo de Auth:** local

### **4. DIRETORIA DE TESTE**
- **Username:** `diretoria.teste`
- **Senha:** `123456`
- **Nome:** Diretoria Teste
- **Email:** diretoria.teste@santacasa.org
- **Papel:** admin
- **Departamento:** Diretoria
- **Cargo:** Diretor
- **Modo de Auth:** local

---

## 🔄 **FLUXO DE TESTE COMPLETO**

### **Etapa 1: Upload do Documento**
- **Usuário:** Qualquer usuário comum (ou criar um `usuario.teste`)
- **Ação:** Fazer upload de um documento
- **Status:** Aguardando aprovação

### **Etapa 2: Supervisão**
- **Usuário:** `supervisor.teste`
- **Senha:** `123456`
- **Ação:** Revisar e aprovar/rejeitar documento
- **Status:** Enviado para contabilidade (se aprovado)

### **Etapa 3: Contabilidade**
- **Usuário:** `contabilidade.teste`
- **Senha:** `123456`
- **Ação:** Revisar aspectos contábeis
- **Status:** Enviado para financeiro (se aprovado)

### **Etapa 4: Financeiro**
- **Usuário:** `financeiro.teste`
- **Senha:** `123456`
- **Ação:** Processar pagamento e liberação
- **Status:** Enviado para diretoria (se aprovado)

### **Etapa 5: Aprovação Final**
- **Usuário:** `diretoria.teste`
- **Senha:** `123456`
- **Ação:** Aprovação final e assinatura
- **Status:** Documento finalizado

---

## ⚙️ **CONFIGURAÇÕES TÉCNICAS**

### **Modo de Autenticação**
- **Usuários de Teste:** `auth_mode = 'local'`
- **Usuários AD:** `auth_mode = 'ad'` (padrão)

### **Sistema de Senhas**
- **Criptografia:** bcrypt com salt 10
- **Senha Padrão:** `123456` (para todos os usuários de teste)
- **Validação:** Local (não via Active Directory)

### **Banco de Dados**
- **Tabela:** `users`
- **Campos Adicionais:** `department`, `title`, `auth_mode`
- **Status:** Ativos e prontos para uso

---

## 🚀 **COMO USAR**

### **1. Acesso ao Sistema**
1. Acesse a URL do sistema
2. Clique em "Login"
3. Digite o username do usuário de teste
4. Digite a senha: `123456`
5. Clique em "Entrar"

### **2. Teste de Fluxo**
1. Faça login com `supervisor.teste`
2. Navegue pelas funcionalidades disponíveis
3. Teste upload, aprovação, rejeição
4. Faça logout e teste com outro usuário
5. Repita o processo para cada papel

### **3. Validação de Permissões**
- **Supervisor:** Pode aprovar/rejeitar documentos
- **Contabilidade:** Pode revisar aspectos contábeis
- **Financeiro:** Pode processar pagamentos
- **Diretoria:** Pode fazer aprovação final

---

## 🔧 **COMANDOS ÚTEIS**

### **Verificar Usuários no Banco**
```sql
SELECT username, name, role, department, auth_mode 
FROM users 
WHERE auth_mode = 'local';
```

### **Resetar Senha de Usuário de Teste**
```bash
cd server
node -e "
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'notasfiscais_db',
  password: '123456',
  port: 5432,
});
async function resetPassword() {
  const hashedPassword = await bcrypt.hash('123456', 10);
  await pool.query('UPDATE users SET password = \$1 WHERE username = \$2', [hashedPassword, 'supervisor.teste']);
  console.log('Senha resetada!');
  await pool.end();
}
resetPassword();
"
```

### **Criar Novo Usuário de Teste**
```bash
cd server
node create-test-users.js
```

---

## ⚠️ **IMPORTANTE**

### **Segurança**
- ⚠️ **NUNCA** usar estas credenciais em produção
- ⚠️ **NUNCA** commitar senhas no código
- ⚠️ **SEMPRE** usar senhas complexas em produção

### **Desenvolvimento**
- ✅ Usuários de teste são apenas para desenvolvimento
- ✅ Usuários AD continuam funcionando normalmente
- ✅ Sistema suporta ambos os modos simultaneamente

### **Limpeza**
- 🗑️ Remover usuários de teste antes do deploy
- 🗑️ Limpar dados de teste do banco
- 🗑️ Revisar logs de auditoria

---

## 📞 **SUPORTE**

Para dúvidas sobre os usuários de teste:
- **Desenvolvedor:** Sistema de Assinaturas
- **Data de Criação:** 19/09/2025
- **Versão:** 1.0
- **Status:** Ativo para testes

---

## 📝 **LOG DE ALTERAÇÕES**

| Data | Versão | Alteração | Autor |
|------|--------|-----------|-------|
| 19/09/2025 | 1.0 | Criação inicial dos usuários de teste | Sistema |

---

**✅ Documento gerado automaticamente - Pronto para uso em testes!**
