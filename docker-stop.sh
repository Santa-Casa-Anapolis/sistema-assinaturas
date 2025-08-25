#!/bin/bash

echo "========================================"
echo "Parando Containers Docker"
echo "========================================"
echo

echo "Parando todos os containers..."
docker-compose down

echo
echo "Removendo volumes (opcional)..."
read -p "Deseja remover os volumes também? Isso apagará todos os dados! (s/N): " choice
if [[ $choice =~ ^[Ss]$ ]]; then
    echo "Removendo volumes..."
    docker-compose down -v
    echo "✅ Volumes removidos!"
else
    echo "✅ Volumes mantidos - dados preservados!"
fi

echo
echo "Status dos containers:"
docker-compose ps
