#!/bin/bash

echo "🚨 APLICANDO CORREÇÕES URGENTES NO SERVIDOR..."

# Conectar ao servidor e aplicar correções
ssh root@172.16.0.219 << 'EOF'
echo "🔧 Conectado ao servidor, aplicando correções..."

# 1. Atualizar NGINX com novos limites
echo "📝 Atualizando configuração NGINX..."
cat > /etc/nginx/sites-available/sistema-assinaturas << 'NGINX_EOF'
server {
    listen 80;
    server_name localhost;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Limite de upload para arquivos grandes
    client_max_body_size 100M;
    
    # Proxy para API do backend
    location /api/ {
        proxy_pass http://sistema-assinaturas_backend:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Headers para upload de arquivos
        client_max_body_size 100M;
        proxy_request_buffering off;
    }
    
    # Proxy para PDF.js Worker
    location /pdf.worker.min.js {
        proxy_pass http://sistema-assinaturas_backend:5000/pdf.worker.min.js;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache do worker
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy para arquivos estáticos do backend
    location /uploads/ {
        proxy_pass http://sistema-assinaturas_backend:5000/uploads/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Cache para arquivos estáticos
        expires 1h;
        add_header Cache-Control "public";
    }
    
    # Frontend React
    location / {
        proxy_pass http://sistema-assinaturas_frontend:80/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX_EOF

# 2. Recarregar NGINX
echo "🔄 Recarregando NGINX..."
nginx -t && systemctl reload nginx

# 3. Reiniciar serviços Docker
echo "🔄 Reiniciando serviços Docker..."
docker service update --force sistema-assinaturas_backend
docker service update --force sistema-assinaturas_frontend

echo "✅ Correções aplicadas!"
echo "📊 Verificando status..."
docker service ls | grep sistema-assinaturas

EOF

echo "🎉 Correções aplicadas no servidor!"
