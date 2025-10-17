@echo off
echo 🚀 Iniciando sistema em modo LOCAL (desenvolvimento)
echo.
echo 📋 Configuração Local:
echo    - Backend: http://localhost:4001
echo    - Frontend: http://localhost:3001
echo    - PostgreSQL: localhost:5433
echo.

echo 🐳 Parando containers existentes...
docker-compose -f docker-compose.local.yml down

echo 🏗️ Fazendo build das imagens...
docker-compose -f docker-compose.local.yml build

echo 🚀 Iniciando serviços...
docker-compose -f docker-compose.local.yml up -d

echo.
echo ✅ Sistema iniciado em modo LOCAL!
echo 🌐 Acesse: http://localhost:3001
echo 🔧 API: http://localhost:4001
echo.
pause
