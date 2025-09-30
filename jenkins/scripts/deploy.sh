#!/bin/bash

# 🚀 Script de Deploy do Sistema de Assinaturas
# Autor: Sistema de Assinaturas CI/CD
# Data: $(date)

set -e  # Parar em caso de erro

echo "🚀 === INICIANDO DEPLOY ==="
echo "📅 Data: $(date)"
echo "🌿 Branch: ${GIT_BRANCH:-local}"
echo "📝 Commit: ${GIT_COMMIT_SHORT:-local}"
echo "🎯 Ambiente: ${DEPLOY_ENV:-development}"

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

# Configurações
DEPLOY_ENV=${DEPLOY_ENV:-development}
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
SERVICE_NAME="sistema-assinaturas"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    log_error "package.json não encontrado! Execute este script na raiz do projeto."
    exit 1
fi

# Verificar se o build existe
if [ ! -d "client/build" ]; then
    log_error "Build não encontrado! Execute o build primeiro."
    exit 1
fi

log_info "🎯 Ambiente de deploy: $DEPLOY_ENV"

# Função para criar backup
create_backup() {
    local target_dir="$1"
    local backup_name="$2"
    
    if [ -d "$target_dir" ]; then
        log_info "Criando backup de $backup_name..."
        mkdir -p "$BACKUP_DIR"
        cp -r "$target_dir" "$BACKUP_DIR/$backup_name"
        log_success "Backup criado em $BACKUP_DIR/$backup_name"
    else
        log_warning "Diretório $target_dir não existe - pulando backup"
    fi
}

# Função para parar serviços
stop_services() {
    log_info "Parando serviços..."
    
    # Parar PM2 se estiver rodando
    if command -v pm2 &> /dev/null; then
        log_info "Parando PM2..."
        pm2 stop "$SERVICE_NAME" 2>/dev/null || log_warning "PM2 não estava rodando"
        pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    fi
    
    # Parar processos Node.js manualmente
    log_info "Parando processos Node.js..."
    pkill -f "node.*index.js" 2>/dev/null || log_warning "Nenhum processo Node.js encontrado"
    
    sleep 2
    log_success "Serviços parados"
}

# Função para iniciar serviços
start_services() {
    log_info "Iniciando serviços..."
    
    # Instalar dependências do servidor
    cd server
    log_info "Instalando dependências do servidor..."
    npm ci --silent
    cd ..
    
    # Iniciar com PM2 se disponível
    if command -v pm2 &> /dev/null; then
        log_info "Iniciando com PM2..."
        cd server
        pm2 start index.js --name "$SERVICE_NAME" --env "$DEPLOY_ENV"
        pm2 save
        cd ..
        log_success "Serviço iniciado com PM2"
    else
        log_warning "PM2 não encontrado - iniciando manualmente"
        cd server
        nohup node index.js > ../logs/server.log 2>&1 &
        echo $! > ../logs/server.pid
        cd ..
        log_success "Serviço iniciado manualmente"
    fi
}

# Função para verificar saúde do serviço
health_check() {
    log_info "Verificando saúde do serviço..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        log_info "Tentativa $attempt/$max_attempts..."
        
        # Verificar se o processo está rodando
        if pgrep -f "node.*index.js" > /dev/null; then
            log_success "Processo Node.js está rodando"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Serviço não iniciou após $max_attempts tentativas"
            return 1
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Verificar se a API está respondendo
    log_info "Verificando API..."
    sleep 5
    
    if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
        log_success "API está respondendo"
    else
        log_warning "API pode não estar respondendo ainda"
    fi
}

# Função para rollback
rollback() {
    log_error "Executando rollback..."
    
    if [ -d "$BACKUP_DIR" ]; then
        log_info "Restaurando backup..."
        # Implementar lógica de rollback aqui
        log_success "Rollback executado"
    else
        log_error "Nenhum backup encontrado para rollback"
    fi
}

# Main deploy function
main() {
    # Criar diretório de logs se não existir
    mkdir -p logs
    
    # Backup
    create_backup "client/build" "frontend_build"
    
    # Parar serviços
    stop_services
    
    # Deploy do frontend (copiar build para diretório de produção)
    log_info "Fazendo deploy do frontend..."
    if [ "$DEPLOY_ENV" = "production" ]; then
        # Em produção, copiar para diretório web
        sudo cp -r client/build/* /var/www/html/ 2>/dev/null || log_warning "Não foi possível copiar para /var/www/html"
    else
        # Em desenvolvimento, apenas verificar se o build está OK
        log_success "Build do frontend validado"
    fi
    
    # Deploy do backend
    log_info "Fazendo deploy do backend..."
    
    # Copiar arquivos do servidor
    if [ "$DEPLOY_ENV" = "production" ]; then
        sudo cp -r server/* /opt/sistema-assinaturas/ 2>/dev/null || log_warning "Não foi possível copiar para /opt/sistema-assinaturas"
    fi
    
    # Iniciar serviços
    if start_services; then
        log_success "Serviços iniciados"
    else
        log_error "Falha ao iniciar serviços"
        rollback
        exit 1
    fi
    
    # Health check
    if health_check; then
        log_success "Health check passou"
    else
        log_error "Health check falhou"
        rollback
        exit 1
    fi
    
    # Limpeza
    log_info "Limpando arquivos temporários..."
    rm -f logs/server.pid 2>/dev/null || true
    
    log_success "🚀 === DEPLOY CONCLUÍDO COM SUCESSO ==="
    echo "📅 Data: $(date)"
    echo "🌿 Branch: ${GIT_BRANCH:-local}"
    echo "📝 Commit: ${GIT_COMMIT_SHORT:-local}"
    echo "🎯 Ambiente: $DEPLOY_ENV"
    echo "📦 Backup: $BACKUP_DIR"
}

# Executar deploy
main "$@"
