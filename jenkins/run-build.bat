@echo off
REM 🏗️ Script de Build para Windows
REM Sistema de Assinaturas CI/CD

echo 🏗️ === EXECUTANDO BUILD ===
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

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não está instalado!
    pause
    exit /b 1
)

echo ✅ Node.js encontrado: 
node --version

REM Verificar NPM
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ NPM não está instalado!
    pause
    exit /b 1
)

echo ✅ NPM encontrado:
npm --version

echo.
echo 📦 === INSTALANDO DEPENDÊNCIAS ===

REM Instalar dependências da raiz
echo 📁 Instalando dependências da raiz...
npm ci --silent
if %errorlevel% neq 0 (
    echo ❌ Falha ao instalar dependências da raiz!
    pause
    exit /b 1
)

REM Instalar dependências do frontend
echo 📱 Instalando dependências do frontend...
cd client
npm ci --silent
if %errorlevel% neq 0 (
    echo ❌ Falha ao instalar dependências do frontend!
    cd ..
    pause
    exit /b 1
)

REM Instalar dependências do backend
echo 🖥️ Instalando dependências do backend...
cd ..\server
npm ci --silent
if %errorlevel% neq 0 (
    echo ❌ Falha ao instalar dependências do backend!
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo 🏗️ === FAZENDO BUILD ===

REM Build do frontend
echo 🏗️ Fazendo build do frontend...
cd client
npm run build
if %errorlevel% neq 0 (
    echo ❌ Falha no build do frontend!
    cd ..
    pause
    exit /b 1
)

REM Verificar se o build foi criado
if not exist "build" (
    echo ❌ Diretório build não foi criado!
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo 📊 === VERIFICANDO BUILD ===

REM Verificar tamanho do build
echo 📏 Verificando tamanho do build...
for /f %%i in ('dir client\build /s /-c ^| find "File(s)"') do echo Tamanho: %%i

REM Verificar arquivos críticos
if exist "client\build\index.html" (
    echo ✅ index.html criado
) else (
    echo ❌ index.html não encontrado!
)

if exist "client\build\static" (
    echo ✅ Diretório static criado
) else (
    echo ❌ Diretório static não encontrado!
)

echo.
echo 🎉 === BUILD CONCLUÍDO COM SUCESSO ===
echo 📅 Data: %date% %time%
echo 📁 Build criado em: client\build\

pause
