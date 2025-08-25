@echo off
echo ========================================
echo Parando Containers Docker
echo ========================================
echo.

echo Parando todos os containers...
docker-compose down

echo.
echo Removendo volumes (opcional)...
echo Deseja remover os volumes também? Isso apagará todos os dados! (S/N)
set /p choice=
if /i "%choice%"=="S" (
    echo Removendo volumes...
    docker-compose down -v
    echo ✅ Volumes removidos!
) else (
    echo ✅ Volumes mantidos - dados preservados!
)

echo.
echo Status dos containers:
docker-compose ps

echo.
pause
