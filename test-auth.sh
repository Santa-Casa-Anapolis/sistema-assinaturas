#!/bin/bash

# Script para testar autenticação com curl
# Uso: ./test-auth.sh

echo "🔧 Teste de Autenticação - Sistema de Assinaturas"
echo "=================================================="

# Configurações
BASE_URL="http://172.16.0.219"
API_URL="${BASE_URL}/api"
LOGIN_URL="${API_URL}/auth/login"

echo ""
echo "📡 Testando conectividade básica..."
curl -I "${BASE_URL}" 2>/dev/null | head -1

echo ""
echo "🔐 Testando login..."
echo "Usuário: supervisor@santacasa.org"
echo "Senha: 123456"

# Fazer login e capturar token
LOGIN_RESPONSE=$(curl -s -X POST "${LOGIN_URL}" \
  -H "Content-Type: application/json" \
  -d '{"username": "supervisor@santacasa.org", "password": "123456"}')

echo "Resposta do login:"
echo "${LOGIN_RESPONSE}" | jq . 2>/dev/null || echo "${LOGIN_RESPONSE}"

# Extrair token da resposta
TOKEN=$(echo "${LOGIN_RESPONSE}" | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Falha ao obter token de autenticação"
    exit 1
fi

echo ""
echo "✅ Token obtido: ${TOKEN:0:20}..."

echo ""
echo "🔍 Testando rota /api/auth/me..."
curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/auth/me" | jq . 2>/dev/null || echo "Resposta sem JSON"

echo ""
echo "📋 Testando rota /api/documents/pending..."
curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/documents/pending" | jq . 2>/dev/null || echo "Resposta sem JSON"

echo ""
echo "📄 Testando rota /api/documents/my-documents..."
curl -s -H "Authorization: Bearer ${TOKEN}" "${API_URL}/documents/my-documents" | jq . 2>/dev/null || echo "Resposta sem JSON"

echo ""
echo "🎉 Teste concluído!"
