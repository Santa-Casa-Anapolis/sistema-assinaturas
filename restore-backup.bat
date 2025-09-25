@echo off
echo ========================================
echo    RESTAURACAO DO SISTEMA DE BACKUP
echo ========================================
echo.

REM Verificar se existe pasta de backups
if not exist "backups" (
    echo ❌ Pasta de backups não encontrada!
    echo Crie um backup primeiro usando backup-system.bat
    pause
    exit /b 1
)

echo Pastas de backup disponíveis:
echo -----------------------------
dir /b /ad backups\ 2>nul | findstr /v "backup_"
dir /b /ad backups\ 2>nul | findstr "backup_"
echo.

set /p BACKUP_NAME="Digite o nome da pasta de backup (ex: backup_2025-09-23_15-30-45): "

if not exist "backups\%BACKUP_NAME%" (
    echo ❌ Pasta de backup não encontrada: backups\%BACKUP_NAME%
    pause
    exit /b 1
)

echo.
echo ⚠️  ATENÇÃO: Esta operação irá SOBRESCREVER dados existentes!
echo.
set /p CONFIRM="Tem certeza que deseja continuar? (S/N): "
if /i not "%CONFIRM%"=="S" (
    echo Operação cancelada.
    pause
    exit /b 0
)

echo.
echo [1/4] Parando serviços...
taskkill /f /im node.exe >nul 2>&1
echo ✅ Serviços parados

echo.
echo [2/4] Restaurando banco de dados...
if exist "backups\%BACKUP_NAME%\database_backup.sql" (
    psql -h localhost -U postgres -d notasfiscais_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" >nul 2>&1
    psql -h localhost -U postgres -d notasfiscais_db < "backups\%BACKUP_NAME%\database_backup.sql" >nul 2>&1
    if %errorlevel% equ 0 (
        echo ✅ Banco de dados restaurado
    ) else (
        echo ❌ Erro ao restaurar banco de dados
    )
) else (
    echo ⚠️ Arquivo de backup do banco não encontrado
)

echo.
echo [3/4] Restaurando arquivos de assinatura...
if exist "backups\%BACKUP_NAME%\signatures" (
    xcopy "backups\%BACKUP_NAME%\signatures\*" "server\uploads\" /E /I /Y >nul 2>&1
    echo ✅ Assinaturas restauradas
) else (
    echo ⚠️ Pasta de assinaturas não encontrada
)

echo.
echo [4/4] Restaurando documentos...
if exist "backups\%BACKUP_NAME%\documents" (
    xcopy "backups\%BACKUP_NAME%\documents\*" "server\uploads\" /E /I /Y >nul 2>&1
    echo ✅ Documentos restaurados
) else (
    echo ⚠️ Pasta de documentos não encontrada
)

echo.
echo ========================================
echo         RESTAURACAO CONCLUÍDA!
echo ========================================
echo.
echo ✅ Sistema restaurado do backup: %BACKUP_NAME%
echo.
echo 🔄 Próximos passos:
echo 1. Iniciar o servidor: cd server ^&^& node index.js
echo 2. Iniciar o frontend: cd client ^&^& npm start
echo 3. Verificar se tudo está funcionando
echo.
pause


