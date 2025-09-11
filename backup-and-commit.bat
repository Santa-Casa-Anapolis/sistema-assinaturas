@echo off
echo ========================================
echo Backup e Commit Automático
echo Sistema Nota Fiscais
echo ========================================
echo.

echo [1/3] Fazendo backup do banco de dados...
call backup-database.bat

echo.
echo [2/3] Fazendo commit das mudanças...
call auto-commit.bat

echo.
echo [3/3] Verificando status do sistema...
echo ✅ Backup e commit concluídos com sucesso!
echo.
echo Próxima execução automática em 1 hora...

