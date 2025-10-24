@echo off
echo 🔧 Corrigindo limites de upload de arquivos...

echo.
echo 1️⃣ Rebuildando backend com configurações atualizadas...
docker service update --force sistema-assinaturas_backend

echo.
echo 2️⃣ Verificando se há Traefik configurado...
docker service ls | findstr "traefik"

echo.
echo 3️⃣ Aplicando configurações do Traefik (se necessário)...
docker service update --label-add "traefik.http.middlewares.upload-limit.buffering.maxRequestBodyBytes=104857600" sistema-assinaturas_backend

echo.
echo ✅ Correções aplicadas!
echo.
echo 📝 Limites configurados:
echo    - Backend multer: 100MB
echo    - Traefik: 100MB
echo    - Timeouts: 300s
echo.
echo 🧪 Teste novamente o upload do arquivo
echo 💡 Se ainda der erro 413, o arquivo pode estar muito grande
