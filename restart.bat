@echo off
echo ========================================
echo Reiniciando Sistema de Assinaturas
echo ========================================
echo.

echo Parando todos os processos Node.js...
taskkill /f /im node.exe 2>nul
if %errorlevel% equ 0 (
    echo ✅ Processos Node.js parados com sucesso!
) else (
    echo ℹ️ Nenhum processo Node.js encontrado.
)

echo.
echo Aguardando 3 segundos...
timeout /t 3 /nobreak >nul

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
echo ✅ Sistema Reiniciado com Sucesso!
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
