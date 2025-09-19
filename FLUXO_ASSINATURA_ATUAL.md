# 🔄 FLUXO DE ASSINATURA - SISTEMA ATUAL

## 📋 **COMO FUNCIONA O FLUXO DE ASSINATURA**

### **1. UPLOAD DO DOCUMENTO**
- **Quem**: Qualquer usuário logado
- **O que**: Envia nota fiscal (PDF/DOCX)
- **Onde**: Tela de Upload de Documentos
- **Resultado**: Documento salvo na tabela `documents`

### **2. DEFINIÇÃO DO FLUXO DE ASSINATURAS**
- **Quem**: Usuário que fez upload
- **O que**: Seleciona os signatários na ordem
- **Fluxo Padrão**:
  1. **Supervisor** (primeiro)
  2. **Contabilidade** 
  3. **Financeiro**
  4. **Diretoria** (último)
- **Resultado**: Registros criados na tabela `signature_flow`

### **3. NOTIFICAÇÃO AUTOMÁTICA**
- **Sistema**: Envia email para o primeiro signatário
- **Conteúdo**: Link direto para assinatura
- **Prazo**: Link válido por 24 horas

### **4. PROCESSO DE ASSINATURA**
- **Signatário**: Acessa o link do email
- **Login**: Faz login no sistema
- **Revisão**: Visualiza o documento
- **Assinatura**: Clica em "Assinar" (simula GOV.BR)
- **Resultado**: Status atualizado na tabela `signature_flow`

### **5. PRÓXIMO SIGNATÁRIO**
- **Sistema**: Automaticamente notifica o próximo
- **Email**: Enviado para o próximo da fila
- **Processo**: Repete até todos assinarem

### **6. FINALIZAÇÃO**
- **Último Signatário**: Assina o documento
- **Sistema**: Marca documento como "concluído"
- **Arquivo**: Movido para pasta específica
- **Auditoria**: Registrado na tabela `audit_log`

## 🗂️ **TABELAS DO BANCO DE DADOS**

### **`documents`**
- Armazena informações dos documentos
- Status: pending, in_progress, completed
- Caminho do arquivo, título, criador

### **`signature_flow`**
- Controla a ordem das assinaturas
- Status: pending, signed, rejected
- Dados da assinatura, IP, timestamp

### **`audit_log`**
- Registra todas as ações do sistema
- Quem fez, quando, o que, IP
- Histórico completo de auditoria

### **`users`**
- Usuários do sistema
- Roles: admin, supervisor, contabilidade, financeiro, diretoria
- Senhas criptografadas

## 🔐 **SEGURANÇA**

### **Autenticação**
- Login por email e senha
- JWT tokens para sessões
- Senhas criptografadas com bcrypt

### **Autorização**
- Cada usuário só vê seus documentos
- Admin vê tudo
- Fluxo sequencial obrigatório

### **Auditoria**
- Todas as ações são logadas
- IP, timestamp, usuário
- Rastreabilidade completa

## 📧 **NOTIFICAÇÕES**

### **Email Automático**
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

## 🎯 **STATUS DOS DOCUMENTOS**

### **Pendente**
- Aguardando primeira assinatura
- Email enviado para primeiro signatário

### **Em Andamento**
- Algumas assinaturas realizadas
- Aguardando próximos signatários

### **Concluído**
- Todas as assinaturas realizadas
- Documento arquivado
- Processo finalizado

## ⚡ **BENEFÍCIOS**

### **Eficiência**
- Elimina impressão de documentos
- Processo mais rápido
- Notificações automáticas
- Rastreabilidade completa

### **Segurança**
- Assinatura digital simulada
- Auditoria completa
- Controle de acesso
- Histórico permanente

### **Organização**
- Fluxo sequencial controlado
- Status em tempo real
- Notificações automáticas
- Arquivo organizado por setor

## 🔧 **COMO TESTAR O FLUXO**

1. **Login**: Use `admin@santacasa.org` / `123456`
2. **Upload**: Envie um documento PDF
3. **Definir Fluxo**: Selecione os signatários
4. **Assinar**: Faça login como cada signatário
5. **Verificar**: Confirme que o documento foi concluído

## 📊 **MONITORAMENTO**

### **Dashboard Admin**
- Documentos pendentes
- Usuários ativos
- Estatísticas de uso
- Logs de auditoria

### **Dashboard Usuário**
- Meus documentos
- Documentos para assinar
- Histórico de ações
- Status em tempo real
