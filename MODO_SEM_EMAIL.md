# 📧 Modo Sem Email - Sistema de Assinaturas

## 🎯 Sobre o Modo Sem Email

O sistema foi configurado para funcionar **sem necessidade de configuração de email**, ideal para:
- ✅ Testes e desenvolvimento
- ✅ Demonstrações
- ✅ Ambientes internos
- ✅ Quando não há acesso a servidor de email

## 🔧 Como Funciona

### Notificações Simuladas
Em vez de enviar emails reais, o sistema:
- Exibe notificações no **console do servidor**
- Mostra informações completas sobre cada notificação
- Mantém o fluxo de trabalho intacto

### Exemplo de Notificação no Console
```
📧 NOTIFICAÇÃO SIMULADA:
   Para: supervisor.setora@empresa.com
   Documento: Nota Fiscal #2024-001
   Link: http://localhost:3000/sign/123
   ⚠️  Em modo de desenvolvimento - emails desabilitados
   ──────────────────────────────────────────────
```

## 🚀 Como Usar

### 1. Instalação
```bash
# Windows
.\start.bat

# Linux/Mac
./start.sh
```

### 2. Acesso ao Sistema
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

### 3. Usuários de Teste
- **Fornecedor**: fornecedor@empresa.com / 123456
- **Supervisor**: supervisor.setora@empresa.com / 123456
- **Contabilidade**: contabilidade@empresa.com / 123456
- **Financeiro**: financeiro@empresa.com / 123456
- **Diretoria**: diretoria@empresa.com / 123456

## 📋 Fluxo de Trabalho

### 1. Upload de Documento
1. Faça login como **Fornecedor**
2. Vá em "Upload de Documento"
3. Selecione um arquivo (PDF/DOCX)
4. Defina a ordem dos signatários
5. Envie o documento

### 2. Notificação Simulada
- O sistema exibirá no console:
  ```
  📧 NOTIFICAÇÃO SIMULADA:
     Para: supervisor.setora@empresa.com
     Documento: [Nome do Documento]
     Link: http://localhost:3000/sign/[ID]
  ```

### 3. Assinatura
1. Faça login como o próximo signatário
2. Vá em "Documentos Pendentes"
3. Clique em "Assinar"
4. Digite a assinatura GOV.BR (simulada)
5. Confirme a assinatura

### 4. Próximo Signatário
- O sistema automaticamente notifica o próximo na fila
- O processo continua até todos assinarem

## 🔄 Ativando Modo com Email

Para ativar as notificações por email reais:

### 1. Editar server/.env
```env
# Descomente e configure:
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-aplicativo-gmail
```

### 2. Configurar Gmail
1. Ative verificação em 2 etapas
2. Gere senha de aplicativo
3. Use a senha de aplicativo no EMAIL_PASS

### 3. Reiniciar o Sistema
```bash
npm run dev
```

## 📊 Vantagens do Modo Sem Email

### ✅ Facilidade
- Não precisa configurar email
- Funciona imediatamente
- Ideal para testes

### ✅ Controle
- Todas as notificações visíveis no console
- Fácil debug e acompanhamento
- Sem dependências externas

### ✅ Segurança
- Não expõe credenciais de email
- Funciona em redes restritas
- Sem risco de spam

## 🎯 Casos de Uso

### Desenvolvimento
- Testes de funcionalidade
- Debug de fluxo
- Demonstrações

### Ambientes Internos
- Redes corporativas restritas
- Servidores sem acesso à internet
- Testes de integração

### Demonstrações
- Apresentações para clientes
- Treinamentos
- Workshops

## 📝 Logs de Auditoria

Mesmo sem email, o sistema mantém:
- ✅ Logs completos de auditoria
- ✅ Histórico de todas as ações
- ✅ Rastreabilidade total
- ✅ Timestamps e IPs

## 🔧 Configuração Avançada

### Personalizar Notificações
Edite a função `sendNotificationEmail` em `server/index.js`:

```javascript
function sendNotificationEmail(email, documentTitle, documentId) {
  console.log('📧 NOTIFICAÇÃO SIMULADA:');
  console.log(`   Para: ${email}`);
  console.log(`   Documento: ${documentTitle}`);
  console.log(`   Link: http://localhost:3000/sign/${documentId}`);
  // Adicione mais informações conforme necessário
}
```

### Integração com Outros Sistemas
- Webhooks para notificações
- Integração com Slack/Discord
- Notificações push
- SMS (via APIs)

---

**O modo sem email torna o sistema mais acessível e fácil de testar, mantendo toda a funcionalidade principal!** 🎉
