#!/bin/bash

# Script para configurar Let's Encrypt (certificado SSL gratuito e confiável)
# Execute como root ou com sudo

DOMAIN="sistema-assinaturas.santacasa.org"
EMAIL="admin@santacasa.org"  # Substitua pelo email da administração

echo "🔐 Configurando Let's Encrypt para $DOMAIN..."

# Instalar snapd se não estiver instalado
if ! command -v snap &> /dev/null; then
    echo "📦 Instalando snapd..."
    apt update
    apt install -y snapd
fi

# Instalar certbot
echo "📦 Instalando certbot..."
snap install core; snap refresh core
snap install --classic certbot

# Criar link simbólico
ln -sf /snap/bin/certbot /usr/bin/certbot

# Configurar nginx para validação
echo "🔧 Configurando nginx para validação..."

# Criar arquivo de configuração temporário para validação
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

# Testar configuração
nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Configuração nginx válida"
    systemctl reload nginx
else
    echo "❌ Erro na configuração nginx"
    exit 1
fi

# Obter certificado
echo "🔐 Obtendo certificado SSL..."
certbot certonly --webroot -w /var/www/html -d $DOMAIN --email $EMAIL --agree-tos --non-interactive

if [ $? -eq 0 ]; then
    echo "✅ Certificado obtido com sucesso!"
    
    # Ativar configuração SSL final
    rm /etc/nginx/sites-enabled/sistema-assinaturas-temp
    ln -sf /etc/nginx/sites-available/sistema-assinaturas /etc/nginx/sites-enabled/
    
    # Testar configuração final
    nginx -t
    
    if [ $? -eq 0 ]; then
        systemctl reload nginx
        echo "✅ SSL configurado com sucesso!"
        echo ""
        echo "🌐 Acesse: https://$DOMAIN"
        echo "🔄 O certificado será renovado automaticamente"
    else
        echo "❌ Erro na configuração final"
    fi
else
    echo "❌ Erro ao obter certificado"
    echo "💡 Verifique se:"
    echo "   - O DNS está configurado corretamente"
    echo "   - O servidor está acessível na porta 80"
    echo "   - O domínio aponta para este IP"
fi
