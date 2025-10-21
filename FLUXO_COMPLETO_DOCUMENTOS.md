# 📄 Fluxo Completo de Documentos - Sistema de Assinaturas

## 🎯 **Destino Final**
**Pasta de Rede:** `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade`

## 🔄 **Fluxo Completo Implementado**

### **1. 📤 Upload e Primeira Assinatura (Supervisor)**

```javascript
// Upload temporário
POST /api/documents/temp-upload
// Documento salvo em: /server/temp_documents/temp_1234567890_abc123/

// Confirmação de assinatura
POST /api/documents/confirm-signature
// Documento movido para: /server/uploads/pending/doc_1234567890_documento.pdf
// Status no banco: pending
```

### **2. 📋 Fluxo de Aprovações Sequenciais**

#### **Etapa 1: Contabilidade**
- **Quem aprova:** Usuários com role `contabilidade`
- **Endpoint:** `POST /api/documents/:id/approve`
- **Movimentação:** `pending/` → `contabilidade/`
- **Status:** `contabilidade_approved`

#### **Etapa 2: Financeiro**
- **Quem aprova:** Usuários com role `financeiro`
- **Movimentação:** `contabilidade/` → `financeiro/`
- **Status:** `financeiro_approved`

#### **Etapa 3: Diretoria**
- **Quem aprova:** Usuários com role `diretoria`
- **Movimentação:** `financeiro/` → `diretoria/`
- **Status:** `diretoria_approved`

#### **Etapa 4: Processamento de Pagamento**
- **Quem processa:** Usuários com role `financeiro`
- **Endpoint:** `POST /api/documents/:id/payment`
- **Movimentação:** `diretoria/` → `payment/`
- **Status:** `payment_processed`

#### **Etapa 5: Finalização**
- **Movimentação:** `payment/` → `completed/` → **Pasta de Rede Final**
- **Status:** `completed`

## 📁 **Estrutura de Pastas por Etapa**

```
server/uploads/
├── 📂 pending/                    # Aguardando primeira aprovação
│   └── doc_1234567890_documento.pdf
├── 📂 contabilidade/              # Aprovados por contabilidade
│   └── doc_1234567890_documento_contabilidade_1234567891.pdf
├── 📂 financeiro/                 # Aprovados por financeiro
│   └── doc_1234567890_documento_financeiro_1234567892.pdf
├── 📂 diretoria/                  # Aprovados por diretoria
│   └── doc_1234567890_documento_diretoria_1234567893.pdf
├── 📂 payment/                    # Aguardando pagamento
│   └── doc_1234567890_documento_payment_1234567894.pdf
├── 📂 completed/                  # Processados e prontos
│   └── doc_1234567890_documento_completed_1234567895.pdf
└── 📂 temp_documents/             # Documentos temporários (limpeza automática)
    └── temp_1234567890_abc123/
```

## 🌐 **Pasta de Rede Final**

```
Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade\
└── doc_1234567890_documento_FINAL_2024-01-15.pdf
```

## 🔄 **Movimentação Automática de Arquivos**

### **Sistema Implementado:**
- ✅ **Movimentação automática** entre pastas por etapa
- ✅ **Renomeação de arquivos** com timestamp e etapa
- ✅ **Atualização do banco** com novos caminhos
- ✅ **Logs de auditoria** para cada movimentação
- ✅ **Envio final** para pasta de rede

### **Código de Movimentação:**
```javascript
// Mover documento para próxima etapa
await documentFlow.moveDocumentToStage(
  documentId, 
  currentStage,     // 'pending'
  nextStage,        // 'contabilidade'
  userId, 
  comments
);

// Enviar para pasta de rede final
await documentFlow.moveToFinalNetworkLocation(documentId);
```

## 📊 **Status e Estágios no Banco de Dados**

### **Tabela `documents`:**
```sql
id | title | file_path | current_stage | status | final_network_path
123| Doc   | doc_123...| pending       | pending| NULL
123| Doc   | doc_123...| contabilidade | contabilidade_approved | NULL
123| Doc   | doc_123...| financeiro    | financeiro_approved | NULL
123| Doc   | doc_123...| diretoria     | diretoria_approved | NULL
123| Doc   | doc_123...| payment       | payment_processed | NULL
123| Doc   | doc_123...| completed     | completed | Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade\doc_123_FINAL_2024-01-15.pdf
```

### **Tabela `document_approvals`:**
```sql
document_id | user_id | stage | action | comments | created_at
123         | 456     | pending | approved | Aprovado pelo supervisor | 2024-01-15 10:00:00
123         | 789     | contabilidade | approved | Aprovado pela contabilidade | 2024-01-15 14:00:00
123         | 101     | financeiro | approved | Aprovado pelo financeiro | 2024-01-15 16:00:00
123         | 112     | diretoria | approved | Aprovado pela diretoria | 2024-01-15 18:00:00
123         | 113     | final | completed | Enviado para pasta de rede | 2024-01-15 20:00:00
```

## 🛠️ **Endpoints Implementados**

### **1. Upload Temporário**
```http
POST /api/documents/temp-upload
Content-Type: multipart/form-data
```

### **2. Confirmação de Assinatura**
```http
POST /api/documents/confirm-signature
Content-Type: application/json
```

### **3. Aprovação por Etapa**
```http
POST /api/documents/:id/approve
Content-Type: application/json
{
  "action": "approve",
  "comments": "Aprovado pela contabilidade"
}
```

### **4. Processamento de Pagamento**
```http
POST /api/documents/:id/payment
Content-Type: multipart/form-data
```

### **5. Cancelamento de Documentos Temporários**
```http
POST /api/documents/cancel-temp
Content-Type: application/json
```

## 🔍 **Validações por Etapa**

### **Contabilidade:**
- ✅ Verificar se `userRole === 'contabilidade'`
- ✅ Verificar se `current_stage === 'pending'`
- ✅ Mover arquivo para pasta `contabilidade/`

### **Financeiro:**
- ✅ Verificar se `userRole === 'financeiro'`
- ✅ Verificar se `current_stage === 'contabilidade'`
- ✅ Mover arquivo para pasta `financeiro/`

### **Diretoria:**
- ✅ Verificar se `userRole === 'diretoria'`
- ✅ Verificar se `current_stage === 'financeiro'`
- ✅ Mover arquivo para pasta `diretoria/`

### **Pagamento:**
- ✅ Verificar se `userRole === 'financeiro'`
- ✅ Verificar se `current_stage === 'diretoria'`
- ✅ Processar pagamento e mover para `payment/`

### **Finalização:**
- ✅ Mover arquivo para pasta `completed/`
- ✅ Copiar para pasta de rede final
- ✅ Atualizar `final_network_path` no banco

## 📋 **Logs e Auditoria**

### **Logs Implementados:**
- 📄 Documento movido para etapa X
- 🔐 Assinatura confirmada
- ✅ Documento aprovado por [role]
- ❌ Documento rejeitado por [role]
- 💰 Pagamento processado
- 🌐 Documento enviado para pasta de rede final

### **Comandos de Monitoramento:**
```bash
# Verificar documentos por etapa
ls -la server/uploads/pending/
ls -la server/uploads/contabilidade/
ls -la server/uploads/financeiro/
ls -la server/uploads/diretoria/
ls -la server/uploads/payment/
ls -la server/uploads/completed/

# Verificar pasta de rede final
dir "Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade"
```

## ⚠️ **Considerações Importantes**

### **Segurança:**
- ✅ Validação de permissões por etapa
- ✅ Logs de auditoria completos
- ✅ Rastreabilidade de todas as movimentações
- ✅ Backup automático antes de mover arquivos

### **Performance:**
- ✅ Movimentação de arquivos otimizada
- ✅ Limpeza automática de arquivos temporários
- ✅ Logs estruturados para debugging
- ✅ Validações assíncronas

### **Backup:**
- ✅ Arquivos ficam em múltiplas pastas durante o processo
- ✅ Pasta de rede final como backup definitivo
- ✅ Metadados preservados no banco de dados
- ✅ Logs de auditoria para recuperação

## 🎯 **Resultado Final**

1. **Documento não assinado** → NÃO é salvo definitivamente
2. **Documento assinado** → Salvo em `/uploads/pending/`
3. **Aprovação contabilidade** → Movido para `/uploads/contabilidade/`
4. **Aprovação financeiro** → Movido para `/uploads/financeiro/`
5. **Aprovação diretoria** → Movido para `/uploads/diretoria/`
6. **Processamento pagamento** → Movido para `/uploads/payment/`
7. **Finalização** → Movido para `/uploads/completed/`
8. **Envio final** → **Copiado para `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\Contabilidade`**

---

**🎉 Sistema completo: documentos só são salvos após assinatura e seguem fluxo completo até pasta de rede final!**
