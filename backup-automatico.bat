@echo off
REM ========================================
REM    BACKUP AUTOMATICO DO SISTEMA
REM    Para uso com Agendador de Tarefas
REM ========================================

REM Log de execução
echo %date% %time% - Iniciando backup automatico >> backup_log.txt

REM Criar pasta de backup com data
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "datestamp=%YYYY%-%MM%-%DD%"

set "BACKUP_DIR=backups\auto_%datestamp%"
mkdir "%BACKUP_DIR%" 2>nul

REM Backup do banco (apenas se não existir backup do dia)
if not exist "%BACKUP_DIR%\database_backup.sql" (
    pg_dump -h localhost -U postgres -d notasfiscais_db > "%BACKUP_DIR%\database_backup.sql" 2>nul
    if %errorlevel% equ 0 (
        echo %date% %time% - Backup do banco concluido >> backup_log.txt
    ) else (
        echo %date% %time% - ERRO: Falha no backup do banco >> backup_log.txt
    )
)

REM Backup das assinaturas (sempre atualizar)
mkdir "%BACKUP_DIR%\signatures" 2>nul
xcopy "server\uploads\*signature*" "%BACKUP_DIR%\signatures\" /E /I /Y >nul 2>&1
xcopy "server\uploads\*assinatura*" "%BACKUP_DIR%\signatures\" /E /I /Y >nul 2>&1
xcopy "server\uploads\*.png" "%BACKUP_DIR%\signatures\" /E /I /Y >nul 2>&1

REM Contar arquivos de assinatura
set /a sig_count=0
for %%f in ("%BACKUP_DIR%\signatures\*") do set /a sig_count+=1
echo %date% %time% - %sig_count% assinaturas copiadas >> backup_log.txt

REM Backup dos documentos (apenas novos)
mkdir "%BACKUP_DIR%\documents" 2>nul
xcopy "server\uploads\*.pdf" "%BACKUP_DIR%\documents\" /E /I /Y >nul 2>&1

REM Limpeza de backups antigos (manter apenas 7 dias)
forfiles /p "backups" /m "auto_*" /d -7 /c "cmd /c if @isdir==TRUE rmdir /s /q @path" 2>nul

echo %date% %time% - Backup automatico concluido >> backup_log.txt

REM Log de erro se houver problemas
if %errorlevel% neq 0 (
    echo %date% %time% - ERRO no backup automatico >> backup_log.txt
)














