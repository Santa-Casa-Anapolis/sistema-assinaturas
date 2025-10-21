#!/bin/bash

# Script para gerar certificado SSL autoassinado
# Execute como root ou com sudo

echo "🔐 Gerando certificado SSL para sistema-assinaturas.santacasa.org..."

# Criar diretórios se não existirem
mkdir -p /etc/ssl/certs
mkdir -p /etc/ssl/private

# Gerar chave privada
openssl genrsa -out /etc/ssl/private/sistema-assinaturas.key 2048

# Gerar certificado autoassinado
openssl req -new -x509 -key /etc/ssl/private/sistema-assinaturas.key \
    -out /etc/ssl/certs/sistema-assinaturas.crt \
    -days 365 \
    -subj "/C=BR/ST=GO/L=Anapolis/O=Santa Casa/OU=TI/CN=sistema-assinaturas.santacasa.org"

# Ajustar permissões
chmod 600 /etc/ssl/private/sistema-assinaturas.key
chmod 644 /etc/ssl/certs/sistema-assinaturas.crt

echo "✅ Certificado SSL gerado com sucesso!"
echo "📁 Certificado: /etc/ssl/certs/sistema-assinaturas.crt"
echo "🔑 Chave privada: /etc/ssl/private/sistema-assinaturas.key"
echo ""
echo "⚠️  IMPORTANTE: Este é um certificado autoassinado."
echo "   Para produção, use um certificado de uma CA confiável (Let's Encrypt)."
echo ""
echo "🔧 Próximos passos:"
echo "   1. Configure o DNS para apontar para este servidor"
echo "   2. Instale o nginx: sudo apt install nginx"
echo "   3. Copie nginx.conf para /etc/nginx/sites-available/"
echo "   4. Ative o site: sudo ln -s /etc/nginx/sites-available/sistema-assinaturas /etc/nginx/sites-enabled/"
echo "   5. Teste: sudo nginx -t"
echo "   6. Reinicie: sudo systemctl restart nginx"
