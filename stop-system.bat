@echo off
echo ========================================
echo Parando Sistema de Assinaturas
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
echo Verificando portas em uso...
netstat -an | findstr :3000 >nul
if %errorlevel% equ 0 (
    echo ⚠️ Porta 3000 ainda em uso
) else (
    echo ✅ Porta 3000 liberada
)

netstat -an | findstr :5000 >nul
if %errorlevel% equ 0 (
    echo ⚠️ Porta 5000 ainda em uso
) else (
    echo ✅ Porta 5000 liberada
)

echo.
echo ========================================
echo ✅ Sistema Parado com Sucesso!
echo ========================================
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
