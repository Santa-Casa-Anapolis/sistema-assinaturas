#!/bin/bash
# Script para configurar usuários e assinaturas de teste no deploy
# Execute este script após o deploy do banco de dados

set -e

echo "=========================================="
echo "🔧 CONFIGURAÇÃO DE USUÁRIOS DE TESTE"
echo "=========================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ]; then
    echo -e "${YELLOW}⚠️  Variáveis de ambiente do banco não definidas.${NC}"
    echo "   Usando valores padrão do .env"
fi

# Executar SQL
echo "📝 Executando SQL para criar usuários e assinaturas..."
if command -v psql &> /dev/null; then
    PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
        -h "${DB_HOST:-localhost}" \
        -p "${DB_PORT:-5433}" \
        -U "${DB_USER:-postgres}" \
        -d "${DB_NAME:-notasfiscais_db}" \
        -f "$(dirname "$0")/setup-test-users.sql"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ SQL executado com sucesso!${NC}"
    else
        echo "❌ Erro ao executar SQL"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  psql não encontrado. Execute o SQL manualmente:${NC}"
    echo "   scripts/setup-test-users.sql"
fi

echo ""

# Executar script Node.js para criar arquivos físicos
echo "🖼️  Criando arquivos de assinatura..."
if command -v node &> /dev/null; then
    node "$(dirname "$0")/setup-test-signatures.js"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Arquivos de assinatura criados!${NC}"
    else
        echo "❌ Erro ao criar arquivos de assinatura"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Node.js não encontrado. Execute manualmente:${NC}"
    echo "   node scripts/setup-test-signatures.js"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}🎉 CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo "=========================================="
echo ""
echo "Usuários de teste criados:"
echo "  - supervisor.teste / 123456"
echo "  - contabilidade.teste / 123456"
echo "  - financeiro.teste / 123456"
echo "  - diretoria.teste / 123456"
echo ""

