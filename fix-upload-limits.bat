@echo off
echo 🔍 Verificando configurações de upload...

echo.
echo 📁 Verificando arquivos na pasta uploads...
docker exec sistema-assinaturas_backend.1.$(docker service ps sistema-assinaturas_backend --no-trunc -q | head -1) ls -lah /app/uploads/ | head -10

echo.
echo 🔧 Aplicando correções...

echo 1️⃣ Rebuildando backend...
docker service update --force sistema-assinaturas_backend

echo 2️⃣ Verificando Traefik...
if docker service ls | findstr "traefik" >nul 2>&1 (
    echo ✅ Traefik encontrado - aplicando configurações...
    docker service update --label-add "traefik.http.middlewares.upload-limit.buffering.maxRequestBodyBytes=104857600" --label-add "traefik.http.middlewares.upload-limit.buffering.memRequestBodyBytes=10485760" sistema-assinaturas_backend
) else (
    echo ⚠️ Traefik não encontrado
)

echo.
echo ✅ Correções aplicadas!
echo.
echo 📊 Status dos serviços:
docker service ls | findstr "sistema-assinaturas"

echo.
echo 🧪 Teste novamente o upload
echo 💡 Se ainda der erro 413, verifique:
echo    - Tamanho do arquivo (deve ser ^< 100MB)
echo    - Tipo do arquivo (apenas PDF e DOCX)
echo    - Conexão com a internet
