#!/bin/bash

echo "🔧 Corrigindo limites de upload no Traefik..."

# Verificar se o Traefik está rodando
if ! docker service ls | grep -q "traefik_traefik"; then
    echo "❌ Traefik não encontrado. Verificando containers..."
    docker ps | grep traefik
    exit 1
fi

echo "✅ Traefik encontrado, aplicando configurações de upload..."

# Atualizar o serviço Traefik com configurações para uploads grandes
docker service update \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_READTIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_WRITETIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_IDLETIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_READTIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_WRITETIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTPS_TRANSPORT_RESPONDINGTIMEOUTS_IDLETIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_READTIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_WRITETIMEOUT=300s" \
    --env-add "TRAEFIK_ENTRYPOINTS_HTTP_TRANSPORT_RESPONDINGTIMEOUTS_IDLETIMEOUT=300s" \
    traefik_traefik

echo "✅ Configurações do Traefik aplicadas"

# Rebuildar o backend para garantir que as configurações sejam aplicadas
echo "🔄 Rebuildando backend..."
docker service update --force sistema-assinaturas_backend

echo "✅ Correções aplicadas!"
echo ""
echo "📝 Limites configurados:"
echo "   - Traefik timeouts: 300s (5 minutos)"
echo "   - Backend multer: 100MB"
echo "   - Nginx: 100MB"
echo ""
echo "🧪 Teste novamente o upload do arquivo"
echo "💡 Se ainda der erro 413, o arquivo pode estar muito grande (>100MB)"
