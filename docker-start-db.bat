@echo off
echo ========================================
echo Iniciando PostgreSQL no Docker
echo ========================================
echo.

echo Parando containers existentes...
docker-compose down

echo.
echo Iniciando PostgreSQL...
docker-compose up -d postgres

echo.
echo Aguardando PostgreSQL inicializar...
timeout /t 10 /nobreak

echo.
echo Status dos containers:
docker-compose ps

echo.
echo ========================================
echo ✅ PostgreSQL iniciado com sucesso!
echo ========================================
echo.
echo Banco: notasfiscais_db
echo Usuário: postgres
echo Senha: 2025SantaCasaFD
echo Porta: 5432
echo.
echo Pressione qualquer tecla para fechar...
pause >nul
