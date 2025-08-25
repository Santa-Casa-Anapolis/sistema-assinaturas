#!/bin/bash

echo "========================================"
echo "Sistema de Assinaturas - Nota Fiscais"
echo "========================================"
echo

echo "Instalando dependencias..."
npm run install-all

echo
echo "Configurando ambiente..."
if [ ! -f "server/.env" ]; then
    echo "Criando arquivo .env para modo sem email..."
    cat > server/.env << EOF
# Configurações do Servidor
PORT=5000
NODE_ENV=development

# JWT Secret (Altere para uma chave segura em produção)
JWT_SECRET=sua-chave-secreta-muito-segura-aqui

# Configurações de E-mail (DESABILITADO - Modo sem email)
# EMAIL_USER=seu-email@gmail.com
# EMAIL_PASS=sua-senha-de-aplicativo-gmail

# Configurações do Banco de Dados PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nota_fiscais
DB_USER=postgres
DB_PASSWORD=postgres

# Configurações de Segurança
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Configurações de Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document
EOF
    echo "Arquivo .env criado! Modo sem email ativado."
else
    echo "Arquivo .env já existe."
fi

echo
echo "Iniciando o sistema..."
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo
echo "Usuários de teste:"
echo "- Fornecedor: fornecedor@empresa.com / 123456"
echo "- Supervisor: supervisor.setora@empresa.com / 123456"
echo "- Contabilidade: contabilidade@empresa.com / 123456"
echo "- Financeiro: financeiro@empresa.com / 123456"
echo "- Diretoria: diretoria@empresa.com / 123456"
echo

npm run dev
