ESSE@echo off
echo ========================================
echo Sistema de Assinaturas - Nota Fiscais
echo ========================================
echo.

echo Instalando dependencias...
call npm run install-all

echo.
echo Configurando ambiente...
if not exist "server\.env" (
    echo Criando arquivo .env para modo sem email...
    echo # Configurações do Servidor > server\.env
    echo PORT=5000 >> server\.env
    echo NODE_ENV=development >> server\.env
    echo. >> server\.env
    echo # JWT Secret >> server\.env
    echo JWT_SECRET=sua-chave-secreta-muito-segura-aqui >> server\.env
    echo. >> server\.env
    echo # Configurações de E-mail (DESABILITADO - Modo sem email) >> server\.env
    echo # EMAIL_USER=seu-email@gmail.com >> server\.env
    echo # EMAIL_PASS=sua-senha-de-aplicativo-gmail >> server\.env
    echo. >> server\.env
    echo # Configurações do Banco de Dados PostgreSQL >> server\.env
    echo DB_HOST=localhost >> server\.env
    echo DB_PORT=5432 >> server\.env
    echo DB_NAME=nota_fiscais >> server\.env
    echo DB_USER=postgres >> server\.env
    echo DB_PASSWORD=postgres >> server\.env
    echo. >> server\.env
    echo # Configurações de Segurança >> server\.env
    echo RATE_LIMIT_WINDOW_MS=900000 >> server\.env
    echo RATE_LIMIT_MAX_REQUESTS=100 >> server\.env
    echo. >> server\.env
    echo # Configurações de Upload >> server\.env
    echo MAX_FILE_SIZE=10485760 >> server\.env
    echo ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document >> server\.env
    echo Arquivo .env criado! Modo sem email ativado.
) else (
    echo Arquivo .env já existe.
)

echo.
echo Iniciando o sistema...
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo.
echo Usuários de teste:
echo - Admin: admin@empresa.com / admin123
echo - Supervisor: supervisor.setora@empresa.com / 123456
echo - Contabilidade: contabilidade@empresa.com / 123456
echo - Financeiro: financeiro@empresa.com / 123456
echo - Diretoria: diretoria@empresa.com / 123456
echo.

call npm run dev

pause
