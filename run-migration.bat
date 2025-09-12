@echo off
echo Executando migração para suportar múltiplos arquivos por documento...
echo.

REM Verificar se o Docker está rodando
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker não está rodando. Iniciando containers...
    docker-compose up -d
    timeout /t 10
)

REM Executar a migração
echo Executando script de migração...
docker exec -i notafiscais-postgres-1 psql -U postgres -d notafiscais < migration-multiple-files.sql

if %errorlevel% equ 0 (
    echo.
    echo ✅ Migração executada com sucesso!
    echo O sistema agora suporta múltiplos arquivos por documento.
) else (
    echo.
    echo ❌ Erro ao executar a migração.
    echo Verifique se o container PostgreSQL está rodando.
)

echo.
pause
