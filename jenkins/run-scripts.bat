@echo off
REM 🚀 Script para executar scripts de automação no Windows
REM Sistema de Assinaturas CI/CD

echo 🚀 === EXECUTANDO SCRIPTS DE AUTOMAÇÃO ===
echo 📅 Data: %date% %time%
echo.

REM Verificar se estamos na raiz do projeto
if not exist "package.json" (
    echo ❌ package.json não encontrado!
    echo 📁 Navegue para a raiz do projeto primeiro
    pause
    exit /b 1
)

echo ✅ Estamos na raiz do projeto

REM Verificar se Git Bash está disponível
where bash >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git Bash não encontrado!
    echo 📥 Instale o Git for Windows: https://git-scm.com/download/win
    echo.
    echo 🔄 Tentando executar com PowerShell...
    goto :powershell
)

echo ✅ Git Bash encontrado

REM Tornar scripts executáveis
echo 🔧 Tornando scripts executáveis...
bash -c "chmod +x jenkins/scripts/*.sh"

echo.
echo 📋 Escolha uma opção:
echo 1. 🏗️  Executar Build
echo 2. 🧪  Executar Testes
echo 3. 🚀  Executar Deploy
echo 4. 🔄  Executar Tudo (Build + Test + Deploy)
echo 5. ❌  Sair
echo.

set /p choice="Digite sua escolha (1-5): "

if "%choice%"=="1" goto :build
if "%choice%"=="2" goto :test
if "%choice%"=="3" goto :deploy
if "%choice%"=="4" goto :all
if "%choice%"=="5" goto :exit
goto :invalid

:build
echo.
echo 🏗️ === EXECUTANDO BUILD ===
bash jenkins/scripts/build.sh
goto :end

:test
echo.
echo 🧪 === EXECUTANDO TESTES ===
bash jenkins/scripts/test.sh
goto :end

:deploy
echo.
echo 🚀 === EXECUTANDO DEPLOY ===
set /p env="Digite o ambiente (development/production): "
if "%env%"=="" set env=development
bash jenkins/scripts/deploy.sh
goto :end

:all
echo.
echo 🔄 === EXECUTANDO TUDO ===
echo 🏗️ Build...
bash jenkins/scripts/build.sh
if %errorlevel% neq 0 (
    echo ❌ Build falhou!
    goto :end
)

echo 🧪 Testes...
bash jenkins/scripts/test.sh
if %errorlevel% neq 0 (
    echo ❌ Testes falharam!
    goto :end
)

echo 🚀 Deploy...
bash jenkins/scripts/deploy.sh
goto :end

:powershell
echo.
echo ⚠️  Executando com PowerShell (funcionalidade limitada)
echo 📋 Escolha uma opção:
echo 1. 🏗️  Build (npm)
echo 2. 🧪  Testes (npm)
echo 3. ❌  Sair
echo.

set /p choice="Digite sua escolha (1-3): "

if "%choice%"=="1" (
    echo 🏗️ Executando build...
    cd client
    npm run build
    cd ..
    goto :end
)

if "%choice%"=="2" (
    echo 🧪 Executando testes...
    cd client
    npm test
    cd ..
    goto :end
)

if "%choice%"=="3" goto :exit
goto :invalid

:invalid
echo ❌ Opção inválida!
goto :end

:end
echo.
echo 🎉 === SCRIPT CONCLUÍDO ===
pause

:exit
echo 👋 Até logo!
