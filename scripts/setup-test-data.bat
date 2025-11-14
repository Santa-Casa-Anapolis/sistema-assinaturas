@echo off
REM Script Windows para configurar usuários e assinaturas de teste no deploy
REM Execute este script após o deploy do banco de dados

echo ==========================================
echo CONFIGURACAO DE USUARIOS DE TESTE
echo ==========================================
echo.

REM Executar SQL
echo Executando SQL para criar usuarios e assinaturas...
if exist "%~dp0setup-test-users.sql" (
    echo Execute manualmente o SQL: scripts\setup-test-users.sql
    echo Ou use psql:
    echo psql -h localhost -p 5433 -U postgres -d notasfiscais_db -f scripts\setup-test-users.sql
) else (
    echo Arquivo SQL nao encontrado: scripts\setup-test-users.sql
)

echo.

REM Executar script Node.js
echo Criando arquivos de assinatura...
if exist "%~dp0setup-test-signatures.js" (
    node "%~dp0setup-test-signatures.js"
    if %ERRORLEVEL% EQU 0 (
        echo Arquivos de assinatura criados com sucesso!
    ) else (
        echo Erro ao criar arquivos de assinatura
        exit /b 1
    )
) else (
    echo Arquivo JS nao encontrado: scripts\setup-test-signatures.js
)

echo.
echo ==========================================
echo CONFIGURACAO CONCLUIDA!
echo ==========================================
echo.
echo Usuarios de teste criados:
echo   - supervisor.teste / 123456
echo   - contabilidade.teste / 123456
echo   - financeiro.teste / 123456
echo   - diretoria.teste / 123456
echo.
pause

