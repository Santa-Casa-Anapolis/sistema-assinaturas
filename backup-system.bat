@echo off
echo ========================================
echo    BACKUP DO SISTEMA DE NOTAS FISCAIS
echo ========================================
echo.

REM Criar pasta de backup com data e hora
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set "BACKUP_DIR=backups\backup_%datestamp%"
echo Criando backup em: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo.
echo [1/6] Fazendo backup do banco de dados PostgreSQL...
pg_dump -h localhost -U postgres -d notasfiscais_db > "%BACKUP_DIR%\database_backup.sql"
if %errorlevel% equ 0 (
    echo ✅ Backup do banco concluído
) else (
    echo ❌ Erro no backup do banco
)

echo.
echo [2/6] Fazendo backup dos arquivos de assinatura...
mkdir "%BACKUP_DIR%\signatures" 2>nul
xcopy "server\uploads\*signature*" "%BACKUP_DIR%\signatures\" /E /I /Y >nul 2>&1
xcopy "server\uploads\*assinatura*" "%BACKUP_DIR%\signatures\" /E /I /Y >nul 2>&1
if exist "%BACKUP_DIR%\signatures\*" (
    echo ✅ Backup das assinaturas concluído
) else (
    echo ⚠️ Nenhuma assinatura encontrada para backup
)

echo.
echo [3/6] Fazendo backup dos documentos...
mkdir "%BACKUP_DIR%\documents" 2>nul
xcopy "server\uploads\*.pdf" "%BACKUP_DIR%\documents\" /E /I /Y >nul 2>&1
if exist "%BACKUP_DIR%\documents\*" (
    echo ✅ Backup dos documentos concluído
) else (
    echo ⚠️ Nenhum documento encontrado para backup
)

echo.
echo [4/6] Fazendo backup do código fonte...
mkdir "%BACKUP_DIR%\source" 2>nul
xcopy "server\*.js" "%BACKUP_DIR%\source\" /Y >nul 2>&1
xcopy "client\src\*.js" "%BACKUP_DIR%\source\" /Y >nul 2>&1
xcopy "client\src\components\*.js" "%BACKUP_DIR%\source\" /Y >nul 2>&1
xcopy "*.sql" "%BACKUP_DIR%\source\" /Y >nul 2>&1
xcopy "*.json" "%BACKUP_DIR%\source\" /Y >nul 2>&1
echo ✅ Backup do código fonte concluído

echo.
echo [5/6] Fazendo backup das configurações...
mkdir "%BACKUP_DIR%\config" 2>nul
xcopy "server\package.json" "%BACKUP_DIR%\config\" /Y >nul 2>&1
xcopy "client\package.json" "%BACKUP_DIR%\config\" /Y >nul 2>&1
xcopy "docker-compose.yml" "%BACKUP_DIR%\config\" /Y >nul 2>&1
xcopy "init.sql" "%BACKUP_DIR%\config\" /Y >nul 2>&1
echo ✅ Backup das configurações concluído

echo.
echo [6/6] Criando arquivo de informações do backup...
echo Backup criado em: %date% %time% > "%BACKUP_DIR%\backup_info.txt"
echo Sistema: Notas Fiscais - Assinaturas Digitais >> "%BACKUP_DIR%\backup_info.txt"
echo Banco: notasfiscais_db >> "%BACKUP_DIR%\backup_info.txt"
echo Usuario: postgres >> "%BACKUP_DIR%\backup_info.txt"
echo. >> "%BACKUP_DIR%\backup_info.txt"
echo ESTRUTURA DO BACKUP: >> "%BACKUP_DIR%\backup_info.txt"
echo - database_backup.sql: Backup completo do banco PostgreSQL >> "%BACKUP_DIR%\backup_info.txt"
echo - signatures/: Arquivos de assinatura dos usuarios >> "%BACKUP_DIR%\backup_info.txt"
echo - documents/: Documentos PDF do sistema >> "%BACKUP_DIR%\backup_info.txt"
echo - source/: Codigo fonte do sistema >> "%BACKUP_DIR%\backup_info.txt"
echo - config/: Arquivos de configuracao >> "%BACKUP_DIR%\backup_info.txt"
echo. >> "%BACKUP_DIR%\backup_info.txt"
echo PARA RESTAURAR: >> "%BACKUP_DIR%\backup_info.txt"
echo 1. Restaurar banco: psql -h localhost -U postgres -d notasfiscais_db ^< database_backup.sql >> "%BACKUP_DIR%\backup_info.txt"
echo 2. Copiar arquivos: xcopy signatures\ server\uploads\ /E /I /Y >> "%BACKUP_DIR%\backup_info.txt"
echo 3. Copiar documentos: xcopy documents\ server\uploads\ /E /I /Y >> "%BACKUP_DIR%\backup_info.txt"

echo ✅ Arquivo de informações criado

echo.
echo ========================================
echo           BACKUP CONCLUÍDO!
echo ========================================
echo.
echo 📁 Local: %BACKUP_DIR%
echo 📊 Tamanho: 
for /f %%i in ('dir "%BACKUP_DIR%" /s /-c ^| find "bytes"') do echo    %%i
echo.
echo 🔒 IMPORTANTE: Mantenha este backup em local seguro!
echo 📋 Instruções de restauração estão em: %BACKUP_DIR%\backup_info.txt
echo.
pause


