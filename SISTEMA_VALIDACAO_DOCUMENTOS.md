# 📄 Sistema de Validação de Documentos

## 🎯 **Objetivo**

Garantir que documentos **só sejam salvos definitivamente** após serem devidamente assinados, evitando que documentos não assinados fiquem salvos no sistema.

## 🔄 **Fluxo Implementado**

### **1. Upload Temporário**
- ✅ Documentos são salvos **temporariamente** em `/server/temp_documents/`
- ✅ Não são inseridos no banco de dados ainda
- ✅ Expiração automática em 24 horas
- ✅ Retorna `tempIds` para controle

### **2. Processo de Assinatura**
- ✅ Usuário assina o documento normalmente
- ✅ Sistema valida se a assinatura foi aplicada
- ✅ Documento continua temporário até confirmação

### **3. Confirmação de Assinatura**
- ✅ Endpoint `/api/documents/confirm-signature`
- ✅ Valida assinatura e move para local definitivo
- ✅ Insere no banco de dados apenas após validação
- ✅ Remove arquivos temporários

### **4. Limpeza Automática**
- ✅ Documentos expirados são removidos automaticamente
- ✅ Limpeza a cada hora
- ✅ Endpoint para cancelamento manual

## 🛠️ **Endpoints Implementados**

### **Upload Temporário**
```http
POST /api/documents/temp-upload
Content-Type: multipart/form-data

{
  "title": "Documento de Teste",
  "description": "Descrição do documento",
  "amount": 1000,
  "sector": "FINANCEIRO",
  "signatureMode": "image",
  "documents": [arquivo1.pdf, arquivo2.pdf]
}
```

**Resposta:**
```json
{
  "message": "Documentos salvos temporariamente. Complete a assinatura para salvar definitivamente.",
  "tempIds": ["temp_1234567890_abc123", "temp_1234567891_def456"],
  "filesCount": 2,
  "signatureMode": "image",
  "requiresSignature": true
}
```

### **Confirmar Assinatura**
```http
POST /api/documents/confirm-signature
Content-Type: application/json

{
  "tempIds": ["temp_1234567890_abc123", "temp_1234567891_def456"],
  "signatureData": {
    "signatureApplied": true,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

**Resposta:**
```json
{
  "message": "Documentos assinados e salvos com sucesso",
  "documentIds": [123, 124],
  "filesCount": 2,
  "signatureConfirmed": true
}
```

### **Cancelar Documentos Temporários**
```http
POST /api/documents/cancel-temp
Content-Type: application/json

{
  "tempIds": ["temp_1234567890_abc123"]
}
```

**Resposta:**
```json
{
  "message": "Documentos temporários cancelados com sucesso",
  "tempIds": ["temp_1234567890_abc123"]
}
```

## 🔧 **Estrutura de Arquivos**

```
server/
├── temp_documents/           # Documentos temporários
│   ├── temp_1234567890_abc123/
│   │   ├── documento.pdf     # Arquivo original
│   │   └── metadata.json     # Metadados do documento
│   └── temp_1234567891_def456/
│       ├── documento2.pdf
│       └── metadata.json
├── uploads/                  # Documentos definitivos
│   ├── doc_1234567890_documento.pdf
│   └── doc_1234567891_documento2.pdf
└── document-validation-system.js
```

## 📋 **Metadados Temporários**

```json
{
  "title": "Documento de Teste",
  "description": "Descrição do documento",
  "amount": 1000,
  "sector": "FINANCEIRO",
  "signatureMode": "image",
  "govSignature": null,
  "userId": 123,
  "userRole": "supervisor",
  "originalFilename": "documento.pdf",
  "tempId": "temp_1234567890_abc123",
  "originalPath": "/tmp/upload_abc123",
  "tempPath": "/server/temp_documents/temp_1234567890_abc123/documento.pdf",
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-01-16T10:00:00Z"
}
```

## 🛡️ **Validações Implementadas**

### **Upload Temporário**
- ✅ Verificar se usuário tem assinatura configurada
- ✅ Validar modo de assinatura selecionado
- ✅ Verificar se arquivos são PDFs válidos
- ✅ Apenas supervisores podem fazer upload

### **Confirmação de Assinatura**
- ✅ Verificar se documentos temporários existem
- ✅ Validar se não expiraram (24 horas)
- ✅ Confirmar que usuário pode assinar
- ✅ Verificar se assinatura foi aplicada

### **Limpeza Automática**
- ✅ Remover documentos expirados automaticamente
- ✅ Limpar arquivos temporários após confirmação
- ✅ Logs detalhados de todas as operações

## 🚀 **Integração com Frontend**

### **1. Modificar Upload de Documentos**
```javascript
// Antes (salvava direto)
const response = await fetch('/api/documents', {
  method: 'POST',
  body: formData
});

// Depois (salva temporariamente)
const response = await fetch('/api/documents/temp-upload', {
  method: 'POST',
  body: formData
});

const { tempIds, requiresSignature } = await response.json();
```

### **2. Após Assinatura**
```javascript
// Confirmar assinatura e salvar definitivamente
const confirmResponse = await fetch('/api/documents/confirm-signature', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tempIds: tempIds,
    signatureData: {
      signatureApplied: true,
      timestamp: new Date().toISOString()
    }
  })
});

const { documentIds, signatureConfirmed } = await confirmResponse.json();
```

### **3. Em Caso de Cancelamento**
```javascript
// Cancelar documentos temporários
await fetch('/api/documents/cancel-temp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tempIds: tempIds
  })
});
```

## 📊 **Logs e Monitoramento**

### **Logs Implementados**
- 📄 Documentos salvos temporariamente
- 🔐 Confirmação de assinatura
- ✅ Documentos salvos definitivamente
- 🗑️ Documentos temporários cancelados
- 🧹 Limpeza automática de documentos expirados

### **Comandos de Monitoramento**
```bash
# Verificar documentos temporários
ls -la server/temp_documents/

# Verificar logs do sistema
tail -f server/logs/app.log | grep "Documento"

# Limpar documentos expirados manualmente
node -e "require('./server/document-validation-system').cleanupExpiredDocuments()"
```

## ⚠️ **Considerações Importantes**

### **Segurança**
- ✅ Documentos temporários são isolados por usuário
- ✅ Validação de permissões em cada etapa
- ✅ Limpeza automática previne acúmulo de arquivos
- ✅ Logs de auditoria para todas as operações

### **Performance**
- ✅ Limpeza automática evita acúmulo de arquivos
- ✅ Documentos expiram automaticamente
- ✅ Validação assíncrona não bloqueia interface
- ✅ Logs otimizados para debugging

### **Backup**
- ✅ Documentos definitivos ficam em `/uploads/`
- ✅ Metadados salvos no banco de dados
- ✅ Logs de auditoria preservados
- ✅ Sistema de recuperação em caso de falha

## 🎯 **Resultado Final**

- ✅ **Documentos não assinados NÃO são salvos** definitivamente
- ✅ **Apenas documentos assinados** ficam no banco de dados
- ✅ **Limpeza automática** de arquivos temporários
- ✅ **Sistema robusto** com validações múltiplas
- ✅ **Logs detalhados** para auditoria e debugging

---

**🎉 Agora o sistema garante que documentos só sejam salvos após assinatura!**
