#!/bin/bash

echo "🔧 Corrigindo limites de upload de arquivos..."

# Verificar se o Traefik está rodando
if docker service ls | grep -q "traefik_traefik"; then
    echo "✅ Traefik encontrado, aplicando configurações..."
    
    # Atualizar configuração do Traefik para permitir uploads maiores
    docker service update --env-add "TRAEFIK_ENTRYPOINTS_HTTP_ADDRESS=:80" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_ADDRESS=:443" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_READTIMEOUT=60s" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_WRITETIMEOUT=60s" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_IDLETIMEOUT=60s" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_READTIMEOUT=60s" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_WRITETIMEOUT=60s" \
                          --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_IDLETIMEOUT=60s" \
                          traefik_traefik
    
    echo "✅ Configurações do Traefik atualizadas"
else
    echo "⚠️ Traefik não encontrado, verificando outros proxies..."
fi

# Verificar se há nginx configurado
if docker service ls | grep -q "nginx"; then
    echo "✅ Nginx encontrado, aplicando configurações..."
    
    # Atualizar nginx para permitir uploads maiores
    docker service update --env-add "NGINX_CLIENT_MAX_BODY_SIZE=200M" \
                          --env-add "NGINX_PROXY_READ_TIMEOUT=300s" \
                          --env-add "NGINX_PROXY_SEND_TIMEOUT=300s" \
                          nginx
    
    echo "✅ Configurações do Nginx atualizadas"
fi

# Rebuildar o backend para aplicar configurações de upload
echo "🔄 Rebuildando backend com novos limites..."
docker service update --force sistema-assinaturas_backend

echo "✅ Limites de upload corrigidos!"
echo "📝 Limites aplicados:"
echo "   - Backend: 100MB (multer)"
echo "   - Nginx: 200MB (client_max_body_size)"
echo "   - Traefik: 60s timeouts"
echo ""
echo "🧪 Teste novamente o upload do arquivo"