#!/bin/bash

echo "🔍 VERIFICAÇÃO DO STATUS DO SERVIDOR"
echo "===================================="

echo ""
echo "1. Verificando containers Docker..."
docker ps --filter "name=sistema-assinaturas" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "2. Verificando logs do backend (últimas 10 linhas)..."
docker service logs sistema-assinaturas_backend --tail 10

echo ""
echo "3. Verificando configuração NGINX..."
docker exec sistema-assinaturas_frontend.1.$(docker service ps sistema-assinaturas_frontend --filter desired-state=running --format "{{.ID}}" | head -1) cat /etc/nginx/nginx.conf | grep -A 5 -B 5 "Authorization"

echo ""
echo "4. Testando endpoint de login..."
curl -X POST http://172.16.0.219:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"supervisor@santacasa.org","password":"supervisor123"}' \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "5. Verificando variáveis de ambiente do backend..."
docker exec sistema-assinaturas_backend.1.$(docker service ps sistema-assinaturas_backend --filter desired-state=running --format "{{.ID}}" | head -1) env | grep JWT_SECRET

echo ""
echo "🏁 Verificação concluída!"
