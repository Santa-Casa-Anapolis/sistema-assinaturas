@echo off
echo ========================================
echo Backup Automático do Banco de Dados
echo ========================================
echo.

REM Criar diretório de backup se não existir
if not exist "backups" mkdir backups

REM Obter data e hora atual
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

echo Criando backup do banco de dados...
echo Timestamp: %timestamp%

REM Criar backup do banco
docker exec nota_fiscais_db pg_dump -U postgres -d nota_fiscais > "backups\backup_%timestamp%.sql"

if %errorlevel% equ 0 (
    echo ✅ Backup criado com sucesso: backups\backup_%timestamp%.sql
    
    REM Manter apenas os últimos 10 backups
    echo Limpando backups antigos...
    for /f "skip=10 delims=" %%i in ('dir /b /o-d backups\backup_*.sql 2^>nul') do del "backups\%%i"
    
    echo ✅ Backup concluído!
) else (
    echo ❌ Erro ao criar backup!
    exit /b 1
)

echo.
echo Backup finalizado em: %date% %time%

