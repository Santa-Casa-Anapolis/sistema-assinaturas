@echo off
echo ========================================
echo   Preparar Deploy para Servidor
echo ========================================
echo.

echo [1/2] Recompilando frontend localmente...
cd client
call npm run build
if %errorlevel% neq 0 (
    echo ERRO: Falha ao compilar frontend!
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] Frontend compilado com sucesso!
echo.
echo ========================================
echo   PROXIMOS PASSOS:
echo ========================================
echo.
echo 1. Acesse o servidor (RDP/SSH): 172.16.0.219
echo.
echo 2. No servidor, va ate a pasta do projeto
echo.
echo 3. Execute os seguintes comandos:
echo.
echo    git pull
echo    cd client
echo    npm run build
echo    cd ..
echo.
echo 4. Reinicie o servico do Node.js no servidor
echo.
echo OU copie a pasta 'client/build' para o servidor
echo.
pause

