@echo off
echo 🚀 Iniciando sistema em modo PRODUÇÃO (servidor)
echo.
echo 📋 Configuração Produção:
echo    - Backend: http://172.16.0.219:4000
echo    - Frontend: http://172.16.0.219:5000
echo    - PostgreSQL: localhost:5432
echo.

echo 🐳 Parando containers existentes...
docker-compose down

echo 🏗️ Fazendo build das imagens...
docker-compose build

echo 🚀 Iniciando serviços...
docker-compose up -d

echo.
echo ✅ Sistema iniciado em modo PRODUÇÃO!
echo 🌐 Acesse: http://172.16.0.219:5000
echo 🔧 API: http://172.16.0.219:4000
echo.
pause
