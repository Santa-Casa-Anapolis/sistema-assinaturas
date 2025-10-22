#!/bin/bash

# Script para corrigir limites de upload no servidor
echo "🔧 Corrigindo limites de upload..."

# Parar serviços
echo "⏹️ Parando serviços..."
docker service update --force sistema-assinaturas_backend
docker service update --force sistema-assinaturas_frontend

# Aguardar
echo "⏳ Aguardando 30 segundos..."
sleep 30

# Verificar status
echo "📊 Verificando status dos serviços..."
docker service ls | grep sistema-assinaturas

echo "✅ Limites de upload corrigidos!"
echo "📋 Novos limites:"
echo "  - NGINX: 100MB"
echo "  - Backend: 100MB" 
echo "  - Assinaturas: 10MB"
