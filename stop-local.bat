@echo off
echo 🛑 Parando todos os serviços locais...
echo.

echo 🐳 Parando containers Docker locais...
docker-compose down
docker-compose -f docker-compose.local.yml down 2>nul

echo 🧹 Removendo containers órfãos...
docker container prune -f

echo 🗑️ Removendo volumes não utilizados...
docker volume prune -f

echo 🌐 Parando serviços Node.js locais...
taskkill /f /im node.exe 2>nul
taskkill /f /im npm.exe 2>nul

echo 🔌 Liberando portas locais...
netstat -ano | findstr :3000 >nul 2>&1 && (
    echo ⚠️ Porta 3000 ainda em uso
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /f /pid %%a 2>nul
)

netstat -ano | findstr :5000 >nul 2>&1 && (
    echo ⚠️ Porta 5000 ainda em uso
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do taskkill /f /pid %%a 2>nul
)

netstat -ano | findstr :4000 >nul 2>&1 && (
    echo ⚠️ Porta 4000 ainda em uso
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do taskkill /f /pid %%a 2>nul
)

echo.
echo ✅ Todos os serviços locais foram parados!
echo 🚀 Agora o sistema roda apenas no servidor via GitHub/Jenkins
echo.
echo 📋 Para verificar o status do servidor:
echo    - Sistema: http://172.16.0.219:5000
echo    - API: http://172.16.0.219:4000
echo.
pause
