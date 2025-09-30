@echo off
REM 🚀 Script para iniciar Jenkins no Windows
REM Sistema de Assinaturas CI/CD

echo 🚀 === INICIANDO JENKINS ===
echo 📅 Data: %date% %time%
echo.

REM Verificar se Docker está instalado
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está instalado ou não está rodando!
    echo 📥 Baixe e instale o Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo ✅ Docker encontrado
docker --version

REM Verificar se Docker está rodando
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está rodando!
    echo 🔧 Inicie o Docker Desktop e tente novamente
    pause
    exit /b 1
)

echo ✅ Docker está rodando

REM Parar containers existentes se houver
echo 🛑 Parando containers existentes...
docker-compose -f jenkins\docker-compose.yml down 2>nul

REM Iniciar Jenkins
echo 🚀 Iniciando Jenkins...
docker-compose -f jenkins\docker-compose.yml up -d

REM Aguardar Jenkins inicializar
echo ⏳ Aguardando Jenkins inicializar...
timeout /t 30 /nobreak >nul

REM Verificar se Jenkins está rodando
echo 🔍 Verificando status do Jenkins...
docker-compose -f jenkins\docker-compose.yml ps

REM Mostrar logs do Jenkins
echo 📋 Logs do Jenkins:
docker-compose -f jenkins\docker-compose.yml logs --tail=20 jenkins

echo.
echo 🎉 === JENKINS INICIADO COM SUCESSO ===
echo.
echo 🌐 Acesse o Jenkins em: http://localhost:8080
echo 🔑 Senha inicial será exibida nos logs acima
echo.
echo 📋 Comandos úteis:
echo    - Ver logs: docker-compose -f jenkins\docker-compose.yml logs -f jenkins
echo    - Parar Jenkins: docker-compose -f jenkins\docker-compose.yml down
echo    - Reiniciar Jenkins: docker-compose -f jenkins\docker-compose.yml restart
echo.

REM Abrir navegador
echo 🌐 Abrindo navegador...
start http://localhost:8080

pause
