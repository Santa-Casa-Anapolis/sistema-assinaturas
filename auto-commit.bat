@echo off
echo ========================================
echo Commit Automático - Sistema Nota Fiscais
echo ========================================
echo.

REM Verificar se estamos em um repositório Git
git status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Não é um repositório Git. Inicializando...
    git init
    echo ✅ Repositório Git inicializado
)

REM Obter data e hora atual
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%"
set "timestamp=%YYYY%-%MM%-%DD% %HH%:%Min%"

echo Adicionando arquivos ao Git...
git add .

REM Verificar se há mudanças para commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo ℹ️  Nenhuma mudança detectada para commit
) else (
    echo Fazendo commit das mudanças...
    git commit -m "Backup automático - %timestamp%"
    
    if %errorlevel% equ 0 (
        echo ✅ Commit realizado com sucesso!
        
        REM Verificar se há um remote configurado
        git remote get-url origin >nul 2>&1
        if %errorlevel% equ 0 (
            echo Enviando para o repositório remoto...
            git push origin main
            if %errorlevel% equ 0 (
                echo ✅ Push realizado com sucesso!
            ) else (
                echo ⚠️  Erro no push. Verifique a configuração do remote.
            )
        ) else (
            echo ℹ️  Nenhum repositório remoto configurado
        )
    ) else (
        echo ❌ Erro ao fazer commit!
    )
)

echo.
echo Commit automático finalizado em: %date% %time%

