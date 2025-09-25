@echo off
REM 🧪 Script de Testes para Windows
REM Sistema de Assinaturas CI/CD

echo 🧪 === EXECUTANDO TESTES ===
echo 📅 Data: %date% %time%
echo.

REM Verificar se estamos na raiz do projeto
if not exist "package.json" (
    echo ❌ package.json não encontrado!
    echo 📁 Execute este script na raiz do projeto
    pause
    exit /b 1
)

echo ✅ Estamos na raiz do projeto

REM Contador de testes
set TOTAL_TESTS=0
set PASSED_TESTS=0
set FAILED_TESTS=0

REM Função para executar teste
call :run_test "Verificar Node.js" "node --version"
call :run_test "Verificar NPM" "npm --version"

echo.
echo 📦 === TESTANDO DEPENDÊNCIAS ===

REM Verificar dependências da raiz
call :run_test "Dependências da raiz" "npm list --depth=0"

REM Verificar dependências do frontend
call :run_test "Dependências do frontend" "cd client && npm list --depth=0"

REM Verificar dependências do backend
call :run_test "Dependências do backend" "cd server && npm list --depth=0"

echo.
echo 🔍 === TESTANDO LINT ===

REM Lint do frontend
call :run_test "Lint Frontend" "cd client && npm run lint"

REM Lint do backend (se existir)
if exist "server\package.json" (
    findstr /C:"\"lint\"" server\package.json >nul
    if %errorlevel% equ 0 (
        call :run_test "Lint Backend" "cd server && npm run lint"
    ) else (
        echo ⚠️ Script de lint do backend não encontrado - pulando
    )
)

echo.
echo 🏗️ === TESTANDO BUILD ===

REM Build do frontend
call :run_test "Build Frontend" "cd client && npm run build"

REM Verificar se build foi criado
if exist "client\build" (
    echo ✅ Diretório build criado
    set /a PASSED_TESTS+=1
) else (
    echo ❌ Diretório build não foi criado!
    set /a FAILED_TESTS+=1
)
set /a TOTAL_TESTS+=1

echo.
echo 📝 === TESTANDO SINTAXE ===

REM Verificar sintaxe do frontend (se TypeScript estiver configurado)
if exist "client\tsconfig.json" (
    call :run_test "Sintaxe Frontend" "cd client && npx tsc --noEmit --skipLibCheck"
)

REM Verificar sintaxe do backend
if exist "server\index.js" (
    call :run_test "Sintaxe Backend" "cd server && node -c index.js"
)

echo.
echo 🔒 === TESTANDO SEGURANÇA ===

REM Audit de dependências
call :run_test "Audit Dependências" "npm audit --audit-level=moderate"
call :run_test "Audit Frontend" "cd client && npm audit --audit-level=moderate"

if exist "server\package.json" (
    call :run_test "Audit Backend" "cd server && npm audit --audit-level=moderate"
)

echo.
echo 🔗 === TESTANDO INTEGRAÇÃO ===

REM Verificar se o servidor inicia
if exist "server\index.js" (
    echo 🔍 Testando inicialização do servidor...
    
    REM Tentar iniciar o servidor em background
    cd server
    start /b npm start > ..\logs\server-test.log 2>&1
    set SERVER_PID=%!
    cd ..
    
    REM Aguardar um pouco
    timeout /t 5 /nobreak >nul
    
    REM Verificar se o processo ainda está rodando
    tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe" >NUL
    if %errorlevel% equ 0 (
        echo ✅ Servidor iniciou corretamente
        set /a PASSED_TESTS+=1
        
        REM Parar o servidor
        taskkill /F /IM node.exe >nul 2>&1
    ) else (
        echo ⚠️ Servidor pode não ter iniciado corretamente
        set /a FAILED_TESTS+=1
    )
    set /a TOTAL_TESTS+=1
)

echo.
echo 📊 === RESUMO DOS TESTES ===
echo Total de testes: %TOTAL_TESTS%
echo Testes passaram: %PASSED_TESTS%
echo Testes falharam: %FAILED_TESTS%

if %FAILED_TESTS% equ 0 (
    echo.
    echo 🎉 === TODOS OS TESTES PASSARAM ===
    exit /b 0
) else (
    echo.
    echo ❌ === ALGUNS TESTES FALHARAM ===
    exit /b 1
)

REM Função para executar teste
:run_test
set TEST_NAME=%~1
set TEST_COMMAND=%~2

set /a TOTAL_TESTS+=1
echo 🔍 Executando: %TEST_NAME%

REM Executar comando e capturar resultado
%TEST_COMMAND% >nul 2>&1
if %errorlevel% equ 0 (
    set /a PASSED_TESTS+=1
    echo ✅ %TEST_NAME% - PASSOU
) else (
    set /a FAILED_TESTS+=1
    echo ❌ %TEST_NAME% - FALHOU
)
goto :eof
