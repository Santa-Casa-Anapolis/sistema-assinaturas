# 📧 PROBLEMA: Implementação de Notificações por E-mail

## 📋 RESUMO
Tentativas de implementar sistema de notificações por e-mail para supervisores estão falhando ou sendo revertidas durante o deploy.

## 🎯 OBJETIVO
Enviar notificações automáticas quando:
1. **Supervisor envia nota fiscal** → E-mail de confirmação
2. **Nota fiscal é reprovada** → E-mail com justificativa, reprovador e detalhes

## ✅ O QUE JÁ FOI IMPLEMENTADO (MÚLTIPLAS VEZES)

### 1. Módulo de E-mails (`server/email-notifications.js`)
- ✅ Função `sendNotificationEmail()` - E-mail de confirmação
- ✅ Função `sendRejectionEmail()` - E-mail de reprovação  
- ✅ Templates HTML responsivos
- ✅ Configuração SMTP Office 365
- ✅ Fallback para erros (não quebra fluxo)

### 2. Configuração SMTP (`docker-compose.yml`)
```yaml
SMTP_ADDRESS: smtp.office365.com
SMTP_PORT: 587
SMTP_USERNAME: notificacoes_no-reply@santacasa.org
SMTP_PASSWORD: N/943037492748ux
SMTP_DOMAIN: office365.com
SMTP_AUTHENTICATION: login
SMTP_ENABLE_STARTTLS_AUTO: "true"
SMTP_OPENSSL_VERIFY_MODE: peer
APP_URL: http://172.16.0.219:5000
```

### 3. Integração no Backend (`server/index.js`)
- ✅ Import de `email-notifications.js` (linha 16)
- ✅ E-mail enviado após documento confirmado (linhas 2381-2395)
- ✅ E-mail enviado após reprovação (linhas 2485-2500)

## 🔴 O PROBLEMA

### História de Commits
```
✅ e29bb4c - fix: client_max_body_size 100M (commit estável)
❌ 0c38150 - feat: Implementar notificações por e-mail (REVERTIDO)
```

### Por que está sendo revertido?
- ⚠️ Causa desconhecida - usuário solicitou reverção
- ⚠️ Possíveis problemas não documentados
- ⚠️ Testes não realizados no servidor

## 🔍 INVESTIGAÇÃO NECESSÁRIA

### 1. Verificar Credenciais SMTP
```bash
# Testar conexão SMTP Office 365
curl -v smtp.office365.com:587
```

### 2. Testar Autenticação
```javascript
// Criar script de teste
const transporter = nodemailer.createTransporter({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: 'notificacoes_no-reply@santacasa.org',
    pass: 'N/943037492748ux'
  },
  tls: {
    rejectUnauthorized: true
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP Error:', error);
  } else {
    console.log('✅ SMTP OK');
  }
});
```

### 3. Verificar Logs do Backend
```bash
# No servidor, verificar logs após tentar envio
docker logs sistema-assinaturas_backend 2>&1 | grep -i email
docker logs sistema-assinaturas_backend 2>&1 | grep -i smtp
```

## 🚫 CREDENCIAIS ESTÃO NO CÓDIGO
⚠️ **PROBLEMA DE SEGURANÇA:** Senha SMTP está hardcoded no `docker-compose.yml`
- **NÃO DEVE** estar no controle de versão
- Deve usar variáveis de ambiente do Jenkins/secrets do Docker

## 💡 SOLUÇÕES PROPOSTAS

### Opção 1: Usar Jenkins Secrets
```yaml
# docker-compose.yml
environment:
  SMTP_PASSWORD: ${SMTP_PASSWORD}  # Vem do Jenkins

# Jenkinsfile
withCredentials([
  string(credentialsId: 'smtp-password', variable: 'SMTP_PASSWORD')
]) {
  sh 'docker stack deploy -c docker-compose.yml sistema-assinaturas'
}
```

### Opção 2: Testar Localmente Primeiro
1. Criar `.env` local com credenciais
2. Testar envio de e-mail em desenvolvimento
3. Validar que funciona antes de fazer deploy

### Opção 3: Implementar Modo de Teste
```javascript
// server/email-notifications.js
const SEND_EMAILS = process.env.SEND_EMAILS === 'true';

async function sendNotificationEmail(...) {
  if (!SEND_EMAILS) {
    console.log('📧 [MODO TESTE] Email seria enviado para:', email);
    return;
  }
  // ... envio real
}
```

## 📝 CHECKPOINT CRIADO
Branch `checkpoint-pre-emails` foi criada antes da implementação para facilitar rollback.

## 🎯 PRÓXIMOS PASSOS

### 1. Testar SMTP Localmente
```bash
node test-smtp.js
```

### 2. Verificar Se Office 365 Permite Relay
- Verificar se conta `notificacoes_no-reply@santacasa.org` tem permissão de envio
- Verificar se IP do servidor não está bloqueado
- Verificar se autenticação app-specific está habilitada

### 3. Implementar Gracefully
- Adicionar logs detalhados de erro
- Adicionar modo de teste/desenvolvimento
- Não quebrar fluxo se e-mail falhar

### 4. Remover Credenciais do Código
- Mover SMTP_PASSWORD para secrets
- Usar variáveis de ambiente do Jenkins
- Documentar como configurar credenciais

## ⚠️ PONTOS DE ATENÇÃO

1. **Senha no código** - Risco de segurança
2. **Falta de testes** - Implementação nunca foi validada
3. **Logs insuficientes** - Dificulta debugging
4. **Modo fallback** - E-mails devem falhar silenciosamente
5. **Permissões Office 365** - Possível bloqueio de relay

## 📊 STATUS ATUAL
- ✅ Código implementado corretamente
- ✅ Templates criados
- ✅ Integração feita
- ❌ Nunca testado em produção
- ❌ Credenciais em texto plano
- ❌ Motivo da reversão desconhecido
- ⏸️ Aguardando investigação e testes

## 🔗 REFERÊNCIAS

- Branch checkpoint: `checkpoint-pre-emails`
- Arquivo de e-mails: `server/email-notifications.js`
- Configuração: `docker-compose.yml` (linhas 38-48)
- Integração: `server/index.js` (linhas 16, 2381-2395, 2485-2500)

## 📞 SUPORTE

Para problemas com SMTP Office 365:
- Documentação: https://docs.microsoft.com/en-us/exchange/client-developer/legacy-protocols/how-to-authenticate-an-imap-pop-smtp-application-by-using-oauth
- Suporte: suporte@santacasa.org

