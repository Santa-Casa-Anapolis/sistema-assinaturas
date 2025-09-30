# 🔄 Fluxo de Assinaturas - Sistema Nota Fiscais

## 📋 Visão Geral do Processo

O sistema implementa um fluxo sequencial de assinaturas digitais para notas fiscais, seguindo a hierarquia organizacional da empresa.

## 🔄 Etapas do Fluxo

### 1. **Upload do Documento**
- **Responsável**: Fornecedor
- **Ação**: Envia nota fiscal (PDF/DOCX) via sistema
- **Funcionalidades**:
  - Drag & drop de arquivos
  - Validação de tipo e tamanho
  - Definição do título do documento

### 2. **Definição do Fluxo de Assinaturas**
- **Responsável**: Fornecedor
- **Ação**: Seleciona signatários na ordem sequencial
- **Fluxo Padrão**:
  1. Supervisor (Setor responsável)
  2. Contabilidade
  3. Financeiro
  4. Diretoria

### 3. **Notificação aos Signatários**
- **Sistema**: Envio automático de e-mails
- **Conteúdo**:
  - Título do documento
  - Link direto para assinatura
  - Prazo de validade (24h)

### 4. **Assinatura Digital/Eletrônica**
- **Método**: Integração GOV.BR (simulada)
- **Processo**:
  - Login no sistema
  - Download do documento
  - Revisão do conteúdo
  - Assinatura via GOV.BR
  - Validação e registro

### 5. **Registro e Auditoria**
- **Dados Capturados**:
  - Usuário que assinou
  - Data/hora da assinatura
  - IP do dispositivo
  - Assinatura digital
  - Timestamp GOV.BR

### 6. **Armazenamento Seguro**
- **Local**: Sistema interno
- **Formato**: Documento original + metadados
- **Backup**: Automático
- **Integração**: Possibilidade com GED

## 👥 Papéis e Responsabilidades

### **Fornecedor**
- Envia notas fiscais
- Define fluxo de assinaturas
- Acompanha status
- Recebe notificações

### **Supervisor**
- Recebe notificação por e-mail
- Revisa documento
- Assina via GOV.BR
- Encaminha para próxima etapa

### **Contabilidade**
- Recebe documento assinado
- Processa informações
- Assina via GOV.BR
- Transfere para financeiro

### **Financeiro**
- Recebe documento
- Valida informações financeiras
- Assina via GOV.BR
- Encaminha para diretoria

### **Diretoria**
- Recebe documento final
- Aprova via GOV.BR
- Finaliza processo
- Documento fica arquivado

## 🔐 Segurança e Validação

### **Assinatura GOV.BR**
- Certificado digital ICP-Brasil
- Validade jurídica
- Timestamp oficial
- Rastreabilidade completa

### **Auditoria**
- Log de todas as ações
- IP e timestamp
- Usuário responsável
- Histórico completo

### **Validações**
- Tipo de arquivo (PDF/DOCX)
- Tamanho máximo (10MB)
- Ordem sequencial obrigatória
- Usuário autorizado

## 📧 Notificações

### **E-mail Automático**
```
Assunto: Documento para Assinatura - Sistema Nota Fiscais

Olá [Nome],

Você tem um documento para assinar:

Documento: [Título]
Criado por: [Fornecedor]
Data: [Data/Hora]

Clique no link abaixo para acessar o sistema:
[Link direto para assinatura]

Este link é válido por 24 horas.

Sistema de Assinaturas - Nota Fiscais
```

### **Notificações no Sistema**
- Dashboard com documentos pendentes
- Contador de assinaturas
- Status em tempo real
- Histórico de ações

## 📊 Status dos Documentos

### **Pendente**
- Aguardando próxima assinatura
- Notificação enviada
- Link ativo

### **Em Andamento**
- Algumas assinaturas realizadas
- Aguardando próximos signatários
- Progresso visível

### **Concluído**
- Todas as assinaturas realizadas
- Documento arquivado
- Histórico completo disponível

## 🔄 Fluxo Detalhado

```
Fornecedor
    ↓ (Upload + Define fluxo)
Supervisor Setor A/B
    ↓ (Assina via GOV.BR)
Contabilidade
    ↓ (Assina via GOV.BR)
Financeiro
    ↓ (Assina via GOV.BR)
Diretoria
    ↓ (Assina via GOV.BR)
Documento Concluído
```

## ⚡ Benefícios

### **Eficiência**
- Elimina impressão de documentos
- Processo mais rápido
- Notificações automáticas
- Rastreabilidade completa

### **Segurança**
- Assinatura digital válida
- Auditoria completa
- Armazenamento seguro
- Backup automático

### **Conformidade**
- Validade jurídica
- Histórico para auditoria
- Conformidade com LGPD
- Padrões GOV.BR

### **Usabilidade**
- Interface intuitiva
- Responsivo (mobile)
- Notificações claras
- Status em tempo real

## 🛠️ Configurações Técnicas

### **Integração GOV.BR**
- API de assinatura digital
- Certificado ICP-Brasil
- Timestamp oficial
- Validação automática

### **Banco de Dados**
- SQLite para desenvolvimento
- PostgreSQL para produção
- Backup automático
- Logs de auditoria

### **Segurança**
- JWT para autenticação
- Rate limiting
- Validação de arquivos
- Criptografia de dados

## 📱 Interface do Usuário

### **Dashboard**
- Visão geral do sistema
- Documentos pendentes
- Estatísticas
- Ações rápidas

### **Upload**
- Drag & drop
- Validação visual
- Seleção de signatários
- Preview do fluxo

### **Assinatura**
- Interface GOV.BR
- Download do documento
- Validação de assinatura
- Confirmação

### **Auditoria**
- Histórico completo
- Filtros por data
- Exportação de logs
- Relatórios

---

**Este fluxo garante um processo seguro, eficiente e rastreável para assinaturas de notas fiscais.**
