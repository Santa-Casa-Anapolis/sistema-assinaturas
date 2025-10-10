@echo off
echo ========================================
echo   Atualizar Sistema (EXECUTE NO SERVIDOR)
echo ========================================
echo.

echo IMPORTANTE: Este script deve ser executado DENTRO do servidor 172.16.0.219
echo.
pause

echo [1/4] Puxando atualizacoes do Git...
git pull
if %errorlevel% neq 0 (
    echo AVISO: Erro ao fazer git pull (continuando mesmo assim)
)

echo.
echo [2/4] Recompilando frontend...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha ao compilar frontend!
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Parando servidor se estiver rodando...
taskkill /F /FI "WINDOWTITLE eq Backend*" >nul 2>&1
timeout /t 2 /nobreak >nul

echo.
echo [4/4] Iniciando servidor atualizado...
start "Backend - Sistema de Assinaturas" cmd /k "cd server && node index.js"

echo.
echo ========================================
echo   Sistema atualizado com sucesso!
echo ========================================
echo.
echo Acesse: http://172.16.0.219:5000
echo.
echo Aguarde alguns segundos para o servidor iniciar
echo Depois recarregue a pagina com Ctrl+F5
echo.
pause

