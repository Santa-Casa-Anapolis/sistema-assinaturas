# 📋 GUIA: Criação de Documento de Teste - Fluxo Completo

## 🎯 OBJETIVO

Este documento explica **TODO O FLUXO** do sistema de notas fiscais para que o Codex possa criar um documento de teste que passe por todas as etapas do processo de aprovação.

---

## 🔄 FLUXO COMPLETO DO SISTEMA

### **VISÃO GERAL DO PROCESSO**

O sistema segue um fluxo sequencial de aprovações, onde cada etapa precisa ser aprovada antes de avançar para a próxima:

```
1. Upload Temporário → 2. Supervisor Assina → 3. Contabilidade → 4. Financeiro → 5. Diretoria → 6. Pagamento → 7. Finalização
```

---

## 📝 ETAPAS DETALHADAS DO FLUXO

### **ETAPA 1: UPLOAD TEMPORÁRIO** 
**Endpoint:** `POST /api/documents/temp-upload`

**O que acontece:**
- Usuário faz upload de um arquivo PDF/DOCX
- Arquivo é salvo temporariamente em `/server/temp_documents/temp_[timestamp]_[hash]/`
- Documento **NÃO é salvo no banco ainda** - apenas temporário
- Retorna um `tempId` para referência

**Campos necessários:**
- `file`: Arquivo PDF ou DOCX (máximo 10MB)
- `title`: Título do documento
- `description`: Descrição opcional
- `amount`: Valor da nota fiscal
- `sector`: Setor solicitante (ex: "TECNOLOGIA DA INFORMAÇÃO")

**Status no banco:** Ainda não existe no banco

---

### **ETAPA 2: CONFIRMAÇÃO DE ASSINATURA DO SUPERVISOR**
**Endpoint:** `POST /api/documents/confirm-signature`

**O que acontece:**
- Supervisor assina digitalmente o documento
- Arquivo é **movido** de `/temp_documents/` para `/server/uploads/pending/`
- Documento é **inserido no banco** na tabela `documents`
- Status inicial: `current_stage = 'pending'` e `status = 'pending'`

**Campos necessários:**
- `tempId`: ID retornado na etapa anterior
- `signatureData`: Dados da assinatura digital (simula GOV.BR)
- `govSignatureId`: ID da assinatura GOV.BR (opcional)

**Estrutura no banco após esta etapa:**
```sql
INSERT INTO documents (
  title, 
  description, 
  file_path,           -- Ex: "doc_1234567890_nota_fiscal.pdf"
  original_filename,   -- Nome original do arquivo
  created_by,          -- ID do usuário que fez upload
  supervisor_id,       -- ID do supervisor que assinou
  sector,              -- Setor solicitante
  amount,              -- Valor da nota
  status,              -- 'pending'
  current_stage,       -- 'pending'
  signature_mode,      -- 'gov_br' ou 'digital'
  gov_signature        -- Dados da assinatura
) VALUES (...);
```

**Localização do arquivo:** `/server/uploads/pending/doc_[timestamp]_[nome].pdf`

---

### **ETAPA 3: APROVAÇÃO DA CONTABILIDADE**
**Endpoint:** `POST /api/documents/:id/approve`

**Quem pode aprovar:** Usuários com `role = 'contabilidade'`

**Validação:**
```javascript
if (document.current_stage === 'contabilidade' && userRole === 'contabilidade') {
  // Pode aprovar
}
```

**O que acontece:**
1. Sistema verifica se `current_stage = 'pending'` e se usuário tem role `contabilidade`
2. Se aprovado (`action = 'approve'`):
   - Arquivo é **movido** de `/pending/` para `/contabilidade/`
   - Arquivo é renomeado: `doc_[original]_contabilidade_[timestamp].pdf`
   - `current_stage` é atualizado para `'contabilidade'`
   - `status` é atualizado para `'contabilidade_approved'`
3. Se reprovado (`action = 'reject'`):
   - `current_stage = 'rejected'`
   - `status = 'rejected'`
   - Processo para aqui

**Campos necessários:**
- `action`: `'approve'` ou `'reject'`
- `comments`: Comentários da aprovação/reprovação
- `govSignatureId`: ID da assinatura (opcional)

**Registro de aprovação:**
```sql
INSERT INTO document_approvals (
  document_id, 
  user_id, 
  stage,        -- 'contabilidade'
  action,       -- 'approved' ou 'rejected'
  comments,
  gov_signature_id
) VALUES (...);
```

**Localização do arquivo:** `/server/uploads/contabilidade/doc_[original]_contabilidade_[timestamp].pdf`

**Próximo estágio:** Se aprovado, avança para `'financeiro'`

---

### **ETAPA 4: APROVAÇÃO DO FINANCEIRO**
**Endpoint:** `POST /api/documents/:id/approve`

**Quem pode aprovar:** Usuários com `role = 'financeiro'`

**Validação:**
```javascript
if (document.current_stage === 'financeiro' && userRole === 'financeiro') {
  // Pode aprovar
}
```

**O que acontece:**
1. Sistema verifica se `current_stage = 'contabilidade'` e se usuário tem role `financeiro`
2. Se aprovado:
   - Arquivo é **movido** de `/contabilidade/` para `/financeiro/`
   - Arquivo é renomeado: `doc_[original]_financeiro_[timestamp].pdf`
   - `current_stage` é atualizado para `'financeiro'`
   - `status` é atualizado para `'financeiro_approved'`
3. Se reprovado:
   - `current_stage = 'rejected'`
   - `status = 'rejected'`

**Localização do arquivo:** `/server/uploads/financeiro/doc_[original]_financeiro_[timestamp].pdf`

**Próximo estágio:** Se aprovado, avança para `'diretoria'`

---

### **ETAPA 5: APROVAÇÃO DA DIRETORIA**
**Endpoint:** `POST /api/documents/:id/approve`

**Quem pode aprovar:** Usuários com `role = 'diretoria'`

**Validação:**
```javascript
if (document.current_stage === 'diretoria' && userRole === 'diretoria') {
  // Pode aprovar
}
```

**O que acontece:**
1. Sistema verifica se `current_stage = 'financeiro'` e se usuário tem role `diretoria`
2. Se aprovado:
   - Arquivo é **movido** de `/financeiro/` para `/diretoria/`
   - Arquivo é renomeado: `doc_[original]_diretoria_[timestamp].pdf`
   - `current_stage` é atualizado para `'payment'`
   - `status` é atualizado para `'approved'`
   - `final_approval_date` é preenchido com timestamp atual
3. Se reprovado:
   - `current_stage = 'rejected'`
   - `status = 'rejected'`

**Localização do arquivo:** `/server/uploads/diretoria/doc_[original]_diretoria_[timestamp].pdf`

**Próximo estágio:** Se aprovado, avança para `'payment'` (processamento de pagamento)

---

### **ETAPA 6: PROCESSAMENTO DE PAGAMENTO**
**Endpoint:** `POST /api/documents/:id/payment`

**Quem pode processar:** Usuários com `role = 'financeiro'`

**Validação:**
```javascript
if (userRole !== 'financeiro') {
  return error; // Apenas financeiro pode processar
}
if (document.current_stage !== 'payment') {
  return error; // Documento deve estar na etapa de pagamento
}
```

**O que acontece:**
1. Financeiro envia comprovante de pagamento (arquivo)
2. Arquivo do documento é **movido** de `/diretoria/` para `/payment/`
3. `current_stage` é atualizado para `'payment'`
4. `payment_status` é atualizado para `'completed'`
5. `payment_proof_path` é preenchido com caminho do comprovante
6. `payment_date` é preenchido com data do pagamento

**Campos necessários:**
- `paymentProof`: Arquivo do comprovante de pagamento
- `paymentDate`: Data do pagamento

**Localização do arquivo:** `/server/uploads/payment/doc_[original]_payment_[timestamp].pdf`

**Próximo estágio:** Após pagamento, avança para `'completed'`

---

### **ETAPA 7: FINALIZAÇÃO E ENVIO PARA PASTA DE REDE**
**Endpoint:** Automático após pagamento OU `documentFlow.moveToFinalNetworkLocation(documentId)`

**O que acontece:**
1. Arquivo é **movido** de `/payment/` para `/completed/`
2. Arquivo é **copiado** para pasta de rede baseada no setor:
   - Pasta base: `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\`
   - Pasta do setor: Baseado no `sector` do documento
3. Arquivo é renomeado com sufixo `_FINAL_[data]`
4. Status final: `current_stage = 'completed'` e `status = 'completed'`
5. `final_network_path` é preenchido com caminho completo
6. `completed_at` é preenchido com timestamp

**Mapeamento de Setores:**
```javascript
sectorFolders = {
  'TECNOLOGIA DA INFORMAÇÃO': 'TI',
  'RECURSOS HUMANOS': 'RH',
  'FINANCEIRO': 'Financeiro',
  'GERÊNCIA': 'Gerencia',
  'DIRETORIA': 'Diretoria',
  'GERAL': 'Geral',
  'CONTABILIDADE': 'Contabilidade'
}
```

**Localização final do arquivo:**
- Copia local: `/server/uploads/completed/doc_[original]_completed_[timestamp].pdf`
- Pasta de rede: `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\[SETOR]\doc_[original]_[SETOR]_FINAL_[YYYY-MM-DD].pdf`

---

## 📊 ESTRUTURA DO BANCO DE DADOS

### **Tabela: `documents`**
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),              -- Caminho relativo do arquivo
  original_filename VARCHAR(255),      -- Nome original do arquivo
  created_by INTEGER REFERENCES users(id),
  supervisor_id INTEGER REFERENCES users(id),
  sector VARCHAR(100),                 -- Setor solicitante
  amount DECIMAL(10,2),                -- Valor da nota
  status VARCHAR(50),                  -- pending, contabilidade_approved, financeiro_approved, approved, rejected, completed
  current_stage VARCHAR(50),           -- pending, contabilidade, financeiro, diretoria, payment, completed, rejected
  signature_mode VARCHAR(20),           -- gov_br, digital
  gov_signature TEXT,                  -- Dados da assinatura GOV.BR
  final_network_path VARCHAR(500),     -- Caminho final na pasta de rede
  final_network_filename VARCHAR(255), -- Nome do arquivo na pasta de rede
  final_network_sector VARCHAR(50),    -- Setor na pasta de rede
  payment_proof_path VARCHAR(500),     -- Caminho do comprovante de pagamento
  payment_date DATE,                   -- Data do pagamento
  payment_status VARCHAR(50),          -- pending, completed
  final_approval_date TIMESTAMP,       -- Data da aprovação final
  completed_at TIMESTAMP,              -- Data de conclusão
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabela: `document_approvals`**
```sql
CREATE TABLE document_approvals (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id),
  user_id INTEGER REFERENCES users(id),
  stage VARCHAR(50),                   -- pending, contabilidade, financeiro, diretoria, payment, final
  action VARCHAR(50),                  -- approved, rejected, completed
  comments TEXT,
  gov_signature_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabela: `users`**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE,
  email VARCHAR(255),
  name VARCHAR(255),
  role VARCHAR(50),                    -- supervisor, contabilidade, financeiro, diretoria, admin
  sector VARCHAR(100),                 -- Setor do usuário
  password VARCHAR(255),               -- Hash bcrypt
  auth_mode VARCHAR(20),               -- local, ad
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔐 REGRAS DE PERMISSÃO POR ETAPA

| Etapa | Role Necessário | Validação |
|-------|----------------|-----------|
| Upload | Qualquer usuário logado | - |
| Supervisor Assina | Supervisor do setor | `userRole === 'supervisor'` |
| Contabilidade | Contabilidade | `current_stage === 'pending' && userRole === 'contabilidade'` |
| Financeiro | Financeiro | `current_stage === 'contabilidade' && userRole === 'financeiro'` |
| Diretoria | Diretoria | `current_stage === 'financeiro' && userRole === 'diretoria'` |
| Pagamento | Financeiro | `current_stage === 'payment' && userRole === 'financeiro'` |

---

## 📁 ESTRUTURA DE PASTAS

```
server/
├── temp_documents/              # Upload temporário (antes da assinatura)
│   └── temp_[timestamp]_[hash]/
│       └── arquivo.pdf
│
├── uploads/
│   ├── pending/                 # Após assinatura do supervisor
│   │   └── doc_[timestamp]_[nome].pdf
│   │
│   ├── contabilidade/            # Após aprovação da contabilidade
│   │   └── doc_[original]_contabilidade_[timestamp].pdf
│   │
│   ├── financeiro/              # Após aprovação do financeiro
│   │   └── doc_[original]_financeiro_[timestamp].pdf
│   │
│   ├── diretoria/               # Após aprovação da diretoria
│   │   └── doc_[original]_diretoria_[timestamp].pdf
│   │
│   ├── payment/                 # Após processamento de pagamento
│   │   └── doc_[original]_payment_[timestamp].pdf
│   │
│   └── completed/              # Documento finalizado
│       └── doc_[original]_completed_[timestamp].pdf
│
└── Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\  # Pasta de rede final
    ├── TI/
    ├── RH/
    ├── Financeiro/
    ├── Gerencia/
    ├── Diretoria/
    ├── Contabilidade/
    └── Geral/
```

---

## 🧪 COMO CRIAR UM DOCUMENTO DE TESTE

### **PASSO A PASSO COMPLETO**

#### **1. Preparar Arquivo de Teste**
- Criar um arquivo PDF de teste (ex: `nota_fiscal_teste.pdf`)
- Tamanho máximo: 10MB
- Formato: PDF ou DOCX

#### **2. Criar Usuários de Teste (se necessário)**
```sql
-- Supervisor
INSERT INTO users (username, email, name, role, sector, password, auth_mode)
VALUES ('supervisor.teste', 'supervisor.teste@santacasa.org', 'Supervisor Teste', 'supervisor', 'TECNOLOGIA DA INFORMAÇÃO', '$2b$10$...', 'local');

-- Contabilidade
INSERT INTO users (username, email, name, role, password, auth_mode)
VALUES ('contabilidade.teste', 'contabilidade.teste@santacasa.org', 'Contabilidade Teste', 'contabilidade', '$2b$10$...', 'local');

-- Financeiro
INSERT INTO users (username, email, name, role, password, auth_mode)
VALUES ('financeiro.teste', 'financeiro.teste@santacasa.org', 'Financeiro Teste', 'financeiro', '$2b$10$...', 'local');

-- Diretoria
INSERT INTO users (username, email, name, role, password, auth_mode)
VALUES ('diretoria.teste', 'diretoria.teste@santacasa.org', 'Diretoria Teste', 'diretoria', '$2b$10$...', 'local');
```

#### **3. Fazer Upload Temporário**
```javascript
// POST /api/documents/temp-upload
const formData = new FormData();
formData.append('file', arquivoPDF);
formData.append('title', 'Nota Fiscal de Teste');
formData.append('description', 'Documento de teste para validação do fluxo');
formData.append('amount', '1500.00');
formData.append('sector', 'TECNOLOGIA DA INFORMAÇÃO');

// Retorna: { tempId: 'temp_1234567890_abc123' }
```

#### **4. Supervisor Assina (Confirma Assinatura)**
```javascript
// POST /api/documents/confirm-signature
{
  "tempId": "temp_1234567890_abc123",
  "signatureData": {
    "signature": "assinatura_base64",
    "timestamp": "2025-01-15T10:00:00Z"
  },
  "govSignatureId": "gov_br_123456"
}

// Retorna: { documentId: 123, status: 'pending', current_stage: 'pending' }
```

#### **5. Contabilidade Aprova**
```javascript
// POST /api/documents/123/approve
// Headers: Authorization: Bearer [token_contabilidade]
{
  "action": "approve",
  "comments": "Aprovado pela contabilidade - valores conferidos",
  "govSignatureId": "gov_br_789012"
}

// Resultado:
// - current_stage: 'contabilidade'
// - status: 'contabilidade_approved'
// - Arquivo movido para: /uploads/contabilidade/
```

#### **6. Financeiro Aprova**
```javascript
// POST /api/documents/123/approve
// Headers: Authorization: Bearer [token_financeiro]
{
  "action": "approve",
  "comments": "Aprovado pelo financeiro - dentro do orçamento",
  "govSignatureId": "gov_br_345678"
}

// Resultado:
// - current_stage: 'financeiro'
// - status: 'financeiro_approved'
// - Arquivo movido para: /uploads/financeiro/
```

#### **7. Diretoria Aprova**
```javascript
// POST /api/documents/123/approve
// Headers: Authorization: Bearer [token_diretoria]
{
  "action": "approve",
  "comments": "Aprovado pela diretoria - conforme políticas",
  "govSignatureId": "gov_br_901234"
}

// Resultado:
// - current_stage: 'payment'
// - status: 'approved'
// - final_approval_date: preenchido
// - Arquivo movido para: /uploads/diretoria/
```

#### **8. Financeiro Processa Pagamento**
```javascript
// POST /api/documents/123/payment
// Headers: Authorization: Bearer [token_financeiro]
const formData = new FormData();
formData.append('paymentProof', arquivoComprovante);
formData.append('paymentDate', '2025-01-20');

// Resultado:
// - current_stage: 'payment'
// - payment_status: 'completed'
// - payment_proof_path: caminho do comprovante
// - payment_date: '2025-01-20'
// - Arquivo movido para: /uploads/payment/
```

#### **9. Finalização Automática**
```javascript
// Sistema automaticamente:
// - Move arquivo para /uploads/completed/
// - Copia para pasta de rede: Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\TI\
// - Atualiza status: 'completed'
// - Preenche final_network_path
// - Preenche completed_at
```

---

## 📋 EXEMPLO DE SCRIPT DE TESTE COMPLETO

```javascript
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000';
const TEST_PDF = './nota_fiscal_teste.pdf';

// Usuários de teste
const USERS = {
  supervisor: { username: 'supervisor.teste', password: '123456' },
  contabilidade: { username: 'contabilidade.teste', password: '123456' },
  financeiro: { username: 'financeiro.teste', password: '123456' },
  diretoria: { username: 'diretoria.teste', password: '123456' }
};

async function login(username, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, authMode: 'local' })
  });
  const data = await response.json();
  return data.token;
}

async function uploadTempDocument(token) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(TEST_PDF));
  formData.append('title', 'Nota Fiscal de Teste - Fluxo Completo');
  formData.append('description', 'Teste automático do fluxo completo');
  formData.append('amount', '2500.00');
  formData.append('sector', 'TECNOLOGIA DA INFORMAÇÃO');

  const response = await fetch(`${BASE_URL}/api/documents/temp-upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return await response.json();
}

async function confirmSignature(token, tempId) {
  const response = await fetch(`${BASE_URL}/api/documents/confirm-signature`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tempId,
      signatureData: { signature: 'test_signature', timestamp: new Date().toISOString() },
      govSignatureId: `gov_test_${Date.now()}`
    })
  });
  return await response.json();
}

async function approveDocument(token, documentId, comments) {
  const response = await fetch(`${BASE_URL}/api/documents/${documentId}/approve`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      action: 'approve',
      comments,
      govSignatureId: `gov_test_${Date.now()}`
    })
  });
  return await response.json();
}

async function processPayment(token, documentId, paymentProofPath) {
  const formData = new FormData();
  formData.append('paymentProof', fs.createReadStream(paymentProofPath));
  formData.append('paymentDate', new Date().toISOString().split('T')[0]);

  const response = await fetch(`${BASE_URL}/api/documents/${documentId}/payment`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  });
  return await response.json();
}

async function testCompleteFlow() {
  console.log('🧪 Iniciando teste do fluxo completo...\n');

  // 1. Login como Supervisor
  console.log('1️⃣ Login como Supervisor...');
  const supervisorToken = await login(USERS.supervisor.username, USERS.supervisor.password);
  console.log('✅ Login realizado\n');

  // 2. Upload temporário
  console.log('2️⃣ Fazendo upload temporário...');
  const uploadResult = await uploadTempDocument(supervisorToken);
  const tempId = uploadResult.tempId;
  console.log(`✅ Upload realizado - TempID: ${tempId}\n`);

  // 3. Confirmar assinatura do supervisor
  console.log('3️⃣ Supervisor assinando documento...');
  const confirmResult = await confirmSignature(supervisorToken, tempId);
  const documentId = confirmResult.documentId;
  console.log(`✅ Documento criado - ID: ${documentId}\n`);

  // 4. Login como Contabilidade
  console.log('4️⃣ Login como Contabilidade...');
  const contabilidadeToken = await login(USERS.contabilidade.username, USERS.contabilidade.password);
  console.log('✅ Login realizado\n');

  // 5. Contabilidade aprova
  console.log('5️⃣ Contabilidade aprovando...');
  await approveDocument(contabilidadeToken, documentId, 'Aprovado pela contabilidade');
  console.log('✅ Aprovado pela contabilidade\n');

  // 6. Login como Financeiro
  console.log('6️⃣ Login como Financeiro...');
  const financeiroToken = await login(USERS.financeiro.username, USERS.financeiro.password);
  console.log('✅ Login realizado\n');

  // 7. Financeiro aprova
  console.log('7️⃣ Financeiro aprovando...');
  await approveDocument(financeiroToken, documentId, 'Aprovado pelo financeiro');
  console.log('✅ Aprovado pelo financeiro\n');

  // 8. Login como Diretoria
  console.log('8️⃣ Login como Diretoria...');
  const diretoriaToken = await login(USERS.diretoria.username, USERS.diretoria.password);
  console.log('✅ Login realizado\n');

  // 9. Diretoria aprova
  console.log('9️⃣ Diretoria aprovando...');
  await approveDocument(diretoriaToken, documentId, 'Aprovado pela diretoria');
  console.log('✅ Aprovado pela diretoria\n');

  // 10. Financeiro processa pagamento
  console.log('🔟 Processando pagamento...');
  await processPayment(financeiroToken, documentId, './comprovante_teste.pdf');
  console.log('✅ Pagamento processado\n');

  console.log('🎉 Fluxo completo testado com sucesso!');
  console.log(`📄 Documento ID: ${documentId}`);
  console.log('📁 Verifique a pasta de rede final para confirmar o arquivo');
}

testCompleteFlow().catch(console.error);
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Ao criar um documento de teste, verifique:

- [ ] Arquivo foi salvo temporariamente em `/temp_documents/`
- [ ] Supervisor conseguiu assinar e documento foi para `/pending/`
- [ ] Documento foi inserido no banco com `status = 'pending'`
- [ ] Contabilidade conseguiu aprovar e arquivo foi para `/contabilidade/`
- [ ] Financeiro conseguiu aprovar e arquivo foi para `/financeiro/`
- [ ] Diretoria conseguiu aprovar e arquivo foi para `/diretoria/`
- [ ] Pagamento foi processado e arquivo foi para `/payment/`
- [ ] Arquivo final foi para `/completed/`
- [ ] Arquivo foi copiado para pasta de rede (`Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\[SETOR]`)
- [ ] Status final no banco é `'completed'`
- [ ] `final_network_path` foi preenchido
- [ ] `completed_at` foi preenchido
- [ ] Todas as aprovações foram registradas em `document_approvals`

---

## 🎯 RESUMO PARA O CODEX

**Para criar um documento de teste completo, você precisa:**

1. **Ter usuários de teste** com roles: supervisor, contabilidade, financeiro, diretoria
2. **Fazer upload temporário** → retorna `tempId`
3. **Supervisor assina** → documento vai para `pending` no banco
4. **Contabilidade aprova** → arquivo vai para `/contabilidade/`, `current_stage = 'contabilidade'`
5. **Financeiro aprova** → arquivo vai para `/financeiro/`, `current_stage = 'financeiro'`
6. **Diretoria aprova** → arquivo vai para `/diretoria/`, `current_stage = 'payment'`
7. **Financeiro processa pagamento** → arquivo vai para `/payment/`, `current_stage = 'payment'`
8. **Sistema finaliza automaticamente** → arquivo vai para `/completed/` e pasta de rede, `status = 'completed'`

**Regras importantes:**
- Cada etapa só pode ser executada por usuário com role correto
- Cada etapa só pode ser executada quando `current_stage` está correto
- Arquivo é movido e renomeado a cada etapa
- Todas as ações são registradas em `document_approvals`

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Uso:** Guia completo para criação de documentos de teste no sistema de notas fiscais

