@echo off
echo ========================================
echo Sistema de Assinaturas - Docker Setup
echo ========================================
echo.

echo Verificando se o Docker está instalado...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker não está instalado!
    echo.
    echo Por favor, instale o Docker Desktop:
    echo https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

echo ✅ Docker encontrado!
echo.

echo Iniciando PostgreSQL no Docker...
docker-compose up -d postgres

echo.
echo Aguardando PostgreSQL inicializar...
timeout /t 10 /nobreak >nul

echo.
echo Verificando status dos containers...
docker-compose ps

echo.
echo ========================================
echo 🐘 PostgreSQL está rodando!
echo.
echo 📊 Banco de dados: nota_fiscais
echo 👤 Usuário: postgres
echo 🔑 Senha: postgres
echo 🌐 Porta: 5432
echo.
echo 📊 pgAdmin (opcional):
echo 🌐 http://localhost:8080
echo 👤 Email: admin@empresa.com
echo 🔑 Senha: admin123
echo ========================================
echo.

echo Deseja iniciar o sistema agora? (S/N)
set /p choice=
if /i "%choice%"=="S" (
    echo.
    echo Iniciando o sistema...
    call npm run dev
) else (
    echo.
    echo Para iniciar o sistema manualmente, execute:
    echo npm run dev
)

echo.
pause
