# 🔐 Configuração DNS e SSL - Sistema de Assinaturas

## 📋 **Checklist de Configuração**

### 1. **Configuração DNS**

#### **Registros DNS necessários:**
```
Tipo: A
Nome: sistema-assinaturas
Valor: 172.16.0.219
TTL: 3600

Tipo: CNAME (opcional)
Nome: www.sistema-assinaturas
Valor: sistema-assinaturas.santacasa.org
TTL: 3600
```

#### **Passos para configurar DNS:**

1. **Acesse o painel do provedor DNS** (ex: Cloudflare, GoDaddy, Registro.br)
2. **Adicione o registro A** apontando para `172.16.0.219`
3. **Aguarde a propagação** (pode levar até 48 horas)

#### **Verificar configuração DNS:**
```bash
# Testar resolução DNS
nslookup sistema-assinaturas.santacasa.org

# Verificar propagação
dig sistema-assinaturas.santacasa.org A
```

### 2. **Configuração SSL**

#### **Opção A: Certificado Autoassinado (Desenvolvimento)**

```bash
# Executar script de geração
sudo chmod +x generate-ssl-cert.sh
sudo ./generate-ssl-cert.sh
```

#### **Opção B: Let's Encrypt (Produção - RECOMENDADO)**

```bash
# Executar script de configuração
sudo chmod +x setup-letsencrypt.sh
sudo ./setup-letsencrypt.sh
```

### 3. **Configuração Nginx**

#### **Instalar Nginx:**
```bash
sudo apt update
sudo apt install nginx
```

#### **Configurar site:**
```bash
# Copiar configuração
sudo cp nginx.conf /etc/nginx/sites-available/sistema-assinaturas

# Ativar site
sudo ln -s /etc/nginx/sites-available/sistema-assinaturas /etc/nginx/sites-enabled/

# Remover site padrão
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Reiniciar nginx
sudo systemctl restart nginx
```

### 4. **Configuração do Sistema**

#### **Atualizar URLs no sistema:**

1. **Backend (server/index.js):**
```javascript
// Configurar CORS para o novo domínio
const corsOptions = {
  origin: [
    'https://sistema-assinaturas.santacasa.org',
    'http://localhost:3000' // Para desenvolvimento
  ],
  credentials: true
};
```

2. **Frontend (.env):**
```env
REACT_APP_API_URL=https://sistema-assinaturas.santacasa.org/api
REACT_APP_BASE_URL=https://sistema-assinaturas.santacasa.org
```

### 5. **Configuração do Firewall**

```bash
# Permitir tráfego HTTPS
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# Verificar status
sudo ufw status
```

### 6. **Verificação Final**

#### **Testes de conectividade:**
```bash
# Testar HTTP (deve redirecionar para HTTPS)
curl -I http://sistema-assinaturas.santacasa.org

# Testar HTTPS
curl -I https://sistema-assinaturas.santacasa.org

# Verificar certificado SSL
openssl s_client -connect sistema-assinaturas.santacasa.org:443 -servername sistema-assinaturas.santacasa.org
```

#### **Testes no navegador:**
- ✅ Acesse `https://sistema-assinaturas.santacasa.org`
- ✅ Verifique se aparece o cadeado de segurança
- ✅ Teste login e funcionalidades
- ✅ Verifique se não há avisos de segurança

## 🔧 **Troubleshooting**

### **Problema: DNS não resolve**
```bash
# Verificar configuração local
echo "nameserver 8.8.8.8" | sudo tee /etc/resolv.conf

# Limpar cache DNS
sudo systemctl flush-dns
```

### **Problema: Certificado inválido**
```bash
# Verificar certificado
sudo certbot certificates

# Renovar certificado
sudo certbot renew --dry-run
```

### **Problema: Nginx não inicia**
```bash
# Verificar configuração
sudo nginx -t

# Ver logs de erro
sudo tail -f /var/log/nginx/error.log
```

### **Problema: CORS/API não funciona**
```bash
# Verificar se backend está rodando
curl http://localhost:5000/api/health

# Verificar logs do backend
pm2 logs sistema-assinaturas-backend
```

## 📞 **Suporte**

### **Logs importantes:**
- Nginx: `/var/log/nginx/`
- Sistema: `pm2 logs`
- SSL: `sudo certbot certificates`

### **Comandos úteis:**
```bash
# Status dos serviços
sudo systemctl status nginx
pm2 status

# Reiniciar serviços
sudo systemctl restart nginx
pm2 restart all

# Verificar portas
sudo netstat -tlnp | grep :443
sudo netstat -tlnp | grep :80
```

## ✅ **Checklist Final**

- [ ] DNS configurado e propagado
- [ ] Certificado SSL instalado
- [ ] Nginx configurado e funcionando
- [ ] Backend rodando na porta 5000
- [ ] Frontend rodando na porta 3000
- [ ] Firewall configurado
- [ ] Testes de conectividade passando
- [ ] Site acessível via HTTPS
- [ ] Cadeado de segurança aparecendo
- [ ] Login e funcionalidades testadas

---

**🎯 Resultado esperado:** Site acessível via `https://sistema-assinaturas.santacasa.org` com cadeado de segurança verde.
