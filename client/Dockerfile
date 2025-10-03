# Dockerfile para o cliente React (sem Nginx)
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (ci para builds reproduzíveis)
RUN npm ci

# Copiar código fonte
COPY . .

# Fazer build da aplicação React
RUN npm run build

# Instalar servidor estático 'serve'
RUN npm install -g serve && npm cache clean --force

# Definir variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=5000

# Expor porta do servidor
EXPOSE 5000

# Servir os arquivos buildados
CMD ["serve", "-s", "build", "-l", "5000"]
