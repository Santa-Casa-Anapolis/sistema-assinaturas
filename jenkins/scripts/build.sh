#!/bin/bash

# 🏗️ Script de Build do Sistema de Assinaturas
# Autor: Sistema de Assinaturas CI/CD
# Data: $(date)

set -e  # Parar em caso de erro

echo "🏗️ === INICIANDO BUILD ==="
echo "📅 Data: $(date)"
echo "🌿 Branch: ${GIT_BRANCH:-local}"
echo "📝 Commit: ${GIT_COMMIT_SHORT:-local}"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    log_error "package.json não encontrado! Execute este script na raiz do projeto."
    exit 1
fi

log_info "Verificando dependências..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado!"
    exit 1
fi

NODE_VERSION=$(node --version)
log_success "Node.js versão: $NODE_VERSION"

# Verificar NPM
if ! command -v npm &> /dev/null; then
    log_error "NPM não está instalado!"
    exit 1
fi

NPM_VERSION=$(npm --version)
log_success "NPM versão: $NPM_VERSION"

# Instalar dependências
log_info "Instalando dependências..."

# Raiz
log_info "📁 Instalando dependências da raiz..."
npm ci --silent
log_success "Dependências da raiz instaladas"

# Frontend
log_info "📱 Instalando dependências do frontend..."
cd client
npm ci --silent
log_success "Dependências do frontend instaladas"

# Backend
log_info "🖥️ Instalando dependências do backend..."
cd ../server
npm ci --silent
log_success "Dependências do backend instaladas"

# Voltar para raiz
cd ..

# Build do frontend
log_info "🏗️ Fazendo build do frontend..."
cd client
npm run build
log_success "Build do frontend concluído"

# Verificar se o build foi criado
if [ ! -d "build" ]; then
    log_error "Diretório build não foi criado!"
    exit 1
fi

# Voltar para raiz
cd ..

# Verificar tamanhos
log_info "📊 Analisando build..."

CLIENT_SIZE=$(du -sh client/build/ 2>/dev/null | cut -f1 || echo "N/A")
log_success "Tamanho do build: $CLIENT_SIZE"

# Verificar arquivos críticos
log_info "🔍 Verificando arquivos críticos..."

if [ -d "client/build/static/js" ]; then
    JS_FILES=$(ls client/build/static/js/*.js 2>/dev/null | wc -l)
    log_success "Arquivos JS: $JS_FILES"
else
    log_warning "Diretório de JS não encontrado"
fi

if [ -d "client/build/static/css" ]; then
    CSS_FILES=$(ls client/build/static/css/*.css 2>/dev/null | wc -l)
    log_success "Arquivos CSS: $CSS_FILES"
else
    log_warning "Diretório de CSS não encontrado"
fi

# Verificar index.html
if [ -f "client/build/index.html" ]; then
    log_success "index.html criado"
else
    log_error "index.html não encontrado!"
    exit 1
fi

log_success "🏗️ === BUILD CONCLUÍDO COM SUCESSO ==="
echo "📅 Data: $(date)"
echo "🌿 Branch: ${GIT_BRANCH:-local}"
echo "📝 Commit: ${GIT_COMMIT_SHORT:-local}"
echo "📦 Tamanho: $CLIENT_SIZE"
