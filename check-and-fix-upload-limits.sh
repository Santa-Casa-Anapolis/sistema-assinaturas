#!/bin/bash

echo "🔍 Verificando configurações de upload..."

# Verificar tamanho do arquivo que está causando problema
echo "📁 Verificando arquivos na pasta uploads..."
docker exec sistema-assinaturas_backend.1.$(docker service ps sistema-assinaturas_backend --no-trunc -q | head -1) ls -lah /app/uploads/ | head -10

echo ""
echo "🔧 Aplicando correções..."

# 1. Rebuildar backend com configurações atualizadas
echo "1️⃣ Rebuildando backend..."
docker service update --force sistema-assinaturas_backend

# 2. Verificar se há nginx configurado e atualizar
if docker service ls | grep -q "nginx"; then
    echo "2️⃣ Atualizando nginx..."
    docker service update --force nginx
fi

# 3. Verificar Traefik
if docker service ls | grep -q "traefik"; then
    echo "3️⃣ Traefik encontrado - aplicando configurações..."
    # Tentar aplicar configurações via labels
    docker service update \
        --label-add "traefik.http.middlewares.upload-limit.buffering.maxRequestBodyBytes=104857600" \
        --label-add "traefik.http.middlewares.upload-limit.buffering.memRequestBodyBytes=10485760" \
        sistema-assinaturas_backend
fi

echo ""
echo "✅ Correções aplicadas!"
echo ""
echo "📊 Status dos serviços:"
docker service ls | grep -E "(sistema-assinaturas|traefik|nginx)"

echo ""
echo "🧪 Teste novamente o upload"
echo "💡 Se ainda der erro 413, verifique:"
echo "   - Tamanho do arquivo (deve ser < 100MB)"
echo "   - Tipo do arquivo (apenas PDF e DOCX)"
echo "   - Conexão com a internet"
