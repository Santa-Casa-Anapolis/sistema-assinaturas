#!/bin/bash

echo "========================================"
echo "Sistema de Assinaturas - Docker Setup"
echo "========================================"
echo

echo "Verificando se o Docker está instalado..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não está instalado!"
    echo
    echo "Por favor, instale o Docker:"
    echo "https://docs.docker.com/get-docker/"
    echo
    exit 1
fi

echo "✅ Docker encontrado!"
echo

echo "Verificando se o Docker está rodando..."
if ! docker info &> /dev/null; then
    echo "❌ Docker não está rodando!"
    echo "Por favor, inicie o Docker e tente novamente."
    exit 1
fi

echo "✅ Docker está rodando!"
echo

echo "Iniciando PostgreSQL no Docker..."
docker-compose up -d postgres

echo
echo "Aguardando PostgreSQL inicializar..."
sleep 10

echo
echo "Verificando status dos containers..."
docker-compose ps

echo
echo "========================================"
echo "🐘 PostgreSQL está rodando!"
echo
echo "📊 Banco de dados: nota_fiscais"
echo "👤 Usuário: postgres"
echo "🔑 Senha: postgres"
echo "🌐 Porta: 5432"
echo
echo "📊 pgAdmin (opcional):"
echo "🌐 http://localhost:8080"
echo "👤 Email: admin@empresa.com"
echo "🔑 Senha: admin123"
echo "========================================"
echo

read -p "Deseja iniciar o sistema agora? (s/N): " choice
if [[ $choice =~ ^[Ss]$ ]]; then
    echo
    echo "Iniciando o sistema..."
    npm run dev
else
    echo
    echo "Para iniciar o sistema manualmente, execute:"
    echo "npm run dev"
fi
