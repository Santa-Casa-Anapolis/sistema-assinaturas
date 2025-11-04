# ✅ Alterações Realizadas - Alinhamento com document-flow-system

## 📋 Resumo das Mudanças

Este documento descreve todas as alterações realizadas para alinhar o backend com o `document-flow-system.js`.

---

## 🔄 1. Rota POST /api/documents/confirm-signature

### **Alterações:**
- ✅ Ajustado INSERT para gravar `current_stage = 'contabilidade'` e `status = 'contabilidade_pending'`
- ✅ Após criar o documento, usa `documentFlow.moveDocumentToStage()` para mover o PDF de `pending` para `contabilidade`
- ✅ A renomeação e atualização do banco são feitas automaticamente pelo `document-flow-system`

### **Código Antes:**
```javascript
INSERT INTO documents (..., status, current_stage, ...)
VALUES (..., 'pending', 'pending', ...)
```

### **Código Depois:**
```javascript
INSERT INTO documents (..., status, current_stage, ...)
VALUES (..., 'contabilidade_pending', 'contabilidade', ...)

// Usar documentFlow para mover o arquivo
await documentFlow.moveDocumentToStage(documentId, 'pending', 'contabilidade', userId, 'Documento assinado pelo supervisor');
```

---

## 🔄 2. Rota POST /api/documents/:id/approve

### **Alterações:**
- ✅ Substituído UPDATE manual por `documentFlow.moveDocumentToStage()`
- ✅ Tratamento especial para `nextStage === 'payment'` garantindo que `status = 'approved'` e `final_approval_date` sejam preenchidos

### **Código Antes:**
```javascript
if (nextStage === 'payment') {
  await pool.query(`
    UPDATE documents 
    SET current_stage = $1, status = 'approved', final_approval_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [nextStage, documentId]);
} else {
  await pool.query(`
    UPDATE documents 
    SET current_stage = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `, [nextStage, documentId]);
}
```

### **Código Depois:**
```javascript
// Usar documentFlow para mover o documento
await documentFlow.moveDocumentToStage(documentId, document.current_stage, nextStage, userId, comments || 'Documento aprovado');

// Se nextStage é 'payment', garantir que status e final_approval_date sejam preenchidos
if (nextStage === 'payment') {
  await pool.query(`
    UPDATE documents 
    SET status = 'approved', final_approval_date = CURRENT_TIMESTAMP
    WHERE id = $1 AND final_approval_date IS NULL
  `, [documentId]);
}
```

---

## 🔄 3. Rota POST /api/documents/:id/payment

### **Alterações:**
- ✅ Após salvar o comprovante, chama `documentFlow.moveDocumentToStage()` para mover de `payment` para `completed`
- ✅ Em seguida invoca `documentFlow.moveToFinalNetworkLocation()` para copiar o PDF à pasta de rede e finalizar

### **Código Antes:**
```javascript
await pool.query(`
  UPDATE documents 
  SET payment_proof_path = $1, payment_date = $2, payment_status = 'completed', current_stage = 'completed', status = 'completed', updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
`, [req.file.path, paymentDate, documentId]);

await moveDocumentToNetworkFolder(document);
```

### **Código Depois:**
```javascript
// Atualizar apenas dados do pagamento (comprovante)
await pool.query(`
  UPDATE documents 
  SET payment_proof_path = $1, payment_date = $2, payment_status = 'completed', updated_at = CURRENT_TIMESTAMP
  WHERE id = $3
`, [req.file.path, paymentDate, documentId]);

// Mover documento de payment para completed usando documentFlow
await documentFlow.moveDocumentToStage(documentId, 'payment', 'completed', userId, 'Pagamento processado');

// Em seguida, enviar para pasta de rede e finalizar
await documentFlow.moveToFinalNetworkLocation(documentId);
```

---

## 🔄 4. Ajustes em document-flow-system.js

### **Aceitar 'pending' como estágio inicial:**
- ✅ Adicionada lógica para determinar pasta de origem baseada no estágio atual
- ✅ Suporte para `currentStage === 'pending'` na função `moveDocumentToStage()`

### **Status baseado no novo estágio:**
- ✅ `contabilidade` → `status = 'contabilidade_pending'`
- ✅ `payment` → `status = 'approved'`
- ✅ `completed` → `status = 'completed'`
- ✅ Outros → `status = '{stage}_approved'`

### **Registro de aprovação:**
- ✅ Não registra aprovação quando movimento é inicial (`pending` → `contabilidade`)
- ✅ Registra aprovação para movimentos subsequentes

### **moveToFinalNetworkLocation:**
- ✅ Procura arquivo primeiro em `payment`, depois em `completed`
- ✅ Se encontrar em `payment`, move automaticamente para `completed` antes de enviar para rede
- ✅ Atualiza `file_path`, `current_stage`, `final_network_path`, `status`, `completed_at`

---

## 🔄 5. Atualização de Consultas de Documentos Pendentes

### **Rota GET /api/documents/pending:**

### **Alteração:**
- ✅ Consulta atualizada para considerar `current_stage = 'contabilidade'` em vez de `status = 'pending'`

### **Código Antes:**
```javascript
WHERE d.status = 'pending'
```

### **Código Depois:**
```javascript
WHERE d.current_stage = 'contabilidade' AND (d.status = 'contabilidade_pending' OR d.status = 'pending')
```

---

## 📊 Fluxo Completo Atualizado

### **Etapas do Processo:**

1. **Upload Temporário** → Arquivo em `/temp_documents/`
2. **Supervisor Assina** → 
   - Arquivo movido para `/uploads/pending/`
   - Documento criado no banco com `current_stage = 'contabilidade'`, `status = 'contabilidade_pending'`
   - `documentFlow.moveDocumentToStage()` move arquivo para `/uploads/contabilidade/`
3. **Contabilidade Aprova** →
   - `documentFlow.moveDocumentToStage()` move arquivo para `/uploads/financeiro/`
   - `current_stage = 'financeiro'`, `status = 'financeiro_approved'`
4. **Financeiro Aprova** →
   - `documentFlow.moveDocumentToStage()` move arquivo para `/uploads/diretoria/`
   - `current_stage = 'diretoria'`, `status = 'diretoria_approved'`
5. **Diretoria Aprova** →
   - `documentFlow.moveDocumentToStage()` move arquivo para `/uploads/payment/`
   - `current_stage = 'payment'`, `status = 'approved'`
   - `final_approval_date` preenchido
6. **Financeiro Processa Pagamento** →
   - `documentFlow.moveDocumentToStage()` move arquivo para `/uploads/completed/`
   - `current_stage = 'completed'`, `status = 'completed'`
   - `documentFlow.moveToFinalNetworkLocation()` copia para pasta de rede
   - `final_network_path`, `completed_at` preenchidos

---

## ✅ Checklist de Validação

Após rodar o fluxo completo, verificar:

- [ ] `current_stage` e `status` avançam corretamente em cada etapa
- [ ] Arquivos são movidos para as pastas corretas de cada etapa
- [ ] Arquivos são renomeados corretamente com timestamp e etapa
- [ ] `final_network_path` fica preenchido no fim do processo
- [ ] `completed_at` fica preenchido no fim do processo
- [ ] Documentos pendentes aparecem corretamente na consulta com `current_stage = 'contabilidade'`
- [ ] Todas as aprovações são registradas em `document_approvals`

---

## 🔍 Arquivos Modificados

1. **server/document-flow-system.js**
   - Ajustado `moveDocumentToStage()` para aceitar `pending` como estágio inicial
   - Ajustado status baseado no novo estágio
   - Ajustado `moveToFinalNetworkLocation()` para buscar arquivo em `payment` ou `completed`

2. **server/index.js**
   - Rota `POST /api/documents/confirm-signature` (linha ~2355)
   - Rota `POST /api/documents/:id/approve` (linha ~2428)
   - Rota `POST /api/documents/:id/payment` (linha ~2506)
   - Rota `GET /api/documents/pending` (linha ~2095)

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Status:** ✅ Implementado e pronto para testes

