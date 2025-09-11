@echo off
echo ========================================
echo Iniciando Sistema de Assinaturas
echo ========================================
echo.

echo Verificando se o sistema já está rodando...
tasklist | findstr node.exe >nul
if %errorlevel% equ 0 (
    echo ⚠️ Sistema já está rodando!
    echo Deseja reiniciar? (S/N)
    set /p choice=
    if /i "%choice%"=="S" (
        echo Reiniciando sistema...
        call restart.bat
        exit /b
    ) else (
        echo Mantendo sistema atual.
        exit /b
    )
)

echo.
echo Iniciando Backend...
start "Backend - Sistema de Assinaturas" cmd /k "cd server && node index.js"

echo.
echo Aguardando 5 segundos para o backend inicializar...
timeout /t 5 /nobreak >nul

echo.
echo Iniciando Frontend...
start "Frontend - Sistema de Assinaturas" cmd /k "cd client && npm start"

echo.
echo ========================================
echo ✅ Sistema Iniciado com Sucesso!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Usuários de teste:
echo - Admin: admin@empresa.com / admin123
echo - Supervisor: supervisor.setora@empresa.com / 123456
echo - Contabilidade: contabilidade@empresa.com / 123456
echo - Financeiro: financeiro@empresa.com / 123456
echo - Diretoria: diretoria@empresa.com / 123456
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
