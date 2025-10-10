@echo off
echo ========================================
echo   Sistema de Assinaturas - Modo Dev
echo ========================================
echo.

echo [1/3] Verificando portas...
netstat -ano | findstr ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo AVISO: Porta 3000 ja esta em uso!
    echo Por favor, feche o processo e tente novamente.
    pause
    exit /b 1
)

netstat -ano | findstr ":5000" >nul 2>&1
if %errorlevel% equ 0 (
    echo AVISO: Porta 5000 ja esta em uso!
    echo Por favor, feche o processo e tente novamente.
    pause
    exit /b 1
)

echo [2/3] Iniciando Backend (porta 5000)...
start "Backend - Sistema de Assinaturas" cmd /k "cd server && node index.js"
timeout /t 3 /nobreak >nul

echo [3/3] Iniciando Frontend em modo DEV (porta 3000)...
start "Frontend Dev - Sistema de Assinaturas" cmd /k "cd client && npm start"

echo.
echo ========================================
echo   Sistema iniciado com sucesso!
echo ========================================
echo.
echo Frontend Dev: http://localhost:3000
echo Backend API:   http://localhost:5000
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul

