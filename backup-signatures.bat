@echo off
echo ========================================
echo    BACKUP DAS ASSINATURAS DIGITAIS
echo ========================================
echo.

REM Criar pasta de backup com data e hora
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

set "BACKUP_DIR=backups\signatures_%datestamp%"
echo Criando backup das assinaturas em: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul

echo.
echo [1/3] Fazendo backup dos arquivos de assinatura...
mkdir "%BACKUP_DIR%\files" 2>nul
xcopy "server\uploads\*signature*" "%BACKUP_DIR%\files\" /E /I /Y >nul 2>&1
xcopy "server\uploads\*assinatura*" "%BACKUP_DIR%\files\" /E /I /Y >nul 2>&1
xcopy "server\uploads\*.png" "%BACKUP_DIR%\files\" /E /I /Y >nul 2>&1

REM Contar arquivos copiados
set /a file_count=0
for %%f in ("%BACKUP_DIR%\files\*") do set /a file_count+=1

if %file_count% gtr 0 (
    echo ✅ %file_count% arquivo(s) de assinatura copiado(s)
) else (
    echo ⚠️ Nenhuma assinatura encontrada
)

echo.
echo [2/3] Exportando dados das assinaturas do banco...
psql -h localhost -U postgres -d notasfiscais_db -c "\copy (SELECT * FROM user_signatures) TO '%BACKUP_DIR%\signatures_data.csv' WITH CSV HEADER;" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Dados das assinaturas exportados para CSV
) else (
    echo ❌ Erro ao exportar dados das assinaturas
)

echo.
echo [3/3] Criando relatório de assinaturas...
echo RELATORIO DE ASSINATURAS - %date% %time% > "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo ========================================== >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo. >> "%BACKUP_DIR%\relatorio_assinaturas.txt"

REM Listar arquivos de assinatura
echo ARQUIVOS DE ASSINATURA: >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo ------------------------ >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
if exist "%BACKUP_DIR%\files\*" (
    for %%f in ("%BACKUP_DIR%\files\*") do (
        echo - %%~nxf >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
    )
) else (
    echo Nenhum arquivo encontrado >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
)

echo. >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo DADOS DO BANCO: >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo ---------------- >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo Ver arquivo: signatures_data.csv >> "%BACKUP_DIR%\relatorio_assinaturas.txt"

echo. >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo INSTRUCOES DE RESTAURACAO: >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo --------------------------- >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo 1. Copiar arquivos: xcopy files\ server\uploads\ /E /I /Y >> "%BACKUP_DIR%\relatorio_assinaturas.txt"
echo 2. Restaurar dados: psql -h localhost -U postgres -d notasfiscais_db -c "\copy user_signatures FROM 'signatures_data.csv' WITH CSV HEADER;" >> "%BACKUP_DIR%\relatorio_assinaturas.txt"

echo ✅ Relatório criado

echo.
echo ========================================
echo       BACKUP DAS ASSINATURAS CONCLUÍDO!
echo ========================================
echo.
echo 📁 Local: %BACKUP_DIR%
echo 📊 Arquivos: %file_count%
echo 📋 Relatório: %BACKUP_DIR%\relatorio_assinaturas.txt
echo 📄 Dados CSV: %BACKUP_DIR%\signatures_data.csv
echo.
echo 🔒 IMPORTANTE: As assinaturas são críticas para o sistema!
echo 💾 Mantenha este backup em local seguro e criptografado.
echo.
pause


