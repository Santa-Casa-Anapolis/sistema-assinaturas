# Dockerfile para o cliente React
# Estágio 1: Build
FROM node:18-alpine as build

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Argumento de build para a URL da API
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Fazer build da aplicação React
RUN npm run build

# Estágio 2: Servir com Nginx
FROM nginx:alpine

# Copiar arquivos buildados para o Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Criar configuração nginx customizada para porta 5000
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 5000;' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '        index index.html index.htm;' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

# Expor porta 5000
EXPOSE 5000

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]
