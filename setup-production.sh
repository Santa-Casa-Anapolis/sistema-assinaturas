#!/bin/bash

# Script completo para configuração de produção
# Execute como root ou com sudo

set -e  # Parar em caso de erro

echo "🚀 Configurando Sistema de Assinaturas para Produção..."
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Execute este script como root ou com sudo"
    exit 1
fi

# Configurações
DOMAIN="sistema-assinaturas.santacasa.org"
EMAIL="admin@santacasa.org"
SERVER_IP="172.16.0.219"

echo "📋 Configurações:"
echo "   Domínio: $DOMAIN"
echo "   Email: $EMAIL"
echo "   IP do servidor: $SERVER_IP"
echo ""

# 1. Instalar dependências
echo "📦 Instalando dependências..."
apt update
apt install -y nginx snapd curl wget git

# 2. Configurar Nginx
echo "🔧 Configurando Nginx..."
cp nginx.conf /etc/nginx/sites-available/sistema-assinaturas

# Remover configuração padrão
rm -f /etc/nginx/sites-enabled/default

# Ativar site
ln -sf /etc/nginx/sites-available/sistema-assinaturas /etc/nginx/sites-enabled/

# Testar configuração
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração Nginx válida"
    systemctl enable nginx
    systemctl start nginx
else
    echo "❌ Erro na configuração Nginx"
    exit 1
fi

# 3. Configurar firewall
echo "🔥 Configurando firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

# 4. Configurar SSL com Let's Encrypt
echo "🔐 Configurando SSL..."

# Instalar certbot
snap install core; snap refresh core
snap install --classic certbot
ln -sf /snap/bin/certbot /usr/bin/certbot

# Criar diretório para validação
mkdir -p /var/www/html

# Configuração temporária para validação
cat > /etc/nginx/sites-available/sistema-assinaturas-temp << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}
EOF

# Ativar configuração temporária
ln -sf /etc/nginx/sites-available/sistema-assinaturas-temp /etc/nginx/sites-enabled/
systemctl reload nginx

# Obter certificado
echo "🔐 Obtendo certificado SSL..."
certbot certonly --webroot -w /var/www/html -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Certificado SSL obtido com sucesso!"
    
    # Ativar configuração SSL final
    rm /etc/nginx/sites-enabled/sistema-assinaturas-temp
    ln -sf /etc/nginx/sites-available/sistema-assinaturas /etc/nginx/sites-enabled/
    
    # Testar configuração final
    nginx -t
    
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        echo "✅ SSL configurado com sucesso!"
    else
        echo "❌ Erro na configuração final SSL"
        exit 1
    fi
else
    echo "⚠️  Erro ao obter certificado SSL"
    echo "💡 Usando certificado autoassinado..."
    
    # Gerar certificado autoassinado
    ./generate-ssl-cert.sh
fi

# 5. Configurar renovação automática
echo "🔄 Configurando renovação automática..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 6. Criar diretórios necessários
echo "📁 Criando diretórios..."
mkdir -p /var/www/sistema-assinaturas/uploads
mkdir -p /var/log/sistema-assinaturas
chown -R www-data:www-data /var/www/sistema-assinaturas

# 7. Configurar PM2 para produção
echo "🔄 Configurando PM2..."
npm install -g pm2

# Configurar PM2 para iniciar com o sistema
pm2 startup
pm2 save

# 8. Testes finais
echo "🧪 Executando testes..."

# Testar Nginx
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx está rodando"
else
    echo "❌ Nginx não está rodando"
fi

# Testar SSL
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo "✅ Site acessível via HTTPS"
else
    echo "❌ Site não acessível via HTTPS"
fi

# Testar redirecionamento HTTP
if curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN | grep -q "301\|302"; then
    echo "✅ Redirecionamento HTTP para HTTPS funcionando"
else
    echo "❌ Redirecionamento HTTP não funcionando"
fi

echo ""
echo "🎉 Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configure o DNS para apontar $DOMAIN para $SERVER_IP"
echo "   2. Aguarde a propagação DNS (pode levar até 48 horas)"
echo "   3. Inicie o backend: cd server && npm start"
echo "   4. Inicie o frontend: cd client && npm start"
echo "   5. Acesse: https://$DOMAIN"
echo ""
echo "🔧 Comandos úteis:"
echo "   - Status Nginx: systemctl status nginx"
echo "   - Logs Nginx: tail -f /var/log/nginx/sistema-assinaturas.error.log"
echo "   - Renovar SSL: certbot renew"
echo "   - Status PM2: pm2 status"
echo ""
echo "📞 Suporte:"
echo "   - Logs: /var/log/nginx/"
echo "   - Configuração: /etc/nginx/sites-available/sistema-assinaturas"
echo "   - Certificados: /etc/letsencrypt/live/$DOMAIN/"
