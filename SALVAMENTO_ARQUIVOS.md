# 📁 SALVAMENTO DE ARQUIVOS APÓS FLUXO DE APROVAÇÃO

## ✅ **FUNCIONALIDADE IMPLEMENTADA**

O sistema **JÁ ESTÁ CONFIGURADO** para salvar os arquivos na pasta de rede após concluir o fluxo de aprovação!

## 🗂️ **ESTRUTURA DE PASTAS**

### **Caminho Base:**
```
Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS
```

### **Estrutura Organizada:**
```
Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\
├── SETOR CONTABILIDADE\
│   ├── 2025\
│   │   ├── JANEIRO\
│   │   ├── FEVEREIRO\
│   │   └── ...
│   └── 2024\
├── SETOR FINANCEIRO\
│   ├── 2025\
│   └── 2024\
├── SETOR TECNOLOGIA DA INFORMAÇÃO\
│   ├── 2025\
│   └── 2024\
└── SETOR GERAL\
    ├── 2025\
    └── 2024\
```

## 🔄 **COMO FUNCIONA**

### **1. Durante o Upload**
- Arquivo é salvo temporariamente em: `server/uploads/`
- Documento é registrado no banco de dados
- Fluxo de assinatura é criado

### **2. Durante as Assinaturas**
- Cada signatário assina o documento
- Status é atualizado no banco
- Arquivo permanece na pasta temporária

### **3. Após Última Assinatura**
- Sistema detecta que todas as assinaturas foram concluídas
- Status do documento é alterado para `completed`
- **FUNÇÃO `moveCompletedDocument()` É EXECUTADA**

### **4. Movimentação do Arquivo**
- Sistema identifica o setor do supervisor
- Cria estrutura de pastas: `SETOR > ANO > MÊS`
- Copia arquivo da pasta temporária para pasta final
- Registra ação na auditoria

## 📋 **DETALHES TÉCNICOS**

### **Função `moveCompletedDocument()`**
```javascript
// Localização: server/index.js linha 552
async function moveCompletedDocument(documentId) {
  // 1. Busca informações do documento
  // 2. Identifica o setor
  // 3. Cria estrutura de pastas
  // 4. Move arquivo
  // 5. Registra auditoria
}
```

### **Estrutura de Pastas Criada:**
- **Setor**: Baseado no supervisor que iniciou o processo
- **Ano**: Ano atual (ex: 2025)
- **Mês**: Mês atual em português (ex: JANEIRO, FEVEREIRO)

### **Fallback de Segurança:**
- Se pasta de rede não estiver disponível
- Sistema cria pasta local: `server/recebidos/`
- Mantém mesma estrutura organizacional

## 🎯 **EXEMPLO PRÁTICO**

### **Cenário:**
- Supervisor: Karla (SETOR CONTABILIDADE)
- Data: Janeiro 2025
- Documento: "Nota Fiscal 001"

### **Resultado:**
```
Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\
└── SETOR CONTABILIDADE\
    └── 2025\
        └── JANEIRO\
            └── nota_fiscal_001.pdf
```

## 🔍 **MONITORAMENTO**

### **Logs do Sistema:**
```
✅ Documento "Nota Fiscal 001" movido para: Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\SETOR CONTABILIDADE\2025\JANEIRO\nota_fiscal_001.pdf
📁 Estrutura: SETOR CONTABILIDADE > 2025 > JANEIRO
```

### **Auditoria:**
- Ação registrada na tabela `audit_log`
- Tipo: `DOCUMENT_COMPLETED`
- Detalhes: Caminho completo do arquivo

## ⚙️ **CONFIGURAÇÃO**

### **Caminho Configurado:**
```javascript
const networkPath = 'Y:\\TECNOLOGIA DA INFORMAÇÃO\\3. Sistemas\\Karla\\NOTASFISCAIS';
```

### **Para Alterar o Caminho:**
1. Editar arquivo `server/index.js`
2. Localizar linha 581
3. Alterar variável `networkPath`

## 🚀 **STATUS ATUAL**

### **✅ IMPLEMENTADO:**
- ✅ Função de movimentação de arquivos
- ✅ Criação automática de estrutura de pastas
- ✅ Organização por setor, ano e mês
- ✅ Fallback para pasta local
- ✅ Registro de auditoria
- ✅ Logs detalhados

### **🎯 PRONTO PARA USO:**
O sistema está **100% funcional** para salvar arquivos na pasta de rede após concluir o fluxo de aprovação!

## 📝 **TESTE**

Para testar:
1. Faça upload de um documento
2. Complete todo o fluxo de assinaturas
3. Verifique se o arquivo foi movido para:
   `Y:\TECNOLOGIA DA INFORMAÇÃO\3. Sistemas\Karla\NOTASFISCAIS\[SETOR]\[ANO]\[MÊS]`
