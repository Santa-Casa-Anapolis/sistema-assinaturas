@echo off
echo ========================================
echo Status do Sistema de Assinaturas
echo ========================================
echo.

echo Verificando processos Node.js...
tasklist | findstr node.exe >nul
if %errorlevel% equ 0 (
    echo ✅ Sistema está rodando!
    echo.
    echo Processos ativos:
    tasklist | findstr node.exe
) else (
    echo ❌ Sistema não está rodando
)

echo.
echo Verificando portas...
echo.

echo Porta 3000 (Frontend):
netstat -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ✅ Frontend ativo em http://localhost:3000
    netstat -an | findstr :3000
) else (
    echo ❌ Frontend não está rodando
)

echo.
echo Porta 5000 (Backend):
netstat -an | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo ✅ Backend ativo em http://localhost:5000
    netstat -an | findstr :5000
) else (
    echo ❌ Backend não está rodando
)

echo.
echo ========================================
echo Ações disponíveis:
echo - restart.bat     : Reiniciar sistema
echo - start-system.bat: Iniciar sistema
echo - stop-system.bat : Parar sistema
echo ========================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
