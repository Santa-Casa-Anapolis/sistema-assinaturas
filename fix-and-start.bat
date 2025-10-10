@echo off
echo ========================================
echo Corrigindo e Iniciando Sistema
echo ========================================
echo.

echo [1/5] Verificando Docker Desktop...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Docker Desktop nao esta rodando!
    echo Por favor, inicie o Docker Desktop e execute este script novamente.
    pause
    exit /b 1
)
echo OK: Docker esta rodando

echo.
echo [2/5] Parando containers existentes...
docker-compose down

echo.
echo [3/5] Removendo imagem antiga do frontend...
docker rmi santacasa/sistema-assinaturas-frontend:latest 2>nul

echo.
echo [4/5] Reconstruindo frontend com configuracoes corretas...
docker-compose build --no-cache frontend

echo.
echo [5/5] Iniciando todos os servicos...
docker-compose up -d

echo.
echo ========================================
echo Sistema iniciado com sucesso!
echo ========================================
echo.
echo Frontend: http://172.16.0.219:5000
echo Backend:  http://172.16.0.219:4000
echo.
echo Aguarde alguns segundos para os servicos iniciarem completamente.
echo.
pause

