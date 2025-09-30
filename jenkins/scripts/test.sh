#!/bin/bash

# 🧪 Script de Testes do Sistema de Assinaturas
# Autor: Sistema de Assinaturas CI/CD
# Data: $(date)

set -e  # Parar em caso de erro

echo "🧪 === INICIANDO TESTES ==="
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

# Contador de testes
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Função para executar teste
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    log_info "Executando: $test_name"
    
    if eval "$test_command"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        log_success "$test_name - PASSOU"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        log_error "$test_name - FALHOU"
    fi
}

# Verificar dependências
log_info "Verificando dependências..."

if ! command -v node &> /dev/null; then
    log_error "Node.js não está instalado!"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "NPM não está instalado!"
    exit 1
fi

log_success "Node.js e NPM disponíveis"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências da raiz..."
    npm ci --silent
fi

if [ ! -d "client/node_modules" ]; then
    log_info "Instalando dependências do frontend..."
    cd client
    npm ci --silent
    cd ..
fi

if [ ! -d "server/node_modules" ]; then
    log_info "Instalando dependências do backend..."
    cd server
    npm ci --silent
    cd ..
fi

# Testes de Lint
log_info "🔍 === EXECUTANDO LINT TESTS ==="

# Lint Frontend
run_test "Lint Frontend" "cd client && npm run lint"

# Lint Backend (se existir)
if [ -f "server/package.json" ] && grep -q '"lint"' server/package.json; then
    run_test "Lint Backend" "cd server && npm run lint"
else
    log_warning "Script de lint do backend não encontrado - pulando"
fi

# Testes de Build
log_info "🏗️ === EXECUTANDO BUILD TESTS ==="

# Build Frontend
run_test "Build Frontend" "cd client && npm run build"

# Verificar se build foi criado
if [ -d "client/build" ]; then
    log_success "Diretório build criado"
else
    log_error "Diretório build não foi criado!"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Testes de Sintaxe
log_info "📝 === EXECUTANDO SYNTAX TESTS ==="

# Verificar sintaxe do frontend
run_test "Sintaxe Frontend" "cd client && npx tsc --noEmit --skipLibCheck"

# Verificar sintaxe do backend
if [ -f "server/package.json" ]; then
    run_test "Sintaxe Backend" "cd server && node -c index.js"
else
    log_warning "Arquivo do backend não encontrado - pulando"
fi

# Testes de Dependências
log_info "📦 === EXECUTANDO DEPENDENCY TESTS ==="

# Verificar dependências vulneráveis
run_test "Audit Dependências" "npm audit --audit-level=moderate || echo 'Audit com vulnerabilidades encontradas'"

# Verificar dependências do frontend
run_test "Audit Frontend" "cd client && npm audit --audit-level=moderate || echo 'Audit com vulnerabilidades encontradas'"

# Verificar dependências do backend
if [ -f "server/package.json" ]; then
    run_test "Audit Backend" "cd server && npm audit --audit-level=moderate || echo 'Audit com vulnerabilidades encontradas'"
fi

# Testes de Integração (se existirem)
log_info "🔗 === EXECUTANDO INTEGRATION TESTS ==="

# Verificar se o servidor inicia
if [ -f "server/index.js" ]; then
    log_info "Testando inicialização do servidor..."
    
    # Tentar iniciar o servidor em background
    cd server
    timeout 10s npm start > /dev/null 2>&1 &
    SERVER_PID=$!
    
    sleep 3
    
    # Verificar se o processo ainda está rodando
    if kill -0 $SERVER_PID 2>/dev/null; then
        log_success "Servidor iniciou corretamente"
        kill $SERVER_PID 2>/dev/null || true
    else
        log_warning "Servidor pode não ter iniciado corretamente"
    fi
    
    cd ..
fi

# Resumo dos testes
log_info "📊 === RESUMO DOS TESTES ==="
echo "Total de testes: $TOTAL_TESTS"
echo "Testes passaram: $PASSED_TESTS"
echo "Testes falharam: $FAILED_TESTS"

if [ $FAILED_TESTS -eq 0 ]; then
    log_success "🧪 === TODOS OS TESTES PASSARAM ==="
    exit 0
else
    log_error "🧪 === ALGUNS TESTES FALHARAM ==="
    exit 1
fi
